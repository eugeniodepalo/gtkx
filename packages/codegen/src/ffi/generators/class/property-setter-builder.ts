/**
 * Property Setter Builder
 *
 * Generates synthetic setter methods for writable GObject properties
 * that don't have explicit setter methods defined in the GIR.
 *
 * These setters use g_object_set_property with properly typed GValues.
 */

import type { GirClass, GirProperty, GirRepository, QualifiedName } from "@gtkx/gir";
import type { MethodDeclarationStructure, WriterFunction } from "ts-morph";
import { StructureKind } from "ts-morph";
import type { GenerationContext } from "../../../core/generation-context.js";
import type { FfiGeneratorOptions } from "../../../core/generator-types.js";
import type { FfiMapper } from "../../../core/type-system/ffi-mapper.js";
import { collectDirectMembers, collectParentPropertyNames } from "../../../core/utils/class-traversal.js";
import { buildJsDocStructure } from "../../../core/utils/doc-formatter.js";
import { toCamelCase } from "../../../core/utils/naming.js";

export class PropertySetterBuilder {
    private existingMethodNames: Set<string> = new Set();

    constructor(
        private readonly cls: GirClass,
        private readonly ffiMapper: FfiMapper,
        private readonly ctx: GenerationContext,
        private readonly repository: GirRepository,
        private readonly options: FfiGeneratorOptions,
    ) {
        this.collectExistingMethodNames();
    }

    private collectExistingMethodNames(): void {
        for (const method of this.cls.methods) {
            this.existingMethodNames.add(toCamelCase(method.name));
        }

        for (const ifaceQualifiedName of this.cls.implements) {
            const iface = this.repository.resolveInterface(ifaceQualifiedName as QualifiedName);
            if (!iface) continue;
            for (const method of iface.methods) {
                this.existingMethodNames.add(toCamelCase(method.name));
            }
        }
    }

    buildStructures(): MethodDeclarationStructure[] {
        const propertiesNeedingSyntheticSetters = this.collectPropertiesNeedingSyntheticSetters();
        return propertiesNeedingSyntheticSetters
            .map((prop) => this.buildSetterStructure(prop))
            .filter((s): s is MethodDeclarationStructure => s !== null);
    }

    private collectPropertiesNeedingSyntheticSetters(): GirProperty[] {
        const directProps = collectDirectMembers({
            cls: this.cls,
            repo: this.repository,
            getClassMembers: (c) => c.properties,
            getInterfaceMembers: (i) => i.properties,
            getParentNames: collectParentPropertyNames,
            transformName: toCamelCase,
            isHidden: () => false,
        });

        return directProps.filter((prop) => {
            if (!prop.writable || prop.constructOnly || prop.setter) {
                return false;
            }

            const camelName = toCamelCase(prop.name);
            const setterName = `set${camelName.charAt(0).toUpperCase()}${camelName.slice(1)}`;
            return !this.existingMethodNames.has(setterName);
        });
    }

    private buildSetterStructure(prop: GirProperty): MethodDeclarationStructure | null {
        const typeMapping = this.ffiMapper.mapType(prop.type, false, prop.type.transferOwnership);
        const gvalueSetterInfo = this.getGValueSetterInfo(prop);

        if (!gvalueSetterInfo) {
            return null;
        }

        const camelName = toCamelCase(prop.name);
        const methodName = `set${camelName.charAt(0).toUpperCase()}${camelName.slice(1)}`;
        const paramType = typeMapping.ts;

        this.ctx.addTypeImports(typeMapping.imports);

        return {
            kind: StructureKind.Method,
            name: methodName,
            parameters: [
                {
                    name: "value",
                    type: paramType,
                },
            ],
            returnType: "void",
            docs: buildJsDocStructure(
                prop.doc ? `Sets ${prop.doc}` : `Sets the ${prop.name} property.`,
                this.options.namespace,
            ),
            statements: this.writeSetterBody(prop.name, gvalueSetterInfo),
        };
    }

    private getGValueSetterInfo(prop: GirProperty): GValueSetterInfo | null {
        const typeName = String(prop.type.name);
        const typeMapping = this.ffiMapper.mapType(prop.type, false, prop.type.transferOwnership);

        const primitiveTypeMap: Record<string, GValueSetterInfo> = {
            utf8: { gtypeName: "gchararray", setMethod: "setString" },
            gchararray: { gtypeName: "gchararray", setMethod: "setString" },
            gboolean: { gtypeName: "gboolean", setMethod: "setBoolean" },
            gint: { gtypeName: "gint", setMethod: "setInt" },
            gint32: { gtypeName: "gint", setMethod: "setInt" },
            guint: { gtypeName: "guint", setMethod: "setUint" },
            guint32: { gtypeName: "guint", setMethod: "setUint" },
            gint64: { gtypeName: "gint64", setMethod: "setInt64" },
            guint64: { gtypeName: "guint64", setMethod: "setUint64" },
            gfloat: { gtypeName: "gfloat", setMethod: "setFloat" },
            gdouble: { gtypeName: "gdouble", setMethod: "setDouble" },
            glong: { gtypeName: "glong", setMethod: "setLong" },
            gulong: { gtypeName: "gulong", setMethod: "setUlong" },
        };

        if (primitiveTypeMap[typeName]) {
            return primitiveTypeMap[typeName];
        }

        if (typeMapping.kind === "enum") {
            return { gtypeName: "gint", setMethod: "setInt", isEnum: true };
        }

        if (typeMapping.kind === "flags") {
            return { gtypeName: "guint", setMethod: "setUint", isFlags: true };
        }

        if (typeMapping.kind === "class") {
            return { gtypeName: "GObject", setMethod: "setObject", isClass: true };
        }

        if (typeMapping.kind === "interface") {
            return { gtypeName: "GObject", setMethod: "setObject", isInterface: true };
        }

        return null;
    }

    private writeSetterBody(propertyName: string, setterInfo: GValueSetterInfo): WriterFunction {
        this.ctx.usesCall = true;
        this.ctx.usesSyntheticPropertySetter = true;

        return (writer) => {
            writer.writeLine(`const gvalue = new GObject.Value();`);
            writer.writeLine(`gvalue.init(GObject.typeFromName("${setterInfo.gtypeName}"));`);

            if (setterInfo.isInterface) {
                writer.writeLine(`gvalue.${setterInfo.setMethod}(value as unknown as GObject.GObject);`);
            } else if (setterInfo.isClass) {
                writer.writeLine(`gvalue.${setterInfo.setMethod}(value as GObject.GObject);`);
            } else if (setterInfo.isEnum || setterInfo.isFlags) {
                writer.writeLine(`gvalue.${setterInfo.setMethod}(value as number);`);
            } else {
                writer.writeLine(`gvalue.${setterInfo.setMethod}(value);`);
            }

            writer.writeLine("call(");
            writer.indent(() => {
                writer.writeLine(`"libgobject-2.0.so.0",`);
                writer.writeLine(`"g_object_set_property",`);
                writer.writeLine("[");
                writer.indent(() => {
                    writer.writeLine(`{ type: { type: "gobject", ownership: "borrowed" }, value: this.handle },`);
                    writer.writeLine(`{ type: { type: "string", ownership: "borrowed" }, value: "${propertyName}" },`);
                    writer.writeLine(
                        `{ type: { type: "boxed", ownership: "borrowed", innerType: "GValue", lib: "libgobject-2.0.so.0", getTypeFn: "g_value_get_type" }, value: gvalue.handle },`,
                    );
                });
                writer.writeLine("],");
                writer.writeLine(`{ type: "undefined" }`);
            });
            writer.writeLine(");");
        };
    }
}

interface GValueSetterInfo {
    gtypeName: string;
    setMethod: string;
    isEnum?: boolean;
    isFlags?: boolean;
    isClass?: boolean;
    isInterface?: boolean;
}
