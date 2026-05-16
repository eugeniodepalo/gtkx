/**
 * Constructor Builder
 *
 * Builds the construction-metadata block and static factory method
 * structures for a class. Generated classes no longer carry per-class
 * constructor bodies: a single generic constructor on `NativeObject`
 * dispatches based on metadata registered via `registerConstructionMeta`.
 */

import type { Writer } from "../../../builders/writer.js";
import type { FfiGeneratorOptions } from "../../../core/generator-types.js";
import type { FfiMapper } from "../../../core/type-system/ffi-mapper.js";
import type { FfiTypeDescriptor, MappedType } from "../../../core/type-system/ffi-types.js";
import { buildJsDocStructure } from "../../../core/utils/doc-formatter.js";
import { kebabToSnake, normalizeClassName, toCamelCase, toValidIdentifier } from "../../../core/utils/naming.js";
import { writeFfiTypeExpression } from "../../../core/writers/ffi-type-expression.js";
import {
    addTypeImports,
    createMethodBodyWriter,
    type ImportCollector,
    type MethodBodyWriter,
    type MethodStructure,
} from "../../../core/writers/index.js";
import type { GirClass, GirConstructor, GirProperty, GirRepository } from "../../../gir/index.js";

type SettablePropParam = {
    paramName: string;
    girName: string;
    tsType: string;
    ffiType: FfiTypeDescriptor;
    isNullable: boolean;
    constructOnly: boolean;
};

/**
 * Inputs needed by the class generator to emit the props type alias and the
 * `registerConstructionMeta` module-load statement.
 */
export type ConstructionMetaPlan = {
    /**
     * Name of the props interface, e.g. `"LabelProps"`. Always emitted, even
     * for classes with no own settable properties (the alias body in that
     * case is an empty object).
     */
    propsTypeName: string;
    /** Source text of the props type body, suitable as the alias RHS. */
    propsTypeBody: string;
    /**
     * Writer that emits the trailing module-load call to
     * `registerConstructionMeta`. `null` when the class has no glibGetType
     * (cannot be constructed via the generic constructor).
     */
    constructionMetaWriter: ((writer: Writer) => void) | null;
};

type DescriptorRegistry = {
    register(opts: {
        sharedLibrary: string;
        cIdentifier: string;
        args: readonly unknown[];
        returnType: { type: string };
        exported?: boolean;
    }): { name: string };
};

export class ConstructorBuilder {
    private readonly className: string;
    private readonly methodBody: MethodBodyWriter;
    private parentFactoryMethodNames: Set<string> = new Set();

    constructor(
        private readonly cls: GirClass,
        private readonly ffiMapper: FfiMapper,
        private readonly imports: ImportCollector,
        _repository: GirRepository,
        private readonly options: FfiGeneratorOptions,
        private readonly selfNames: ReadonlySet<string> = new Set(),
    ) {
        this.className = normalizeClassName(cls.name);
        this.methodBody = createMethodBodyWriter(ffiMapper, imports, {
            sharedLibrary: options.sharedLibrary,
            glibLibrary: options.glibLibrary,
            selfNames: this.selfNames,
        });
    }

    setParentFactoryMethodNames(names: Set<string>): void {
        this.parentFactoryMethodNames = names;
    }

    /**
     * Builds the construction-metadata plan and the set of static factory
     * methods derived from this class's GIR `<constructor>` entries.
     *
     * Every GIR constructor that produces a value of this class becomes a
     * static factory, mirroring node-gtk's lookup of named constructors.
     * The class itself has no per-class constructor body: `NativeObject`'s
     * generic constructor uses the registered metadata to allocate.
     */
    build(): { metaPlan: ConstructionMetaPlan; factoryMethods: MethodStructure[] } {
        const { supported, unsupported } = this.methodBody.selectConstructors(this.cls.constructors);

        const settableProps = this.collectSettableProps();
        const metaPlan = this.buildConstructionMetaPlan(settableProps);
        const factoryMethods: MethodStructure[] = [];

        for (const ctor of supported) {
            if (this.conflictsWithParentFactoryMethod(ctor)) continue;
            factoryMethods.push(this.buildStaticFactoryMethodStructure(ctor));
        }
        for (const ctor of unsupported) {
            if (this.conflictsWithParentFactoryMethod(ctor)) continue;
            factoryMethods.push(
                this.methodBody.buildStubStructure(
                    toCamelCase(ctor.shadows ?? ctor.name),
                    `${this.options.namespace}.${this.cls.name}.${ctor.name}`,
                    ctor.doc,
                    this.options.namespace,
                    true,
                ),
            );
        }

        return { metaPlan, factoryMethods };
    }

    private collectSettableProps(): SettablePropParam[] {
        const result: SettablePropParam[] = [];
        const seen = new Set<string>();

        for (const prop of this.cls.properties) {
            if (!isSettableProperty(prop)) continue;
            if (seen.has(prop.name)) continue;
            seen.add(prop.name);

            const mapped: MappedType = this.ffiMapper.mapType(prop.type, false, prop.type.transferOwnership);
            addTypeImports(this.imports, mapped.imports, this.selfNames);

            const paramName = toValidIdentifier(kebabToSnake(prop.name));
            const isNullable = mapped.nullable === true;

            result.push({
                paramName,
                girName: prop.name,
                tsType: isNullable ? `${mapped.ts} | null` : mapped.ts,
                ffiType: mapped.ffi,
                isNullable,
                constructOnly: prop.constructOnly === true,
            });
        }

        return result;
    }

    private buildConstructionMetaPlan(settableProps: SettablePropParam[]): ConstructionMetaPlan {
        const propsTypeName = `${this.className}Props`;
        const propsBody = settableProps.map((p) => `${p.paramName}?: ${p.tsType}`).join("; ");
        const propsTypeBody = propsBody.length > 0 ? `{ ${propsBody} }` : "{}";

        const glibGetType = this.cls.glibGetType;
        const glibTypeName = this.cls.glibTypeName;
        if (!glibGetType || !glibTypeName) {
            return { propsTypeName, propsTypeBody, constructionMetaWriter: null };
        }

        const constructionMetaWriter = this.buildConstructionMetaWriter(glibGetType, glibTypeName, settableProps);
        return { propsTypeName, propsTypeBody, constructionMetaWriter };
    }

    private buildConstructionMetaWriter(
        glibGetType: string,
        glibTypeName: string,
        settableProps: SettablePropParam[],
    ): (writer: Writer) => void {
        this.imports.addImport("../../construction-meta.js", ["registerConstructionMeta"]);
        const gtypeExpression = this.buildGTypeExpression(glibGetType, glibTypeName);

        return (writer) => {
            writer.writeLine("");
            writer.writeLine(`registerConstructionMeta(${this.className}, {`);
            writer.withIndent(() => {
                writer.writeLine(`kind: "gobject",`);
                writer.writeLine(`gtype: ${gtypeExpression},`);
                if (settableProps.length === 0) {
                    writer.writeLine("props: {},");
                } else {
                    writer.writeLine("props: {");
                    writer.withIndent(() => {
                        for (const prop of settableProps) {
                            writer.write(`${prop.paramName}: { girName: "${prop.girName}", ffiType: `);
                            writeFfiTypeExpression(writer, prop.ffiType);
                            if (prop.constructOnly) {
                                writer.write(", constructOnly: true");
                            }
                            writer.writeLine(" },");
                        }
                    });
                    writer.writeLine("},");
                }
            });
            writer.writeLine("});");
        };
    }

    /**
     * Returns a JavaScript expression evaluating to a GType getter function.
     *
     * Real GIR `_get_type()` functions become a bound `t.fn(...)` reference.
     * The `intern` sentinel (used by GIR for types whose GType is registered
     * statically) becomes a closure calling `g_type_from_name(glibTypeName)`,
     * avoiding the name collision that would otherwise occur from
     * `t.fn("...", "intern", ...)` bindings being hoisted as exports.
     */
    private buildGTypeExpression(cIdentifier: string, glibTypeName: string): string {
        if (cIdentifier === "intern" || cIdentifier === "") {
            this.imports.addImport("../../native.js", ["call", "t"]);
            return `() => call("libgobject-2.0.so.0", "g_type_from_name", [{ type: t.string("borrowed"), value: "${glibTypeName}" }], t.uint64)`;
        }
        const descriptors = (this.imports as unknown as { descriptors: DescriptorRegistry }).descriptors;
        const binding = descriptors.register({
            sharedLibrary: this.options.sharedLibrary,
            cIdentifier,
            args: [],
            returnType: { type: "uint64" },
            exported: true,
        });
        this.imports.addImport("../../native.js", ["t"]);
        return binding.name;
    }

    private conflictsWithParentFactoryMethod(ctor: GirConstructor): boolean {
        const methodName = toCamelCase(ctor.shadows ?? ctor.name);
        return this.parentFactoryMethodNames.has(methodName);
    }

    private buildStaticFactoryMethodStructure(ctor: GirConstructor): MethodStructure {
        const methodName = toCamelCase(ctor.shadows ?? ctor.name);
        const shape = this.methodBody.buildShape(ctor.parameters, undefined, 0);
        const params = this.methodBody.buildSignatureParameters(shape, false);
        this.imports.addImport("../../registry.js", ["getNativeObject"]);

        return {
            name: methodName,
            isStatic: true,
            parameters: params,
            returnType: this.className,
            docs: buildJsDocStructure(ctor.doc, this.options.namespace),
            statements: this.writeStaticFactoryMethodBody(ctor),
        };
    }

    private writeStaticFactoryMethodBody(ctor: GirConstructor): (writer: Writer) => void {
        const shape = this.methodBody.buildShape(ctor.parameters, undefined, 0);
        const args = this.methodBody.buildShapeCallArguments(shape, ctor.parameters);
        const ownership = ctor.returnType.transferOwnership === "full" ? "full" : "borrowed";

        return this.methodBody.writeFactoryMethodBody({
            sharedLibrary: this.options.sharedLibrary,
            cIdentifier: ctor.cIdentifier,
            args,
            returnTypeDescriptor: { type: "gobject", ownership },
            wrapClassName: this.className,
            throws: ctor.throws,
            useClassInWrap: false,
            hiddenOuts: shape.hiddenOuts,
        });
    }
}

function isSettableProperty(prop: GirProperty): boolean {
    return prop.writable || prop.constructOnly;
}
