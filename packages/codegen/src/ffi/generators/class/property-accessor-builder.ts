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

import { property } from "../../../builders/index.js";
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
    collectOwnAndInterfaceMethodNames,
    collectParentMethodNames,
    collectParentPropertyNames,
} from "../../../core/utils/class-traversal.js";
import { buildJsDocStructure } from "../../../core/utils/doc-formatter.js";
import { normalizeClassName, toCamelCase } from "../../../core/utils/naming.js";
import { CallExpressionBuilder } from "../../../core/writers/call-expression-builder.js";
import type { FfiDescriptorRegistry } from "../../../core/writers/descriptor-registry.js";
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
};

export class PropertyAccessorBuilder {
    private readonly existingMethodNames: Set<string>;
    private readonly parentMethodNames: ReadonlySet<string>;
    private readonly callExpression: CallExpressionBuilder;

    constructor(
        private readonly cls: GirClass,
        private readonly ffiMapper: FfiMapper,
        private readonly imports: ImportCollector,
        private readonly repository: GirRepository,
        private readonly options: FfiGeneratorOptions,
        private readonly selfNames: ReadonlySet<string> = new Set(),
    ) {
        this.parentMethodNames = collectParentMethodNames(cls, repository);
        this.existingMethodNames = collectOwnAndInterfaceMethodNames(cls, repository, toCamelCase);
        for (const name of this.parentMethodNames) {
            this.existingMethodNames.add(toCamelCase(name));
        }
        const descriptors = (imports as { descriptors?: FfiDescriptorRegistry }).descriptors;
        this.callExpression = new CallExpressionBuilder(descriptors, imports);
    }

    buildAccessors(): PropertyAccessorEmission[] {
        const directProps = collectDirectMembers({
            cls: this.cls,
            repo: this.repository,
            getClassMembers: (c) => c.properties,
            getInterfaceMembers: (i) => i.properties,
            getParentNames: collectParentPropertyNames,
            transformName: toCamelCase,
            isHidden: () => false,
        });

        return directProps
            .map((prop) => this.buildAccessor(prop))
            .filter((a): a is PropertyAccessorEmission => a !== null);
    }

    private buildAccessor(prop: GirProperty): PropertyAccessorEmission | null {
        const camelName = toCamelCase(prop.name);

        if (this.existingMethodNames.has(camelName)) return null;

        const typeMapping = this.ffiMapper.mapType(prop.type, false, prop.type.transferOwnership);
        if (typeMapping.unsafe) return null;

        const getBody = this.buildGetBody(prop, typeMapping);
        if (!getBody) return null;

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

        const className = normalizeClassName(this.cls.name);
        const resolvedSetType = setType && setType !== returnType ? setType : returnType;
        const installer = this.buildInstaller({
            className,
            propertyName: camelName,
            returnType,
            setType: resolvedSetType,
            getBody,
            setBody,
        });

        return { property: declaredProperty, installer };
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
        return (writer) => {
            writer.writeLine(`globalThis.Object.defineProperty(${className}.prototype, "${propertyName}", {`);
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
        const getterInfo = this.getGValueGetterInfo(prop, typeMapping);
        if (!getterInfo) return null;

        const isGObjectNamespace = this.options.namespace === "GObject";
        const gobjectPrefix = isGObjectNamespace ? "" : "GObject.";

        if (isGObjectNamespace) {
            this.imports.addImport("./value.js", ["Value"]);
            this.imports.addImport("./functions.js", ["typeFromName"]);
        } else {
            this.imports.addNamespaceImport("../gobject/gobject.js", "GObject");
        }

        let returnType = typeMapping.ts;
        if (
            (getterInfo.isInterface || getterInfo.isBoxed || getterInfo.isFundamental) &&
            !(typeMapping.nullable ?? false)
        ) {
            returnType = `${returnType} | null`;
        }

        const callWriter = this.buildGObjectPropertyCall("g_object_get_property", prop.name);

        return (writer) => {
            writer.writeLine(`const gvalue = new ${gobjectPrefix}Value();`);

            if (getterInfo.gtypeName) {
                writer.writeLine(`gvalue.init(${gobjectPrefix}typeFromName("${getterInfo.gtypeName}"));`);
            } else {
                writer.writeLine(`gvalue.init(${gobjectPrefix}typeFromName("GObject"));`);
            }

            callWriter(writer);
            writer.writeLine(";");

            if (getterInfo.isBoxed) {
                writer.writeLine(
                    `return gvalue.${getterInfo.getMethod}(${getterInfo.tsType}, ${gobjectPrefix}typeFromName("${getterInfo.gtypeName}"));`,
                );
            } else {
                writer.writeLine(`return gvalue.${getterInfo.getMethod}();`);
            }
        };
    }

    private buildSyntheticSetBody(prop: GirProperty, typeMapping: MappedType): ((writer: Writer) => void) | undefined {
        const setterInfo = this.getGValueSetterInfo(prop, typeMapping);
        if (!setterInfo) return undefined;

        if (this.options.namespace === "GObject") {
            this.imports.addImport("./value.js", ["Value"]);
            this.imports.addImport("./functions.js", ["typeFromName"]);
        } else {
            this.imports.addNamespaceImport("../gobject/gobject.js", "GObject");
        }

        const gobjectPrefix = this.options.namespace === "GObject" ? "" : "GObject.";

        const callWriter = this.buildGObjectPropertyCall("g_object_set_property", prop.name);

        return (writer) => {
            if (setterInfo.staticConstructor) {
                if (setterInfo.staticConstructor === "newFromBoxed" && setterInfo.gtypeName) {
                    writer.writeLine(
                        `const gvalue = ${gobjectPrefix}Value.${setterInfo.staticConstructor}(value, ${gobjectPrefix}typeFromName("${setterInfo.gtypeName}"));`,
                    );
                } else {
                    writer.writeLine(`const gvalue = ${gobjectPrefix}Value.${setterInfo.staticConstructor}(value);`);
                }
            } else {
                writer.writeLine(`const gvalue = new ${gobjectPrefix}Value();`);
                writer.writeLine(`gvalue.init(${gobjectPrefix}typeFromName("${setterInfo.gtypeName}"));`);
                writer.writeLine(`gvalue.${setterInfo.setMethod}(value);`);
            }

            callWriter(writer);
            writer.writeLine(";");
        };
    }

    private buildGObjectPropertyCall(
        cIdentifier: "g_object_get_property" | "g_object_set_property",
        propName: string,
    ): (writer: Writer) => void {
        return this.callExpression.toWriter({
            sharedLibrary: "libgobject-2.0.so.0",
            cIdentifier,
            args: [
                { type: { type: "gobject", ownership: "borrowed" }, value: "getHandle(this)" },
                { type: { type: "string", ownership: "borrowed" }, value: `"${propName}"` },
                {
                    type: {
                        type: "boxed",
                        ownership: "borrowed",
                        innerType: "GValue",
                        library: "libgobject-2.0.so.0",
                        getTypeFn: "g_value_get_type",
                    },
                    value: "getHandle(gvalue)",
                },
            ],
            returnType: { type: "void" },
        });
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
