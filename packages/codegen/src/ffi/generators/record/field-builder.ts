/**
 * Field Builder
 *
 * Builds field getters/setters for record (struct/boxed) types.
 * Handles struct memory layout calculations, including nested structs.
 */

import type { Writer } from "../../../builders/writer.js";
import type { FfiMapper } from "../../../core/type-system/ffi-mapper.js";
import {
    getPrimitiveTypeSize,
    isMemoryWritableType,
    isPrimitiveFieldType,
} from "../../../core/type-system/ffi-types.js";
import { toCamelCase, toValidMemberName } from "../../../core/utils/naming.js";
import { isGeneratableFieldType as isGeneratableFieldTypeUtil } from "../../../core/utils/record-filter.js";
import { writeFfiTypeExpression } from "../../../core/writers/ffi-type-expression.js";
import { FfiTypeWriter } from "../../../core/writers/ffi-type-writer.js";
import { addTypeImports, type ImportCollector } from "../../../core/writers/index.js";
import type { GirField, GirRecord, GirRepository } from "../../../gir/index.js";

/**
 * Field layout information.
 *
 * For C bitfield members, `offset` is the byte offset of the shared storage
 * unit, `bitOffset` is the field's bit position within that unit, and
 * `bitWidth` is its width in bits. Non-bitfield members leave both undefined.
 */
type FieldLayout = {
    field: GirField;
    offset: number;
    size: number;
    alignment: number;
    bitOffset?: number;
    bitWidth?: number;
};

/**
 * Builds field getters/setters and handles struct memory layout.
 */
export class FieldBuilder {
    private readonly sizeCache = new Map<string, number>();
    private readonly ffiTypeWriter: FfiTypeWriter;

    constructor(
        private readonly ffiMapper: FfiMapper,
        private readonly imports: ImportCollector,
        sharedLibrary: string,
        glibLibrary?: string,
        private readonly repo?: GirRepository,
        private readonly currentNamespace?: string,
    ) {
        this.ffiTypeWriter = new FfiTypeWriter({
            currentSharedLibrary: sharedLibrary,
            glibLibrary,
        });
    }

    /**
     * Calculates the memory layout of a record's fields.
     *
     * By default excludes private fields (for accessors); pass
     * `includePrivate=true` for allocation size calculation. When `isUnion`
     * is set every field is overlaid at offset 0.
     */
    calculateLayout(fields: readonly GirField[], includePrivate = false, isUnion = false): FieldLayout[] {
        const layout: FieldLayout[] = [];
        let currentOffset = 0;
        let bitUnit: { offset: number; bitsUsed: number; capacityBits: number; typeName: string } | null = null;

        for (const field of fields) {
            if (field.private && !includePrivate) continue;

            const size = this.getMemberSize(field);
            const alignment = this.getMemberAlignment(field);

            if (field.bits !== undefined && field.bits > 0) {
                if (isUnion) {
                    layout.push({ field, offset: 0, size, alignment, bitOffset: 0, bitWidth: field.bits });
                    continue;
                }

                const typeName = String(field.type.name);
                const capacityBits = size * 8;

                if (
                    bitUnit === null ||
                    bitUnit.typeName !== typeName ||
                    bitUnit.bitsUsed + field.bits > bitUnit.capacityBits
                ) {
                    currentOffset = Math.ceil(currentOffset / alignment) * alignment;
                    bitUnit = { offset: currentOffset, bitsUsed: 0, capacityBits, typeName };
                    currentOffset += size;
                }

                layout.push({
                    field,
                    offset: bitUnit.offset,
                    size,
                    alignment,
                    bitOffset: bitUnit.bitsUsed,
                    bitWidth: field.bits,
                });
                bitUnit.bitsUsed += field.bits;
                continue;
            }

            bitUnit = null;

            if (isUnion) {
                layout.push({ field, offset: 0, size, alignment });
                continue;
            }

            currentOffset = Math.ceil(currentOffset / alignment) * alignment;

            layout.push({
                field,
                offset: currentOffset,
                size,
                alignment,
            });

            currentOffset += size;
        }

        return layout;
    }

    /**
     * Calculates the total size of a record with final alignment padding.
     *
     * Includes private fields since they are needed for memory allocation.
     * For a union the size is the largest member rounded up to the widest
     * member alignment.
     */
    calculateStructSize(fields: readonly GirField[], isUnion = false): number {
        const layout = this.calculateLayout(fields, true, isUnion);
        if (layout.length === 0) return 0;

        const rawSize = Math.max(...layout.map((item) => item.offset + item.size));
        const maxAlignment = Math.max(...layout.map((item) => item.alignment), 1);

        return Math.ceil(rawSize / maxAlignment) * maxAlignment;
    }

    /**
     * Writes field initialization statements.
     */
    writeFieldWrites(fields: readonly GirField[]): (writer: Writer) => void {
        const layout = this.calculateLayout(fields);
        const initializableFields = layout.filter(
            ({ field }) =>
                !field.private &&
                field.writable !== false &&
                this.isGeneratableFieldType(String(field.type.name)) &&
                (this.isWritableType(field.type) || this.isInlineNestedStruct(field)),
        );

        return (writer) => {
            for (const { field, offset } of initializableFields) {
                let fieldName = toValidMemberName(toCamelCase(field.name));
                if (fieldName === "id") fieldName = "id_";

                if (this.isInlineNestedStruct(field)) {
                    const typeName = String(field.type.name);
                    const nestedLayout = this.getNestedStructLayout(typeName);
                    if (!nestedLayout) continue;

                    const typeMapping = this.ffiMapper.mapType(field.type, false, field.type.transferOwnership);
                    if (typeMapping.unsafe) continue;
                    this.addFieldTypeImports(typeMapping.imports);

                    writer.writeLine(`if (init.${fieldName} !== undefined) {`);
                    writer.withIndent(() => {
                        for (const nestedItem of nestedLayout) {
                            if (!this.isWritableType(nestedItem.field.type)) continue;
                            const nestedFieldName = toValidMemberName(toCamelCase(nestedItem.field.name));
                            const nestedOffset = offset + nestedItem.offset;
                            const nestedTypeMapping = this.ffiMapper.mapType(
                                nestedItem.field.type,
                                false,
                                nestedItem.field.type.transferOwnership,
                            );
                            if (nestedTypeMapping.unsafe) continue;

                            writer.write(`write(getHandle(this),`);
                            writeFfiTypeExpression(writer, nestedTypeMapping.ffi);
                            writer.writeLine(`, ${nestedOffset}, init.${fieldName}.${nestedFieldName});`);
                        }
                    });
                    writer.writeLine("}");
                } else {
                    const typeMapping = this.ffiMapper.mapType(field.type, false, field.type.transferOwnership);
                    if (typeMapping.unsafe) continue;
                    this.addFieldTypeImports(typeMapping.imports);

                    writer.write(`if (init.${fieldName} !== undefined) write(getHandle(this),`);
                    writeFfiTypeExpression(writer, typeMapping.ffi);
                    writer.writeLine(`, ${offset}, init.${fieldName});`);
                }
            }
        };
    }

    getWritableFields(fields: readonly GirField[]): GirField[] {
        return fields.filter(
            (f) =>
                !f.private &&
                f.writable !== false &&
                this.isWritableType(f.type) &&
                this.isGeneratableFieldType(String(f.type.name)),
        );
    }

    getInitializableFields(fields: readonly GirField[]): GirField[] {
        return fields.filter(
            (f) =>
                !f.private &&
                f.writable !== false &&
                this.isGeneratableFieldType(String(f.type.name)) &&
                (this.isWritableType(f.type) || this.isInlineNestedStruct(f)),
        );
    }

    /**
     * Checks if a type can be written to memory.
     */
    isWritableType(type: { name: unknown; cType?: string }): boolean {
        return isMemoryWritableType(typeof type.name === "string" ? type.name : "");
    }

    /**
     * Checks if a field type is a nested struct (not a primitive).
     */
    isNestedStructType(typeName: string): boolean {
        if (isPrimitiveFieldType(typeName)) return false;
        const record = this.resolveRecord(typeName);
        if (!record || record.opaque || record.disguised) return false;
        if (record.glibTypeName) return false;
        return true;
    }

    /**
     * Checks if a field is an inline nested struct (not a pointer to struct)
     * that has writable sub-fields.
     */
    isInlineNestedStruct(field: GirField): boolean {
        const typeName = String(field.type.name);
        if (!this.isNestedStructType(typeName)) return false;
        const cType = field.type.cType;
        if (cType?.includes("*")) return false;
        const nestedLayout = this.getNestedStructLayout(typeName);
        if (!nestedLayout) return false;
        const hasWritableFields = nestedLayout.some((item) => this.isWritableType(item.field.type));
        return hasWritableFields;
    }

    getNestedStructLayout(typeName: string): FieldLayout[] | null {
        const record = this.resolveRecord(typeName);
        if (!record) return null;
        return this.calculateLayout(record.fields, false, record.isUnion);
    }

    /**
     * Gets the size of a record type for use in array element access.
     */
    getRecordSize(typeName: string): number {
        return this.getFieldSize({ name: typeName });
    }

    isGeneratableFieldType(typeName: string, visited: Set<string> = new Set()): boolean {
        if (!this.repo || !this.currentNamespace) {
            return isPrimitiveFieldType(typeName);
        }
        return isGeneratableFieldTypeUtil(typeName, this.repo, this.currentNamespace, visited);
    }

    getFfiTypeWriter(): FfiTypeWriter {
        return this.ffiTypeWriter;
    }

    private addFieldTypeImports(imports: Parameters<typeof addTypeImports>[1]): void {
        addTypeImports(this.imports, imports);
    }

    private resolveRecord(typeName: string): GirRecord | null {
        if (!this.repo) return null;

        if (typeName.includes(".")) {
            return this.repo.resolveRecord(typeName);
        }

        if (!this.currentNamespace) return null;
        const ns = this.repo.getNamespace(this.currentNamespace);
        return ns?.records.get(typeName) ?? null;
    }

    private getFieldSize(type: {
        name: unknown;
        cType?: string;
        isArray?: boolean;
        elementType?: { name: unknown; cType?: string } | null;
        fixedSize?: number;
    }): number {
        if (type.cType?.includes("*")) {
            return 8;
        }

        if (type.isArray && type.fixedSize !== undefined && type.elementType) {
            const elementSize = this.getFieldSize(type.elementType);
            return elementSize * type.fixedSize;
        }

        const typeName = typeof type.name === "string" ? type.name : "";

        if (isPrimitiveFieldType(typeName)) {
            return getPrimitiveTypeSize(typeName);
        }

        const cachedSize = this.sizeCache.get(typeName);
        if (cachedSize !== undefined) {
            return cachedSize;
        }

        const record = this.resolveRecord(typeName);
        if (record && !record.opaque && !record.disguised) {
            this.sizeCache.set(typeName, 0);
            const size = this.calculateStructSize(record.fields, record.isUnion);
            this.sizeCache.set(typeName, size);
            return size;
        }

        return 8;
    }

    private getFieldAlignment(
        type: {
            name: unknown;
            cType?: string;
            isArray?: boolean;
            elementType?: { name: unknown; cType?: string } | null;
            fixedSize?: number;
        },
        visited = new Set<string>(),
    ): number {
        if (type.cType?.includes("*")) {
            return 8;
        }

        if (type.isArray && type.fixedSize !== undefined && type.elementType) {
            return this.getFieldAlignment(type.elementType, visited);
        }

        const typeName = typeof type.name === "string" ? type.name : "";

        if (isPrimitiveFieldType(typeName)) {
            return getPrimitiveTypeSize(typeName);
        }

        if (visited.has(typeName)) {
            return 8;
        }
        visited.add(typeName);

        const record = this.resolveRecord(typeName);
        if (record && !record.opaque && !record.disguised) {
            const fields = record.getPublicFields();
            if (fields.length === 0) return 8;
            return Math.max(...fields.map((field) => this.getFieldAlignment(field.type, visited)));
        }

        return 8;
    }

    /**
     * Returns the byte size of a record member. Inline composite members
     * carry their own nested layout rather than a resolvable type.
     */
    private getMemberSize(field: GirField): number {
        const composite = field.inlineComposite;
        if (composite) {
            return this.calculateStructSize(composite.fields, composite.isUnion);
        }
        return this.getFieldSize(field.type);
    }

    /**
     * Returns the alignment of a record member. The alignment of an inline
     * composite is the widest alignment among its members.
     */
    private getMemberAlignment(field: GirField, visited = new Set<string>()): number {
        const composite = field.inlineComposite;
        if (composite) {
            let alignment = 1;
            for (const inner of composite.fields) {
                alignment = Math.max(alignment, this.getMemberAlignment(inner, visited));
            }
            return alignment;
        }
        return this.getFieldAlignment(field.type, visited);
    }
}
