/**
 * Record Generator
 *
 * Generates record (struct/boxed type) classes. Records emit a class
 * extending `NativeObject`, field accessors, methods, static factory
 * methods for every GIR `<constructor>`, and a module-load
 * `registerConstructionMeta` call describing the boxed layout. The
 * actual allocation happens inside `NativeObject`'s constructor.
 */

import type { FileBuilder } from "../../../builders/file-builder.js";
import { accessor, type ClassDeclarationBuilder, classDecl, constructorDecl, param } from "../../../builders/index.js";
import type { Writer } from "../../../builders/writer.js";
import type { FfiGeneratorOptions } from "../../../core/generator-types.js";
import type { FfiMapper } from "../../../core/type-system/ffi-mapper.js";
import {
    boxedSelfType,
    type FfiTypeDescriptor,
    fundamentalSelfType,
    getPrimitiveTypeSize,
    isPrimitiveFieldType,
    type MappedType,
    SELF_TYPE_GOBJECT,
    type SelfTypeDescriptor,
    UNSAFE_PRIMITIVE_NAMES,
} from "../../../core/type-system/ffi-types.js";
import { buildJsDocStructure } from "../../../core/utils/doc-formatter.js";
import { partitionSupportedFunctions, partitionSupportedMethods } from "../../../core/utils/filtering.js";
import { normalizeClassName, toCamelCase, toValidMemberName } from "../../../core/utils/naming.js";
import { canAllocateRecord } from "../../../core/utils/record-filter.js";
import { writeFfiTypeExpression } from "../../../core/writers/ffi-type-expression.js";
import {
    addMethodStructure,
    addTypeImports,
    createMethodBodyWriter,
    type MethodBodyWriter,
    type MethodStructure,
} from "../../../core/writers/index.js";
import type { GirField, GirFunction, GirMethod, GirRecord, GirRepository } from "../../../gir/index.js";
import { FieldBuilder } from "./field-builder.js";

type RecordTypeMeta = {
    glibTypeName?: string;
    glibGetType?: string;
    copyFunction?: string;
    freeFunction?: string;
};

/**
 * A leaf field within an array element struct, addressed by an absolute byte
 * offset. Bitfield members additionally carry their bit position and width.
 */
type ArrayElementLeaf = {
    name: string;
    offset: number;
    ffi: FfiTypeDescriptor;
    bitOffset?: number;
    bitWidth?: number;
};

/**
 * One field of an array element struct: either a primitive read directly at an
 * offset, or an inline nested struct grouped from its writable leaf fields.
 */
type ArrayElementEntry =
    | { kind: "primitive"; leaf: ArrayElementLeaf }
    | { kind: "nested"; name: string; subFields: ArrayElementLeaf[] };

/**
 * Generates record (struct/boxed type) classes.
 */
export class RecordGenerator {
    private readonly fieldBuilder: FieldBuilder;
    private readonly methodBody: MethodBodyWriter;
    private selfNames: ReadonlySet<string> = new Set();

    constructor(
        private readonly ffiMapper: FfiMapper,
        private readonly file: FileBuilder,
        private readonly options: FfiGeneratorOptions,
        repo?: GirRepository,
    ) {
        this.fieldBuilder = new FieldBuilder(
            ffiMapper,
            file,
            options.sharedLibrary,
            options.glibLibrary,
            repo,
            options.namespace,
        );
        this.methodBody = createMethodBodyWriter(ffiMapper, file, {
            sharedLibrary: options.sharedLibrary,
            glibLibrary: options.glibLibrary,
        });
    }

    /**
     * Generates a record class into the FileBuilder.
     */
    generate(record: GirRecord): void {
        const recordName = normalizeClassName(record.name);
        this.selfNames = new Set([recordName]);
        this.methodBody.setSelfNames(this.selfNames);

        const initFields = this.collectInitializableFields(record);

        const cls = this.generateClass(record, recordName);

        const methodStructures: MethodStructure[] = [];

        methodStructures.push(...this.buildStaticFactoryMethodStructures(record, recordName));
        methodStructures.push(
            ...this.buildStaticFunctionStructures(record.staticFunctions, recordName, record.name),
            ...this.buildMethodStructures(record.methods, {
                glibTypeName: record.glibTypeName,
                glibGetType: record.glibGetType,
                copyFunction: record.copyFunction,
                freeFunction: record.freeFunction,
            }),
        );

        for (const struct of methodStructures) {
            addMethodStructure(cls, struct);
        }

        this.generateFields(record.fields, record.methods, cls, record.isUnion);

        this.file.add(cls);

        if (record.glibGetType) {
            this.file.addImport("../../registry.js", ["registerNativeClass"]);
            const getTypeCall = this.buildGTypeCall(record.glibGetType, record.glibTypeName, recordName);
            this.file.addStatement(`\nregisterNativeClass(${recordName}, ${getTypeCall});`);
        }

        if (canAllocateRecord(record)) {
            this.emitConstructionMeta(record, initFields);
        }
    }

    private collectInitializableFields(record: GirRecord): GirField[] {
        return this.fieldBuilder.getInitializableFields(record.fields);
    }

    private generateClass(record: GirRecord, recordName: string): ClassDeclarationBuilder {
        this.file.addImport("../../object.js", ["constructNativeObject"]);
        this.file.addImport("../../handles.js", ["getHandle", "tryGetHandle"]);

        const doc = buildJsDocStructure(record.doc, this.options.namespace);
        const cls = classDecl(recordName, {
            exported: true,
            doc: doc?.[0]?.description,
        });

        cls.setConstructor(
            constructorDecl({
                params: [param("props", "object", { defaultValue: "{}" })],
                body: (writer) => {
                    writer.writeLine("constructNativeObject(this, props);");
                },
            }),
        );

        return cls;
    }

    private emitConstructionMeta(record: GirRecord, initFields: readonly GirField[]): void {
        const glibTypeName = record.glibTypeName;

        this.file.addImport("../../construction-meta.js", ["registerConstructionMeta"]);
        const structSize = this.fieldBuilder.calculateStructSize(record.fields, record.isUnion);
        const layout = this.fieldBuilder.calculateLayout(record.fields, false, record.isUnion);
        const layoutByName = new Map<string, { offset: number; bitOffset?: number; bitWidth?: number }>();
        for (const item of layout) {
            layoutByName.set(item.field.name, {
                offset: item.offset,
                bitOffset: item.bitOffset,
                bitWidth: item.bitWidth,
            });
        }

        const fieldEntries: Array<{
            jsName: string;
            offset: number;
            ffiType: FfiTypeDescriptor;
            bitOffset?: number;
            bitWidth?: number;
        }> = [];
        for (const field of initFields) {
            const typeMapping = this.ffiMapper.mapType(field.type, false, field.type.transferOwnership);
            if (typeMapping.unsafe) continue;
            const placement = layoutByName.get(field.name);
            if (placement === undefined) continue;
            let jsName = toValidMemberName(toCamelCase(field.name));
            if (jsName === "id") jsName = "id_";
            fieldEntries.push({
                jsName,
                offset: placement.offset,
                ffiType: typeMapping.ffi,
                bitOffset: placement.bitOffset,
                bitWidth: placement.bitWidth,
            });
        }

        this.file.addImport("../../native.js", ["t"]);

        const recordName = normalizeClassName(record.name);
        this.file.addRawBlock((writer: Writer) => {
            writer.writeLine("");
            writer.writeLine(`registerConstructionMeta(${recordName}, {`);
            writer.withIndent(() => {
                writer.writeLine(`kind: "boxed",`);
                writer.writeLine(`size: ${structSize},`);
                if (glibTypeName) {
                    writer.writeLine(`glibTypeName: "${glibTypeName}",`);
                    writer.writeLine(`lib: "${this.options.sharedLibrary}",`);
                }
                if (fieldEntries.length === 0) {
                    writer.writeLine("fields: {},");
                } else {
                    writer.writeLine("fields: {");
                    writer.withIndent(() => {
                        for (const entry of fieldEntries) {
                            writer.write(`${entry.jsName}: { offset: ${entry.offset}, ffiType: `);
                            writeFfiTypeExpression(writer, entry.ffiType);
                            if (entry.bitWidth !== undefined) {
                                writer.write(`, bitOffset: ${entry.bitOffset ?? 0}, bitWidth: ${entry.bitWidth}`);
                            }
                            writer.writeLine(" },");
                        }
                    });
                    writer.writeLine("},");
                }
            });
            writer.writeLine("});");
        });
    }

    private buildGTypeCall(cIdentifier: string, glibTypeName: string | undefined, recordName: string): string {
        if (cIdentifier === "intern" || cIdentifier === "") {
            if (!glibTypeName) {
                return `0 /* ${recordName} has no glib:type-name */`;
            }
            const binding = this.file.descriptors.register({
                sharedLibrary: "libgobject-2.0.so.0",
                cIdentifier: "g_type_from_name",
                args: [{ type: { type: "string", ownership: "borrowed" }, value: "" }],
                returnType: { type: "uint64" },
            });
            this.file.addImport("../../native.js", ["t"]);
            if (binding.varargs === false) {
                return `${binding.name}("${glibTypeName}")`;
            }
            this.file.addImport("../../native.js", ["call"]);
            return `call("libgobject-2.0.so.0", "g_type_from_name", [{ type: t.string("borrowed"), value: "${glibTypeName}" }], t.uint64)`;
        }
        const binding = this.file.descriptors.register({
            sharedLibrary: this.options.sharedLibrary,
            cIdentifier,
            args: [],
            returnType: { type: "uint64" },
            exported: true,
        });
        this.file.addImport("../../native.js", ["t"]);
        if (binding.varargs === false) {
            return `${binding.name}()`;
        }
        this.file.addImport("../../native.js", ["call"]);
        return `call("${this.options.sharedLibrary}", "${cIdentifier}", [], t.uint64)`;
    }

    private buildRecordReturnDescriptor(
        meta: RecordTypeMeta,
        ownership: "full" | "borrowed",
        fallbackInnerType?: string,
    ): FfiTypeDescriptor {
        const { glibTypeName, glibGetType, copyFunction, freeFunction } = meta;
        if (copyFunction && freeFunction) {
            return {
                type: "fundamental",
                ownership,
                library: this.options.sharedLibrary,
                refFn: copyFunction,
                unrefFn: freeFunction,
            };
        }
        return {
            type: "boxed",
            ownership,
            innerType: glibTypeName ?? fallbackInnerType,
            library: this.options.sharedLibrary,
            ...(glibGetType ? { getTypeFn: glibGetType } : {}),
        };
    }

    private buildStaticFactoryMethodStructures(record: GirRecord, recordName: string): MethodStructure[] {
        const { supported: supportedConstructors } = this.methodBody.selectConstructors(record.constructors);
        const meta: RecordTypeMeta = {
            glibTypeName: record.glibTypeName,
            glibGetType: record.glibGetType,
            copyFunction: record.copyFunction,
            freeFunction: record.freeFunction,
        };
        return supportedConstructors.map((ctor) => this.buildStaticFactoryMethodStructure(ctor, recordName, meta));
    }

    private buildStaticFactoryMethodStructure(
        ctor: import("../../../gir/index.js").GirConstructor,
        recordName: string,
        meta: RecordTypeMeta,
    ): MethodStructure {
        const methodName = toCamelCase(ctor.name);
        const shape = this.methodBody.buildShape(ctor.parameters, undefined, 0);
        const params = this.methodBody.buildSignatureParameters(shape, false);
        this.file.addImport("../../registry.js", ["getNativeObject"]);

        return {
            name: methodName,
            isStatic: true,
            parameters: params,
            returnType: recordName,
            docs: buildJsDocStructure(ctor.doc, this.options.namespace),
            statements: this.writeStaticFactoryMethodBody(ctor, recordName, meta),
        };
    }

    private writeStaticFactoryMethodBody(
        ctor: import("../../../gir/index.js").GirConstructor,
        recordName: string,
        meta: RecordTypeMeta,
    ): (writer: Writer) => void {
        const shape = this.methodBody.buildShape(ctor.parameters, undefined, 0);
        const args = this.methodBody.buildShapeCallArguments(shape, ctor.parameters);
        const ownership = ctor.returnType.transferOwnership === "full" ? "full" : "borrowed";
        const returnTypeDescriptor = this.buildRecordReturnDescriptor(meta, ownership, recordName);

        return this.methodBody.writeFactoryMethodBody({
            sharedLibrary: this.options.sharedLibrary,
            cIdentifier: ctor.cIdentifier,
            args,
            returnTypeDescriptor,
            wrapClassName: recordName,
            throws: ctor.throws,
            useClassInWrap: true,
            hiddenOuts: shape.hiddenOuts,
        });
    }

    private buildStaticFunctionStructures(
        functions: readonly GirFunction[],
        recordName: string,
        originalName: string,
    ): MethodStructure[] {
        const { supported: supportedFunctions, unsupported: unsupportedFunctions } = partitionSupportedFunctions(
            functions,
            (params) => this.methodBody.hasUnsupportedCallbacks(params),
            (returnType) => this.methodBody.isReturnTypeUnsafe(returnType),
        );
        return [
            ...supportedFunctions.map((func) => this.buildStaticFunctionStructure(func, recordName, originalName)),
            ...unsupportedFunctions.map((func) =>
                this.methodBody.buildStubStructure(
                    toValidMemberName(toCamelCase(func.name)),
                    `${this.options.namespace}.${originalName}.${func.name}`,
                    func.doc,
                    this.options.namespace,
                    true,
                ),
            ),
        ];
    }

    private buildStaticFunctionStructure(
        func: GirFunction,
        className: string,
        originalClassName: string,
    ): MethodStructure {
        return this.methodBody.buildStaticFunctionStructure(func, {
            className,
            originalClassName,
            sharedLibrary: this.options.sharedLibrary,
            namespace: this.options.namespace,
        });
    }

    private buildMethodStructures(methods: readonly GirMethod[], meta: RecordTypeMeta): MethodStructure[] {
        const { supported, unsupported } = partitionSupportedMethods(
            methods,
            (params) => this.methodBody.hasUnsupportedCallbacks(params),
            (returnType) => this.methodBody.isReturnTypeUnsafe(returnType),
        );
        return [
            ...supported.map((method) => this.buildMethodStructure(method, meta)),
            ...unsupported.map((method) =>
                this.methodBody.buildStubStructure(
                    toValidMemberName(toCamelCase(method.name)),
                    `${this.options.namespace}.${method.name}`,
                    method.doc,
                    this.options.namespace,
                    false,
                ),
            ),
        ];
    }

    private buildMethodStructure(m: GirMethod, meta: RecordTypeMeta): MethodStructure {
        const methodName = toCamelCase(m.name);
        const instanceOwnership = m.instanceParameter?.transferOwnership === "full" ? "full" : "borrowed";
        const className = meta.glibTypeName;
        let selfTypeDescriptor: SelfTypeDescriptor;
        if (className) {
            selfTypeDescriptor =
                meta.copyFunction && meta.freeFunction
                    ? fundamentalSelfType(
                          this.options.sharedLibrary,
                          meta.copyFunction,
                          meta.freeFunction,
                          instanceOwnership,
                          className,
                      )
                    : boxedSelfType(className, this.options.sharedLibrary, meta.glibGetType, instanceOwnership);
        } else {
            selfTypeDescriptor = SELF_TYPE_GOBJECT;
        }

        return this.methodBody.buildMethodStructure(m, {
            methodName,
            selfTypeDescriptor,
            sharedLibrary: this.options.sharedLibrary,
            namespace: this.options.namespace,
            className,
        });
    }

    private resolveFieldName(field: GirField): string {
        const fieldName = toValidMemberName(toCamelCase(field.name));
        return fieldName === "id" ? "id_" : fieldName;
    }

    private tryGenerateArrayField(
        field: GirField,
        fieldName: string,
        offset: number,
        fields: readonly GirField[],
        cls: ClassDeclarationBuilder,
        methodNames: Set<string>,
    ): boolean {
        if (!field.type.isArray || !field.type.elementType) return false;

        const elementTypeName = String(field.type.elementType.name);
        if (
            this.fieldBuilder.isNestedStructType(elementTypeName) ||
            this.fieldBuilder.hasReadableStructLayout(elementTypeName)
        ) {
            this.generateArrayFieldAccessors(field, fieldName, offset, fields, cls, methodNames);
            return true;
        }
        if (field.type.fixedSize !== undefined && isPrimitiveFieldType(elementTypeName)) {
            this.generateFixedPrimitiveArrayAccessor(field, fieldName, offset, cls, methodNames);
        }
        return true;
    }

    private generateFixedPrimitiveArrayAccessor(
        field: GirField,
        fieldName: string,
        offset: number,
        cls: ClassDeclarationBuilder,
        methodNames: Set<string>,
    ): void {
        const elementType = field.type.elementType;
        const fixedSize = field.type.fixedSize;
        if (!elementType || fixedSize === undefined) return;
        if (field.readable === false || methodNames.has(fieldName)) return;

        const elementMapping = this.ffiMapper.mapType(elementType, false, elementType.transferOwnership);
        const elementSize = getPrimitiveTypeSize(String(elementType.name));
        const isWritable = field.writable !== false && !methodNames.has(fieldName);
        this.file.addImport("../../native.js", isWritable ? ["read", "t", "write"] : ["read", "t"]);
        const doc = buildJsDocStructure(field.doc, this.options.namespace);

        const getBody = (writer: Writer): void => {
            writer.writeLine("const result = [];");
            writer.writeLine(`for (let index = 0; index < ${fixedSize}; index++) {`);
            writer.withIndent(() => {
                writer.write("result.push(read(getHandle(this), ");
                writeFfiTypeExpression(writer, elementMapping.ffi);
                writer.writeLine(`, ${offset} + index * ${elementSize}));`);
            });
            writer.writeLine("}");
            writer.writeLine("return result;");
        };

        const setBody = isWritable
            ? (writer: Writer): void => {
                  writer.writeLine(`for (let index = 0; index < ${fixedSize}; index++) {`);
                  writer.withIndent(() => {
                      writer.write("write(getHandle(this), ");
                      writeFfiTypeExpression(writer, elementMapping.ffi);
                      writer.writeLine(`, ${offset} + index * ${elementSize}, value[index]);`);
                  });
                  writer.writeLine("}");
              }
            : undefined;

        cls.addAccessor(
            accessor(fieldName, {
                type: `${elementMapping.ts}[]`,
                getBody,
                setBody,
                doc: doc?.[0]?.description,
            }),
        );
    }

    private buildPrimitiveFieldAccessor(
        field: GirField,
        fieldName: string,
        offset: number,
        isReadable: boolean,
        isWritable: boolean,
        cls: ClassDeclarationBuilder,
        bitOffset?: number,
        bitWidth?: number,
    ): void {
        const typeMapping = this.ffiMapper.mapType(field.type, false, field.type.transferOwnership);
        const isRawPointerPrimitive = UNSAFE_PRIMITIVE_NAMES.has(String(field.type.name));
        if (typeMapping.unsafe && !isRawPointerPrimitive) return;
        addTypeImports(this.file, typeMapping.imports, this.selfNames);

        if (bitWidth !== undefined) {
            if (!isReadable) return;
            this.file.addImport("../../native.js", isWritable ? ["read", "t", "write"] : ["read", "t"]);
            const bitDoc = buildJsDocStructure(field.doc, this.options.namespace);
            cls.addAccessor(
                accessor(fieldName, {
                    type: typeMapping.ts,
                    getBody: (writer: Writer): void => {
                        writer.write("return ");
                        this.appendLeafRead(
                            writer,
                            "getHandle(this)",
                            typeMapping.ffi,
                            String(offset),
                            bitOffset,
                            bitWidth,
                        );
                        writer.writeLine(";");
                    },
                    setBody: isWritable
                        ? (writer: Writer): void => {
                              this.writeLeafWrite(
                                  writer,
                                  "getHandle(this)",
                                  typeMapping.ffi,
                                  String(offset),
                                  "value",
                                  bitOffset,
                                  bitWidth,
                              );
                          }
                        : undefined,
                    doc: bitDoc?.[0]?.description,
                }),
            );
            return;
        }

        const needsObjectWrap =
            typeMapping.ffi.type === "boxed" ||
            typeMapping.ffi.type === "gobject" ||
            typeMapping.ffi.type === "fundamental";
        const isInterfaceField = needsObjectWrap && typeMapping.kind === "interface";

        if (needsObjectWrap) {
            this.file.addImport(
                "../../registry.js",
                isInterfaceField ? ["getNativeObjectAsInterface"] : ["getNativeObject"],
            );
        }

        if (!isReadable) return;

        this.file.addImport("../../native.js", ["read", "t"]);
        const doc = buildJsDocStructure(field.doc, this.options.namespace);

        const getBody = this.buildFieldGetBody(typeMapping, offset, needsObjectWrap, isInterfaceField);
        const setBody = isWritable ? this.buildFieldSetBody(typeMapping, offset, needsObjectWrap) : undefined;

        cls.addAccessor(
            accessor(fieldName, {
                type: needsObjectWrap ? `${typeMapping.ts} | null` : typeMapping.ts,
                getBody,
                setBody,
                doc: doc?.[0]?.description,
            }),
        );
    }

    private buildFieldGetBody(
        typeMapping: MappedType,
        offset: number,
        needsObjectWrap: boolean,
        isInterfaceField: boolean,
    ): (writer: Writer) => void {
        if (needsObjectWrap) {
            const wrapFn = isInterfaceField ? "getNativeObjectAsInterface" : "getNativeObject";
            return (writer: Writer) => {
                writer.write("const ptr = read(getHandle(this),");
                writeFfiTypeExpression(writer, typeMapping.ffi);
                writer.writeLine(`, ${offset});`);
                writer.writeLine("if (ptr === null) return null;");
                writer.writeLine(`return ${wrapFn}(ptr, ${typeMapping.ts});`);
            };
        }
        return (writer: Writer) => {
            writer.write("return read(getHandle(this),");
            writeFfiTypeExpression(writer, typeMapping.ffi);
            writer.writeLine(`, ${offset});`);
        };
    }

    private buildFieldSetBody(
        typeMapping: MappedType,
        offset: number,
        needsObjectWrap: boolean,
    ): (writer: Writer) => void {
        this.file.addImport("../../native.js", ["write", "t"]);
        return (writer: Writer) => {
            writer.write("write(getHandle(this),");
            writeFfiTypeExpression(writer, typeMapping.ffi);
            if (needsObjectWrap) {
                writer.writeLine(`, ${offset}, tryGetHandle(value));`);
            } else {
                writer.writeLine(`, ${offset}, value);`);
            }
        };
    }

    /**
     * Appends a memory-read expression for a single struct field. Bitfield
     * members are masked and shifted down to their logical value.
     */
    private appendLeafRead(
        writer: Writer,
        handleExpr: string,
        ffi: FfiTypeDescriptor,
        offsetExpr: string,
        bitOffset?: number,
        bitWidth?: number,
    ): void {
        if (bitWidth === undefined) {
            writer.write(`read(${handleExpr}, `);
            writeFfiTypeExpression(writer, ffi);
            writer.write(`, ${offsetExpr})`);
            return;
        }
        const mask = (1 << bitWidth) - 1;
        writer.write(`((read(${handleExpr}, `);
        writeFfiTypeExpression(writer, ffi);
        writer.write(`, ${offsetExpr}) >>> ${bitOffset ?? 0}) & ${mask})`);
    }

    /**
     * Writes a memory-write statement for a single struct field. Bitfield
     * members are merged into their storage unit via read-modify-write so
     * sibling bits sharing the unit are preserved.
     */
    private writeLeafWrite(
        writer: Writer,
        handleExpr: string,
        ffi: FfiTypeDescriptor,
        offsetExpr: string,
        valueExpr: string,
        bitOffset?: number,
        bitWidth?: number,
    ): void {
        writer.write(`write(${handleExpr}, `);
        writeFfiTypeExpression(writer, ffi);
        if (bitWidth === undefined) {
            writer.writeLine(`, ${offsetExpr}, ${valueExpr});`);
            return;
        }
        const mask = (1 << bitWidth) - 1;
        const shiftedMask = mask << (bitOffset ?? 0);
        writer.write(`, ${offsetExpr}, ((read(${handleExpr}, `);
        writeFfiTypeExpression(writer, ffi);
        writer.writeLine(
            `, ${offsetExpr}) & ~${shiftedMask}) | ((${valueExpr} & ${mask}) << ${bitOffset ?? 0})) >>> 0);`,
        );
    }

    private generateField(
        field: GirField,
        offset: number,
        fields: readonly GirField[],
        cls: ClassDeclarationBuilder,
        methodNames: Set<string>,
        bitOffset?: number,
        bitWidth?: number,
    ): void {
        const fieldName = this.resolveFieldName(field);

        if (this.tryGenerateArrayField(field, fieldName, offset, fields, cls, methodNames)) return;

        const typeName = String(field.type.name);
        if (!this.fieldBuilder.isGeneratableFieldType(typeName)) return;

        const isReadable = field.readable !== false && !methodNames.has(fieldName);
        const isWritable = field.writable !== false && !methodNames.has(fieldName);

        if (this.fieldBuilder.isInlineNestedStruct(field)) {
            this.generateNestedStructAccessors(field, fieldName, offset, cls, methodNames);
            return;
        }

        if (this.fieldBuilder.isNestedStructType(typeName)) return;

        this.buildPrimitiveFieldAccessor(field, fieldName, offset, isReadable, isWritable, cls, bitOffset, bitWidth);
    }

    private generateFields(
        fields: readonly GirField[],
        methods: readonly GirMethod[],
        cls: ClassDeclarationBuilder,
        isUnion: boolean,
    ): void {
        const layout = this.fieldBuilder.calculateLayout(fields, false, isUnion);
        const methodNames = new Set(methods.map((m) => toCamelCase(m.name)));

        for (const layoutItem of layout) {
            if (!layoutItem) continue;
            this.generateField(
                layoutItem.field,
                layoutItem.offset,
                fields,
                cls,
                methodNames,
                layoutItem.bitOffset,
                layoutItem.bitWidth,
            );
        }
    }

    private generateNestedStructAccessors(
        field: GirField,
        fieldName: string,
        baseOffset: number,
        cls: ClassDeclarationBuilder,
        methodNames: Set<string>,
    ): void {
        const typeName = String(field.type.name);
        const nestedLayout = this.fieldBuilder.getNestedStructLayout(typeName);
        if (!nestedLayout) return;

        const typeMapping = this.ffiMapper.mapType(field.type, false, field.type.transferOwnership);
        if (typeMapping.unsafe) return;
        addTypeImports(this.file, typeMapping.imports, this.selfNames);

        const tsTypeName = typeMapping.ts;
        const isReadable = field.readable !== false && !methodNames.has(fieldName);
        const isWritable = field.writable !== false && !methodNames.has(fieldName);

        const writableFields = nestedLayout
            .filter(
                (item) =>
                    this.fieldBuilder.isGeneratableFieldType(String(item.field.type.name)) &&
                    this.fieldBuilder.isWritableType(item.field.type),
            )
            .map((item) => ({
                fieldName: toValidMemberName(toCamelCase(item.field.name)),
                offset: baseOffset + item.offset,
                bitOffset: item.bitOffset,
                bitWidth: item.bitWidth,
                mapping: this.ffiMapper.mapType(item.field.type, false, item.field.type.transferOwnership),
            }))
            .filter((entry) => !entry.mapping.unsafe);

        if (!isReadable) return;

        const writable = isWritable && writableFields.length > 0;
        this.file.addImport("../../native.js", writable ? ["read", "t", "write"] : ["read", "t"]);
        const doc = buildJsDocStructure(field.doc, this.options.namespace);

        const getBody = (writer: Writer): void => {
            writer.writeLine(`return new ${tsTypeName}({`);
            writer.withIndent(() => {
                for (const nested of writableFields) {
                    writer.write(`${nested.fieldName}: `);
                    this.appendLeafRead(
                        writer,
                        "getHandle(this)",
                        nested.mapping.ffi,
                        String(nested.offset),
                        nested.bitOffset,
                        nested.bitWidth,
                    );
                    writer.writeLine(",");
                }
            });
            writer.writeLine("});");
        };

        const setBody = writable
            ? (writer: Writer): void => {
                  for (const nested of writableFields) {
                      this.writeLeafWrite(
                          writer,
                          "getHandle(this)",
                          nested.mapping.ffi,
                          String(nested.offset),
                          `value.${nested.fieldName}`,
                          nested.bitOffset,
                          nested.bitWidth,
                      );
                  }
              }
            : undefined;

        cls.addAccessor(
            accessor(fieldName, {
                type: tsTypeName,
                getBody,
                setBody,
                doc: doc?.[0]?.description,
            }),
        );
    }

    private generateArrayFieldAccessors(
        field: GirField,
        fieldName: string,
        ptrOffset: number,
        allFields: readonly GirField[],
        cls: ClassDeclarationBuilder,
        methodNames: Set<string>,
    ): void {
        const elementType = field.type.elementType;
        if (!elementType) return;

        const elementTypeName = String(elementType.name);
        const elementSize = this.fieldBuilder.getRecordSize(elementTypeName);
        if (elementSize === 0) return;

        const typeMapping = this.ffiMapper.mapType(elementType, false, elementType.transferOwnership);
        if (typeMapping.unsafe) return;
        addTypeImports(this.file, typeMapping.imports, this.selfNames);

        const tsTypeName = typeMapping.ts;
        const isReadable = field.readable !== false && !methodNames.has(fieldName);
        const isWritable = field.writable !== false && !methodNames.has(fieldName);
        if (!isReadable) return;

        const fixedSize = field.type.fixedSize;
        const lengthFieldIndex = field.type.sizeParamIndex;

        let lengthExpr: string;
        if (fixedSize !== undefined) {
            lengthExpr = String(fixedSize);
        } else if (lengthFieldIndex !== undefined) {
            const publicFields = allFields.filter((f) => !f.private);
            const lengthField = publicFields[lengthFieldIndex];
            if (!lengthField) return;
            lengthExpr = `this.${toValidMemberName(toCamelCase(lengthField.name))}`;
        } else {
            return;
        }

        const elementLayout = this.fieldBuilder.getNestedStructLayout(elementTypeName);
        if (!elementLayout) return;

        const plan = this.buildArrayElementPlan(elementLayout);
        if (plan.length === 0) return;

        const structTypeExpr = `t.struct("${elementTypeName}", "full", ${lengthExpr} * ${elementSize})`;
        const doc = buildJsDocStructure(field.doc, this.options.namespace);

        this.file.addImport("../../native.js", isWritable ? ["read", "t", "write"] : ["read", "t"]);

        const getBody = (writer: Writer): void => {
            writer.writeLine(`const array = read(getHandle(this),${structTypeExpr}, ${ptrOffset});`);
            writer.writeLine("const result = [];");
            writer.writeLine(`for (let index = 0; index < ${lengthExpr}; index++) {`);
            writer.withIndent(() => {
                writer.writeLine(`const base = index * ${elementSize};`);
                writer.writeLine("result.push({");
                writer.withIndent(() => {
                    for (const entry of plan) {
                        if (entry.kind === "primitive") {
                            writer.write(`${entry.leaf.name}: `);
                            this.appendLeafRead(
                                writer,
                                "array",
                                entry.leaf.ffi,
                                `base + ${entry.leaf.offset}`,
                                entry.leaf.bitOffset,
                                entry.leaf.bitWidth,
                            );
                            writer.writeLine(",");
                        } else {
                            writer.writeLine(`${entry.name}: {`);
                            writer.withIndent(() => {
                                for (const sub of entry.subFields) {
                                    writer.write(`${sub.name}: `);
                                    this.appendLeafRead(
                                        writer,
                                        "array",
                                        sub.ffi,
                                        `base + ${sub.offset}`,
                                        sub.bitOffset,
                                        sub.bitWidth,
                                    );
                                    writer.writeLine(",");
                                }
                            });
                            writer.writeLine("},");
                        }
                    }
                });
                writer.writeLine("});");
            });
            writer.writeLine("}");
            writer.writeLine("return result;");
        };

        const setBody = isWritable
            ? (writer: Writer): void => {
                  writer.writeLine(`const array = read(getHandle(this),${structTypeExpr}, ${ptrOffset});`);
                  writer.writeLine("for (let index = 0; index < value.length; index++) {");
                  writer.withIndent(() => {
                      writer.writeLine("const element = value[index];");
                      writer.writeLine(`const base = index * ${elementSize};`);
                      for (const entry of plan) {
                          if (entry.kind === "primitive") {
                              this.writeLeafWrite(
                                  writer,
                                  "array",
                                  entry.leaf.ffi,
                                  `base + ${entry.leaf.offset}`,
                                  `element.${entry.leaf.name}`,
                                  entry.leaf.bitOffset,
                                  entry.leaf.bitWidth,
                              );
                          } else {
                              for (const sub of entry.subFields) {
                                  this.writeLeafWrite(
                                      writer,
                                      "array",
                                      sub.ffi,
                                      `base + ${sub.offset}`,
                                      `element.${entry.name}.${sub.name}`,
                                      sub.bitOffset,
                                      sub.bitWidth,
                                  );
                              }
                          }
                      }
                  });
                  writer.writeLine("}");
                  writer.writeLine(`write(getHandle(this),${structTypeExpr}, ${ptrOffset}, array);`);
              }
            : undefined;

        cls.addAccessor(
            accessor(fieldName, {
                type: `${tsTypeName}[]`,
                getBody,
                setBody,
                doc: doc?.[0]?.description,
            }),
        );
    }

    /**
     * Flattens an array element struct layout into a plan describing how to
     * read and write each field: primitives directly, inline nested structs
     * grouped from their writable leaf fields.
     */
    private buildArrayElementPlan(
        elementLayout: NonNullable<ReturnType<FieldBuilder["getNestedStructLayout"]>>,
    ): ArrayElementEntry[] {
        const plan: ArrayElementEntry[] = [];
        for (const item of elementLayout) {
            const name = toValidMemberName(toCamelCase(item.field.name));
            const typeName = String(item.field.type.name);

            if (
                this.fieldBuilder.isWritableType(item.field.type) &&
                this.fieldBuilder.isGeneratableFieldType(typeName)
            ) {
                const mapping = this.ffiMapper.mapType(item.field.type, false, item.field.type.transferOwnership);
                if (mapping.unsafe) continue;
                plan.push({
                    kind: "primitive",
                    leaf: {
                        name,
                        offset: item.offset,
                        ffi: mapping.ffi,
                        bitOffset: item.bitOffset,
                        bitWidth: item.bitWidth,
                    },
                });
                continue;
            }

            if (!this.fieldBuilder.isInlineNestedStruct(item.field)) continue;
            const subLayout = this.fieldBuilder.getNestedStructLayout(typeName);
            if (!subLayout) continue;

            const subFields: ArrayElementLeaf[] = [];
            for (const subItem of subLayout) {
                if (!this.fieldBuilder.isWritableType(subItem.field.type)) continue;
                const subMapping = this.ffiMapper.mapType(
                    subItem.field.type,
                    false,
                    subItem.field.type.transferOwnership,
                );
                if (subMapping.unsafe) continue;
                subFields.push({
                    name: toValidMemberName(toCamelCase(subItem.field.name)),
                    offset: item.offset + subItem.offset,
                    ffi: subMapping.ffi,
                    bitOffset: subItem.bitOffset,
                    bitWidth: subItem.bitWidth,
                });
            }
            if (subFields.length > 0) plan.push({ kind: "nested", name, subFields });
        }
        return plan;
    }
}
