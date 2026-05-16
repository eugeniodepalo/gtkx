/**
 * Property Accessor Builder
 *
 * Generates GObject property bindings shaped as `declare <name>: <type>`
 * field declarations on the class plus matching
 * `Object.defineProperty(<class>.prototype, ...)` installers emitted after
 * the class body. Subclasses can therefore extend with their own
 * `<name>: <type>` field declarations without colliding with an ancestor's
 * ES6 accessor pair, matching the field-shaped `.d.ts` contract published
 * by ts-for-gir's node-gtk templates.
 *
 * For properties with explicit GIR getter/setter methods, the installer
 * delegates to those methods. For properties without, the installer
 * contains inline GValue logic via g_object_get_property /
 * g_object_set_property. Construct-only properties get a getter-only
 * installer (no setter, declared as `readonly`).
 */

import { accessor, property } from "../../../builders/index.js";
import type { AccessorBuilder } from "../../../builders/members/accessor.js";
import type { PropertyBuilder } from "../../../builders/members/property.js";
import type { Writer } from "../../../builders/writer.js";
import type { FfiGeneratorOptions } from "../../../core/generator-types.js";
import type { FfiMapper } from "../../../core/type-system/ffi-mapper.js";
import {
    getSyntheticGetterPrimitiveInfo,
    getSyntheticSetterPrimitiveInfo,
    type MappedType,
} from "../../../core/type-system/ffi-types.js";
import {
    collectDirectMembers,
    collectParentMethodNames,
    collectParentPropertyNames,
} from "../../../core/utils/class-traversal.js";
import { buildJsDocStructure } from "../../../core/utils/doc-formatter.js";
import { normalizeClassName, toCamelCase } from "../../../core/utils/naming.js";
import { addTypeImports, type ImportCollector } from "../../../core/writers/index.js";
import type { GirClass, GirMethod, GirProperty, GirRepository } from "../../../gir/index.js";

/**
 * A single property binding split into the class-body field declaration and
 * the post-class `Object.defineProperty` installer that wires the runtime
 * getter (and optional setter) into the prototype.
 */
export type PropertyAccessorEmission = {
    /** `declare <name>: <type>` field added to the class body. */
    readonly property: PropertyBuilder;
    /**
     * Writer callback that emits the
     * `Object.defineProperty(<class>.prototype, ...)` block describing the
     * runtime get/set behaviour. Called after the class declaration is
     * flushed to the file.
     */
    readonly installer: (writer: Writer) => void;
    /**
     * ES6 get/set accessor carrying the same runtime behaviour as the
     * `installer`, suitable for adding directly to a class body so the
     * member is visible to a JavaScript type checker.
     */
    readonly accessor: AccessorBuilder;
};

/**
 * Source for an interface property-accessor pass: the resolved interface name
 * used as the `defineProperty` target and the flattened property list (the
 * interface's own properties plus those inherited from prerequisite classes
 * and interfaces).
 */
export type InterfacePropertySource = {
    /** Interface name targeted by the emitted `defineProperty` installer. */
    readonly ownerName: string;
    /** Properties to install, deduplicated and flattened across prerequisites. */
    readonly properties: readonly GirProperty[];
    /**
     * Getter/setter methods reachable on the interface, keyed by C identifier.
     * A property accessor delegates to one of these when its value type cannot
     * be marshaled through the generic `g_object_get_property` path.
     */
    readonly methodsByCIdentifier: ReadonlyMap<string, GirMethod>;
};

export class PropertyAccessorBuilder {
    private readonly parentMethodNames: ReadonlySet<string>;

    constructor(
        private readonly cls: GirClass | null,
        private readonly ffiMapper: FfiMapper,
        private readonly imports: ImportCollector,
        private readonly repository: GirRepository,
        private readonly options: FfiGeneratorOptions,
        private readonly selfNames: ReadonlySet<string> = new Set(),
        private readonly interfaceSource: InterfacePropertySource | null = null,
    ) {
        this.parentMethodNames = cls !== null ? collectParentMethodNames(cls, repository) : new Set();
    }

    buildAccessors(): PropertyAccessorEmission[] {
        const directProps =
            this.cls !== null
                ? collectDirectMembers({
                      cls: this.cls,
                      repo: this.repository,
                      getClassMembers: (c) => c.properties,
                      getInterfaceMembers: (i) => i.properties,
                      getParentNames: collectParentPropertyNames,
                      transformName: toCamelCase,
                      isHidden: () => false,
                  })
                : (this.interfaceSource?.properties ?? []);

        return directProps
            .map((prop) => this.buildAccessor(prop))
            .filter((a): a is PropertyAccessorEmission => a !== null);
    }

    private buildAccessor(prop: GirProperty): PropertyAccessorEmission | null {
        const camelName = toCamelCase(prop.name);

        const typeMapping = this.ffiMapper.mapType(prop.type, false, prop.type.transferOwnership);

        if (typeMapping.unsafe) {
            return this.buildGenericAccessor(prop, camelName);
        }

        const getBody = this.buildGetBody(prop, typeMapping);
        if (!getBody) return this.buildGenericAccessor(prop, camelName);

        const returnType = this.computeGetterReturnType(prop, typeMapping);

        addTypeImports(this.imports, typeMapping.imports, this.selfNames);

        let setBody: ((writer: Writer) => void) | undefined;
        let setType: string | undefined;
        if (prop.writable && !prop.constructOnly) {
            setBody = this.buildSetBody(prop, typeMapping);
            if (setBody) {
                setType = this.resolveSetterType(prop, typeMapping);
            }
        }

        const docs = buildJsDocStructure(prop.doc, this.options.namespace);

        const declaredProperty = property(camelName, {
            type: returnType,
            declare: true,
            readonly: setBody === undefined,
            doc: docs?.[0]?.description,
        });

        const ownerName = this.cls !== null ? this.cls.name : (this.interfaceSource?.ownerName ?? "");
        const className = normalizeClassName(ownerName);
        const resolvedSetType = setType && setType !== returnType ? setType : returnType;
        const installer = this.buildInstaller({
            className,
            propertyName: camelName,
            returnType,
            setType: resolvedSetType,
            getBody,
            setBody,
        });
        const accessorMember = accessor(camelName, {
            type: returnType,
            setType: resolvedSetType,
            getBody,
            setBody,
            doc: docs?.[0]?.description,
        });

        return { property: declaredProperty, installer, accessor: accessorMember };
    }

    /**
     * Builds a read-only accessor for a property whose value type the runtime
     * marshaling layer cannot statically map.
     *
     * The getter delegates to the generic `getProperty` GValue path, which
     * resolves any GObject property at run time. The declared field type is
     * `unknown`, which satisfies the concrete type the `.d.ts` contract
     * declares for the property.
     */
    private buildGenericAccessor(prop: GirProperty, camelName: string): PropertyAccessorEmission {
        const docs = buildJsDocStructure(prop.doc, this.options.namespace);
        const declaredProperty = property(camelName, {
            type: "unknown",
            declare: true,
            readonly: true,
            doc: docs?.[0]?.description,
        });
        const ownerName = this.cls !== null ? this.cls.name : (this.interfaceSource?.ownerName ?? "");
        const className = normalizeClassName(ownerName);
        const getBody = (writer: Writer): void => {
            writer.writeLine(`return this.getProperty(${JSON.stringify(prop.name)});`);
        };
        const installer = this.buildInstaller({
            className,
            propertyName: camelName,
            returnType: "unknown",
            setType: "unknown",
            getBody,
        });
        const accessorMember = accessor(camelName, {
            type: "unknown",
            getBody,
            doc: docs?.[0]?.description,
        });
        return { property: declaredProperty, installer, accessor: accessorMember };
    }

    private buildInstaller(opts: {
        className: string;
        propertyName: string;
        returnType: string;
        setType: string;
        getBody: (writer: Writer) => void;
        setBody?: (writer: Writer) => void;
    }): (writer: Writer) => void {
        const { className, propertyName, getBody, setBody } = opts;
        const objectRef = this.options.namespace === "GObject" ? "globalThis.Object" : "Object";
        return (writer) => {
            writer.writeLine(`${objectRef}.defineProperty(${className}.prototype, "${propertyName}", {`);
            writer.withIndent(() => {
                writer.writeLine("get() {");
                writer.withIndent(() => {
                    getBody(writer);
                });
                writer.writeLine("},");
                if (setBody) {
                    writer.writeLine("set(value) {");
                    writer.withIndent(() => {
                        setBody(writer);
                    });
                    writer.writeLine("},");
                }
                writer.writeLine("enumerable: true,");
                writer.writeLine("configurable: true,");
            });
            writer.writeLine("});");
        };
    }

    private buildGetBody(prop: GirProperty, typeMapping: MappedType): ((writer: Writer) => void) | null {
        if (!prop.readable) return null;

        const delegate = this.resolveDelegateGetter(prop, typeMapping);
        if (delegate) {
            const { methodName } = delegate;
            return (writer) => {
                writer.writeLine(`return this.${methodName}();`);
            };
        }

        return this.buildSyntheticGetBody(prop, typeMapping);
    }

    private buildSetBody(prop: GirProperty, typeMapping: MappedType): ((writer: Writer) => void) | undefined {
        const delegate = this.resolveDelegateSetter(prop);
        if (delegate) {
            const { methodName } = delegate;
            return (writer) => {
                writer.writeLine(`this.${methodName}(value);`);
            };
        }

        return this.buildSyntheticSetBody(prop, typeMapping);
    }

    private resolveOwnMethod(accessorId: string): GirMethod | null {
        if (this.cls === null) {
            return this.interfaceSource?.methodsByCIdentifier.get(accessorId) ?? null;
        }
        return this.cls.getMethodByCIdentifier(accessorId) ?? this.cls.getMethod(accessorId) ?? null;
    }

    private resolveNonConflictingMethodName(accessorId: string): { methodName: string; method: GirMethod } | null {
        const method = this.resolveOwnMethod(accessorId);
        if (!method) return null;
        if (this.parentMethodNames.has(method.name)) return null;
        return { methodName: toCamelCase(method.name), method };
    }

    private resolveDelegateGetter(
        prop: GirProperty,
        typeMapping: MappedType,
    ): { methodName: string; method: GirMethod } | null {
        if (!prop.getter) return null;
        const resolved = this.resolveNonConflictingMethodName(prop.getter);
        if (!resolved) return null;
        if (resolved.methodName === toCamelCase(prop.name)) return null;
        const { method } = resolved;
        const returnMapping = this.ffiMapper.mapType(method.returnType, false, method.returnType.transferOwnership);
        if (returnMapping.unsafe) return null;
        if (returnMapping.ts === "void" || method.parameters.length > 0) return null;
        if (returnMapping.ts !== typeMapping.ts) return null;
        return resolved;
    }

    private resolveDelegateSetter(prop: GirProperty): { methodName: string; method: GirMethod } | null {
        if (!prop.setter) return null;
        const resolved = this.resolveNonConflictingMethodName(prop.setter);
        if (!resolved) return null;
        if (resolved.methodName === toCamelCase(prop.name)) return null;
        if (resolved.method.parameters.length !== 1) return null;
        const setterParam = resolved.method.parameters[0];
        if (!setterParam) return null;
        if (this.ffiMapper.mapParameter(setterParam).unsafe) return null;
        return resolved;
    }

    private computeGetterReturnType(prop: GirProperty, typeMapping: MappedType): string {
        let returnType = typeMapping.ts;
        let alreadyNullable = false;

        const delegate = this.resolveDelegateGetter(prop, typeMapping);
        if (delegate) {
            if (delegate.method.returnType.nullable) {
                returnType = `${returnType} | null`;
                alreadyNullable = true;
            }
        } else {
            const getterInfo = this.getGValueGetterInfo(prop, typeMapping);
            if (
                getterInfo &&
                (getterInfo.isInterface || getterInfo.isBoxed || getterInfo.isFundamental) &&
                !(typeMapping.nullable ?? false)
            ) {
                returnType = `${returnType} | null`;
                alreadyNullable = true;
            }
        }

        if (!alreadyNullable && prop.defaultValue?.kind === "null") {
            returnType = `${returnType} | null`;
        }

        return returnType;
    }

    private resolveSetterType(prop: GirProperty, typeMapping: MappedType): string {
        let result: string;
        let alreadyNullable = false;
        const delegate = this.resolveDelegateSetter(prop);
        if (delegate) {
            const paramType = delegate.method.parameters[0];
            if (paramType) {
                const paramMapping = this.ffiMapper.mapType(paramType.type, false, paramType.type.transferOwnership);
                addTypeImports(this.imports, paramMapping.imports, this.selfNames);
                result = paramMapping.ts;
                if (paramType.nullable) {
                    result = `${result} | null`;
                    alreadyNullable = true;
                }
            } else {
                result = typeMapping.ts;
            }
        } else {
            result = typeMapping.ts;
        }

        if (!alreadyNullable && prop.defaultValue?.kind === "null") {
            result = `${result} | null`;
        }
        return result;
    }

    private buildSyntheticGetBody(prop: GirProperty, typeMapping: MappedType): ((writer: Writer) => void) | null {
        if (!this.getGValueGetterInfo(prop, typeMapping)) return null;
        return (writer) => {
            writer.writeLine(`return this.getProperty("${prop.name}");`);
        };
    }

    private buildSyntheticSetBody(prop: GirProperty, typeMapping: MappedType): ((writer: Writer) => void) | undefined {
        if (!this.getGValueSetterInfo(prop, typeMapping)) return undefined;
        return (writer) => {
            writer.writeLine(`this.setProperty("${prop.name}", value);`);
        };
    }

    private getGValueGetterInfo(prop: GirProperty, typeMapping: MappedType): GValueGetterInfo | null {
        const typeName = String(prop.type.name);
        const primitiveInfo = getSyntheticGetterPrimitiveInfo(typeName);
        if (primitiveInfo) return primitiveInfo;

        if (typeMapping.kind === "enum") {
            return { gtypeName: "gint", getMethod: "getInt", isEnum: true };
        }
        if (typeMapping.kind === "flags") {
            return { gtypeName: "guint", getMethod: "getUint", isFlags: true };
        }
        if (typeMapping.kind === "class") {
            const fundamentalInfo = this.getFundamentalClassGetterInfo(typeName, typeMapping);
            if (fundamentalInfo) return fundamentalInfo;
            return { getMethod: "getObject", isClass: true };
        }
        if (typeMapping.kind === "interface") {
            return { getMethod: "getObject", isInterface: true };
        }
        if (typeMapping.kind === "record") {
            return this.getRecordGetterInfo(typeName, typeMapping);
        }
        return null;
    }

    private getFundamentalClassGetterInfo(typeName: string, typeMapping: MappedType): GValueGetterInfo | null {
        const qualifiedName = typeName.includes(".") ? typeName : `${this.options.namespace}.${typeName}`;
        const cls = this.repository.resolveClass(qualifiedName);
        if (!cls?.fundamental) return null;

        if (cls.refFunc === "g_variant_ref_sink") {
            return { gtypeName: "GVariant", getMethod: "getVariant", isFundamental: true };
        }
        if (cls.refFunc === "g_param_spec_ref_sink") {
            return { gtypeName: "GParam", getMethod: "getParam", isFundamental: true };
        }
        if (cls.glibTypeName) {
            return { gtypeName: cls.glibTypeName, getMethod: "getBoxed", isBoxed: true, tsType: typeMapping.ts };
        }
        return null;
    }

    private getRecordGetterInfo(typeName: string, typeMapping: MappedType): GValueGetterInfo | null {
        if (typeMapping.ffi.type === "boxed" && typeof typeMapping.ffi.innerType === "string") {
            return {
                gtypeName: typeMapping.ffi.innerType,
                getMethod: "getBoxed",
                isBoxed: true,
                tsType: typeMapping.ts,
            };
        }
        if (typeMapping.ffi.type === "fundamental") {
            const qualifiedName = typeName.includes(".") ? typeName : `${this.options.namespace}.${typeName}`;
            const record = this.repository.resolveRecord(qualifiedName);
            if (record?.glibTypeName) {
                return {
                    gtypeName: record.glibTypeName,
                    getMethod: "getBoxed",
                    isBoxed: true,
                    tsType: typeMapping.ts,
                };
            }
        }
        return null;
    }

    private getGValueSetterInfo(prop: GirProperty, typeMapping: MappedType): GValueSetterInfo | null {
        const typeName = String(prop.type.name);
        const primitiveInfo = getSyntheticSetterPrimitiveInfo(typeName);
        if (primitiveInfo) return primitiveInfo;

        if (typeMapping.kind === "enum") {
            return { gtypeName: "gint", setMethod: "setInt", isEnum: true };
        }
        if (typeMapping.kind === "flags") {
            return { gtypeName: "guint", setMethod: "setUint", isFlags: true };
        }
        if (typeMapping.kind === "class") {
            const fundamentalInfo = this.getFundamentalClassSetterInfo(typeName);
            if (fundamentalInfo) return fundamentalInfo;
            return { staticConstructor: "newFromObject", isClass: true };
        }
        if (typeMapping.kind === "interface") {
            return { staticConstructor: "newFromObject", isInterface: true };
        }
        if (typeMapping.kind === "record") {
            return this.getRecordSetterInfo(typeName, typeMapping);
        }
        return null;
    }

    private getFundamentalClassSetterInfo(typeName: string): GValueSetterInfo | null {
        const qualifiedName = typeName.includes(".") ? typeName : `${this.options.namespace}.${typeName}`;
        const cls = this.repository.resolveClass(qualifiedName);
        if (!cls?.fundamental) return null;

        if (cls.refFunc === "g_variant_ref_sink") {
            return { staticConstructor: "newFromVariant" };
        }
        if (cls.refFunc === "g_param_spec_ref_sink") {
            return { gtypeName: "GParam", setMethod: "setParam", isFundamental: true };
        }
        if (cls.glibTypeName) {
            return { staticConstructor: "newFromBoxed", gtypeName: cls.glibTypeName };
        }
        return null;
    }

    private getRecordSetterInfo(typeName: string, typeMapping: MappedType): GValueSetterInfo | null {
        if (typeMapping.ffi.type === "boxed" && typeof typeMapping.ffi.innerType === "string") {
            return { staticConstructor: "newFromBoxed", gtypeName: typeMapping.ffi.innerType };
        }
        if (typeMapping.ffi.type === "fundamental") {
            const qualifiedName = typeName.includes(".") ? typeName : `${this.options.namespace}.${typeName}`;
            const record = this.repository.resolveRecord(qualifiedName);
            if (record?.glibTypeName) {
                return { staticConstructor: "newFromBoxed", gtypeName: record.glibTypeName };
            }
        }
        return null;
    }
}

interface GValueGetterInfo {
    gtypeName?: string;
    getMethod: string;
    isString?: boolean;
    isEnum?: boolean;
    isFlags?: boolean;
    isClass?: boolean;
    isInterface?: boolean;
    isBoxed?: boolean;
    isFundamental?: boolean;
    tsType?: string;
}

interface GValueSetterInfo {
    staticConstructor?: string;
    /**
     * GLib type name. For `staticConstructor === "newFromBoxed"`, passed as the
     * second argument to `Value.newFromBoxed(value, typeFromName(name))`.
     * For `isFundamental`-style setters, used to initialize a fresh `GValue`.
     */
    gtypeName?: string;
    setMethod?: string;
    isEnum?: boolean;
    isFlags?: boolean;
    isClass?: boolean;
    isInterface?: boolean;
    isFundamental?: boolean;
}
