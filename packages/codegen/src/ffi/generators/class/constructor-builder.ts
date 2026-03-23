import type { DefaultValue, GirClass, GirConstructor, GirProperty, GirRepository } from "@gtkx/gir";
import type { ClassDeclaration, CodeBlockWriter, MethodDeclarationStructure, WriterFunction } from "ts-morph";
import { StructureKind } from "ts-morph";
import type { GenerationContext } from "../../../core/generation-context.js";
import type { FfiGeneratorOptions } from "../../../core/generator-types.js";
import type { FfiMapper } from "../../../core/type-system/ffi-mapper.js";
import type { FfiTypeDescriptor, MappedType } from "../../../core/type-system/ffi-types.js";
import { collectPropertiesWithDefaults, convertDefaultValue } from "../../../core/utils/default-value.js";
import { buildJsDocStructure } from "../../../core/utils/doc-formatter.js";
import { normalizeClassName, toCamelCase, toKebabCase, toValidIdentifier } from "../../../core/utils/naming.js";
import { createMethodBodyWriter, type MethodBodyWriter, type Writers } from "../../../core/writers/index.js";

type ConstructOnlyPropParam = {
    paramName: string;
    girName: string;
    tsType: string;
    ffiType: FfiTypeDescriptor;
    valueExpr: string;
    isNullable: boolean;
};

type Param = {
    name: string;
    type: string;
    hasQuestionToken?: boolean;
    initializer?: string;
};

export class ConstructorBuilder {
    private readonly className: string;
    private readonly methodBody: MethodBodyWriter;
    private parentFactoryMethodNames: Set<string> = new Set();
    private propertyDefaults: Map<string, GirProperty> = new Map();

    constructor(
        private readonly cls: GirClass,
        private readonly ffiMapper: FfiMapper,
        private readonly ctx: GenerationContext,
        private readonly repository: GirRepository,
        writers: Writers,
        private readonly options: FfiGeneratorOptions,
    ) {
        this.className = normalizeClassName(cls.name);
        this.methodBody = createMethodBodyWriter(ffiMapper, ctx, writers);
        this.propertyDefaults = collectPropertiesWithDefaults(cls, repository);
    }

    private getDefaultForParameter(paramName: string): DefaultValue | null {
        const kebabName = toKebabCase(paramName);

        const prop = this.propertyDefaults.get(paramName) ?? this.propertyDefaults.get(kebabName);
        return prop?.defaultValue ?? null;
    }

    private isDefaultCompatible(
        defaultValue: DefaultValue,
        param: { type: string; hasQuestionToken?: boolean },
    ): boolean {
        switch (defaultValue.kind) {
            case "null":
                return param.hasQuestionToken === true || param.type.includes("| null");
            case "boolean":
                return param.type === "boolean";
            case "number":
                return param.type === "number";
            case "string":
                return param.type === "string";
            case "enum":
                return !param.hasQuestionToken && !param.type.includes("| null");
            default:
                return false;
        }
    }

    private buildConstructorParameters(ctor: GirConstructor): Param[] {
        const baseParams = this.methodBody.buildParameterList(ctor.parameters);

        return baseParams.map((param) => {
            const defaultValue = this.getDefaultForParameter(param.name);
            if (!defaultValue) return param;

            if (!this.isDefaultCompatible(defaultValue, param)) return param;

            const conversion = convertDefaultValue(defaultValue, this.repository, this.options.namespace);
            if (!conversion) return param;

            for (const imp of conversion.imports) {
                this.ctx.usedExternalTypes.set(`${imp.namespace}.${imp.name}`, {
                    namespace: imp.namespace,
                    name: imp.name,
                    transformedName: imp.name,
                    kind: "enum",
                });
            }

            return {
                ...param,
                hasQuestionToken: false,
                initializer: conversion.initializer,
            };
        });
    }

    setParentFactoryMethodNames(names: Set<string>): void {
        this.parentFactoryMethodNames = names;
    }

    addConstructorAndBuildFactoryStructures(
        classDecl: ClassDeclaration,
        hasParent: boolean,
    ): MethodDeclarationStructure[] {
        const { supported: supportedConstructors, main: mainConstructor } = this.methodBody.selectConstructors(
            this.cls.constructors,
        );
        const methodStructures: MethodDeclarationStructure[] = [];

        if (mainConstructor && hasParent) {
            this.addConstructorWithOverloads(classDecl, mainConstructor);
            for (const ctor of supportedConstructors) {
                if (ctor !== mainConstructor && !this.conflictsWithParentFactoryMethod(ctor)) {
                    methodStructures.push(this.buildStaticFactoryMethodStructure(ctor));
                }
            }
        } else {
            for (const ctor of supportedConstructors) {
                if (!this.conflictsWithParentFactoryMethod(ctor)) {
                    methodStructures.push(this.buildStaticFactoryMethodStructure(ctor));
                }
            }

            if (hasParent && this.cls.glibGetType && !this.cls.abstract) {
                this.addGObjectNewConstructorWithOverloads(classDecl, this.cls.glibGetType);
            }
        }

        return methodStructures;
    }

    private buildOverloads(
        params: Param[],
        doc?: string,
    ): Array<{
        parameters: Array<{ name: string; type: string; hasQuestionToken?: boolean }>;
        docs?: ReturnType<typeof buildJsDocStructure>;
    }> {
        const handleOverload = {
            parameters: [{ name: "handle", type: "NativeHandle" }],
        };

        const typedOverloadParams = params.map((p) => ({
            name: p.name,
            type: p.type,
            hasQuestionToken: p.hasQuestionToken || p.initializer !== undefined,
        }));

        let seenRequired = false;
        for (let i = typedOverloadParams.length - 1; i >= 0; i--) {
            if (!typedOverloadParams[i]!.hasQuestionToken) {
                seenRequired = true;
            } else if (seenRequired) {
                typedOverloadParams[i]!.hasQuestionToken = false;
            }
        }

        const typedOverload: { parameters: typeof typedOverloadParams; docs?: ReturnType<typeof buildJsDocStructure> } =
            {
                parameters: typedOverloadParams,
            };

        if (doc) {
            typedOverload.docs = buildJsDocStructure(doc, this.options.namespace);
        }

        return [handleOverload, typedOverload];
    }

    private buildImplementationParams(params: Param[]): Param[] {
        if (params.length === 0) {
            return [{ name: "handle", type: "NativeHandle", hasQuestionToken: true }];
        }

        return params.map((p, i) => {
            if (i === 0) {
                const baseType = p.type.includes("=>") ? `(${p.type})` : p.type;
                return {
                    name: p.name,
                    type: `${baseType} | NativeHandle`,
                    hasQuestionToken: !p.initializer && p.hasQuestionToken,
                    initializer: p.initializer,
                };
            }
            return {
                ...p,
                hasQuestionToken: p.hasQuestionToken || !p.initializer,
            };
        });
    }

    private addConstructorWithOverloads(classDecl: ClassDeclaration, ctor: GirConstructor): void {
        this.ctx.usesIsNativeHandle = true;
        this.ctx.usesRegisterNativeObject = true;
        const params = this.buildConstructorParameters(ctor);
        const ownership = ctor.returnType.transferOwnership === "full" ? "full" : "borrowed";

        classDecl.addConstructor({
            overloads: this.buildOverloads(params, ctor.doc),
            parameters: this.buildImplementationParams(params),
            statements: this.writeConstructorBody(ctor, ownership, params),
        });
    }

    private writeConstructorBody(ctor: GirConstructor, ownership: string, params: Param[]): WriterFunction {
        const args = this.methodBody.buildCallArgumentsArray(ctor.parameters);
        const firstParamName = params.length > 0 ? params[0]!.name : "handle";

        const forceOptionalNames = new Set(
            params
                .slice(1)
                .filter((p) => !p.hasQuestionToken && !p.initializer)
                .map((p) => p.name),
        );
        for (const arg of args) {
            for (const name of forceOptionalNames) {
                if (arg.value.startsWith(`${name}.`)) {
                    arg.value = arg.value.replace(`${name}.`, `${name}!.`);
                }
            }
        }

        return (writer) => {
            writer.writeLine(`if (isNativeHandle(${firstParamName})) {`);
            writer.indent(() => {
                writer.writeLine(`super(${firstParamName});`);
            });
            writer.writeLine("} else {");
            writer.indent(() => {
                this.methodBody.writeCallbackWrapperDeclarations(writer, args);
                this.writeCallToVariable(writer, ctor.cIdentifier, args, ownership);
                writer.writeLine("super(__handle);");
                writer.writeLine("registerNativeObject(this);");
            });
            writer.writeLine("}");
        };
    }

    private writeCallToVariable(
        writer: CodeBlockWriter,
        cIdentifier: string,
        args: Array<{ type: FfiTypeDescriptor; value: string; optional?: boolean }>,
        ownership: string,
    ): void {
        writer.write("const __handle = call(");
        writer.newLine();
        writer.indent(() => {
            writer.writeLine(`"${this.options.sharedLibrary}",`);
            writer.writeLine(`"${cIdentifier}",`);
            writer.writeLine("[");
            writer.indent(() => {
                for (const arg of args) {
                    writer.write("{ type: ");
                    this.methodBody.getFfiTypeWriter().toWriter(arg.type)(writer);
                    writer.writeLine(`, value: ${arg.value}, optional: ${arg.optional ?? false} },`);
                }
            });
            writer.writeLine("],");
            writer.writeLine(`{ type: "gobject", ownership: "${ownership}" }`);
        });
        writer.writeLine(") as NativeHandle;");
    }

    private writeGObjectNewCallToVariable(
        writer: CodeBlockWriter,
        getTypeFunc: string,
        props: Array<{ girName: string; ffiType: FfiTypeDescriptor; valueExpr: string; guardExpr: string }>,
    ): void {
        writer.write("const gtype = call(");
        writer.newLine();
        writer.indent(() => {
            writer.writeLine(`"${this.options.sharedLibrary}",`);
            writer.writeLine(`"${getTypeFunc}",`);
            writer.writeLine("[],");
            writer.writeLine('{ type: "uint64" }');
        });
        writer.writeLine(");");

        if (props.length > 0) {
            writer.writeLine('const __args: Arg[] = [{ type: { type: "uint64" }, value: gtype, optional: false }];');
            for (const prop of props) {
                writer.writeLine(`if (${prop.guardExpr} !== undefined) {`);
                writer.indent(() => {
                    writer.writeLine("__args.push(");
                    writer.indent(() => {
                        writer.writeLine(
                            `{ type: { type: "string", ownership: "borrowed" }, value: "${prop.girName}", optional: false },`,
                        );
                        writer.write("{ type: ");
                        this.methodBody.getFfiTypeWriter().toWriter(prop.ffiType)(writer);
                        writer.writeLine(`, value: ${prop.valueExpr}, optional: false },`);
                    });
                    writer.writeLine(");");
                });
                writer.writeLine("}");
            }
            writer.writeLine('__args.push({ type: { type: "void" }, value: null, optional: false });');
            writer.write("const __handle = call(");
            writer.newLine();
            writer.indent(() => {
                writer.writeLine(`"${this.options.gobjectLibrary}",`);
                writer.writeLine('"g_object_new",');
                writer.writeLine("__args,");
                writer.writeLine('{ type: "gobject", ownership: "full" }');
            });
            writer.writeLine(") as NativeHandle;");
        } else {
            writer.write("const __handle = call(");
            writer.newLine();
            writer.indent(() => {
                writer.writeLine(`"${this.options.gobjectLibrary}",`);
                writer.writeLine('"g_object_new",');
                writer.writeLine("[");
                writer.indent(() => {
                    writer.writeLine('{ type: { type: "uint64" }, value: gtype, optional: false },');
                    writer.writeLine('{ type: { type: "void" }, value: null, optional: false },');
                });
                writer.writeLine("],");
                writer.writeLine('{ type: "gobject", ownership: "full" }');
            });
            writer.writeLine(") as NativeHandle;");
        }
    }

    private collectConstructOnlyProps(): ConstructOnlyPropParam[] {
        const result: ConstructOnlyPropParam[] = [];

        for (const prop of this.cls.getAllProperties()) {
            if (!prop.constructOnly) continue;

            const mapped: MappedType = this.ffiMapper.mapType(prop.type, false, prop.type.transferOwnership);
            this.ctx.addTypeImports(mapped.imports);

            const paramName = toValidIdentifier(toCamelCase(prop.name));
            const isNullable = mapped.nullable === true;
            const valueExpr = this.methodBody.buildValueExpression(paramName, mapped, isNullable);

            result.push({
                paramName,
                girName: prop.name,
                tsType: isNullable ? `${mapped.ts} | null` : mapped.ts,
                ffiType: mapped.ffi,
                valueExpr,
                isNullable,
            });
        }

        return result;
    }

    private addGObjectNewConstructorWithOverloads(classDecl: ClassDeclaration, glibGetType: string): void {
        this.ctx.usesIsNativeHandle = true;
        this.ctx.usesRegisterNativeObject = true;

        const constructOnlyProps = this.collectConstructOnlyProps();
        const params: Param[] = constructOnlyProps.map((prop) => ({
            name: prop.paramName,
            type: prop.tsType,
            hasQuestionToken: true,
        }));

        classDecl.addConstructor({
            overloads: this.buildOverloads(params),
            parameters: this.buildImplementationParams(params),
            statements: this.writeGObjectNewConstructorBody(glibGetType, constructOnlyProps, params),
        });
    }

    private writeGObjectNewConstructorBody(
        getTypeFunc: string,
        constructOnlyProps: ConstructOnlyPropParam[],
        params: Param[],
    ): WriterFunction {
        if (constructOnlyProps.length > 0) {
            this.ctx.usesArg = true;
        }

        const firstParamName = params.length > 0 ? params[0]!.name : "handle";

        return (writer) => {
            writer.writeLine(`if (isNativeHandle(${firstParamName})) {`);
            writer.indent(() => {
                writer.writeLine(`super(${firstParamName});`);
            });
            writer.writeLine("} else {");
            writer.indent(() => {
                this.writeGObjectNewCallToVariable(
                    writer,
                    getTypeFunc,
                    constructOnlyProps.map((p) => ({
                        girName: p.girName,
                        ffiType: p.ffiType,
                        valueExpr: p.valueExpr,
                        guardExpr: p.paramName,
                    })),
                );

                writer.writeLine("super(__handle);");
                writer.writeLine("registerNativeObject(this);");
            });
            writer.writeLine("}");
        };
    }

    private conflictsWithParentFactoryMethod(ctor: GirConstructor): boolean {
        const methodName = toCamelCase(ctor.name);
        return this.parentFactoryMethodNames.has(methodName);
    }

    private buildStaticFactoryMethodStructure(ctor: GirConstructor): MethodDeclarationStructure {
        const methodName = toCamelCase(ctor.name);
        const params = this.methodBody.buildParameterList(ctor.parameters);
        this.ctx.usesGetNativeObject = true;

        return {
            kind: StructureKind.Method,
            name: methodName,
            isStatic: true,
            parameters: params,
            returnType: this.className,
            docs: buildJsDocStructure(ctor.doc, this.options.namespace),
            statements: this.writeStaticFactoryMethodBody(ctor),
        };
    }

    private writeStaticFactoryMethodBody(ctor: GirConstructor): WriterFunction {
        const args = this.methodBody.buildCallArgumentsArray(ctor.parameters);
        const ownership = ctor.returnType.transferOwnership === "full" ? "full" : "borrowed";

        return this.methodBody.writeFactoryMethodBody({
            sharedLibrary: this.options.sharedLibrary,
            cIdentifier: ctor.cIdentifier,
            args,
            returnTypeDescriptor: { type: "gobject", ownership },
            wrapClassName: this.className,
            throws: ctor.throws,
            useClassInWrap: false,
        });
    }
}
