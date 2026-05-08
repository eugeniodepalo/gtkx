/**
 * Class Struct Generator
 *
 * Emits a per-class-struct registry of vtable slot descriptors so users of
 * `@gtkx/ffi`'s `registerClass` can spread a generated descriptor instead of
 * hardcoding byte offsets, marshalling argument types, or vfunc names.
 *
 * Each emitted file exports a single `const` named after the class struct's
 * C type (e.g. `GObjectClass` or `GIconIface`). Each entry carries
 * `{ kind, className, vfuncName, byteOffset, argTypes, returnType }`. The
 * `kind` discriminator is `"class"` when `isGtypeStructFor` resolves to a
 * GIR class, `"interface"` when it resolves to an interface, gating which
 * `RegisterClassOptions` slot the descriptor can flow into. Vfuncs whose
 * signatures cannot be cleanly mapped to FFI descriptors are skipped, and
 * the skip is reported through the codegen logger so registry omissions
 * remain auditable.
 */

import type { GirField, GirRecord, GirRepository } from "@gtkx/gir";
import type { FileBuilder } from "../../../builders/file-builder.js";
import { variableStatement } from "../../../builders/index.js";
import type { Writer } from "../../../builders/writer.js";
import type { FfiGeneratorOptions } from "../../../core/generator-types.js";
import type { FfiMapper } from "../../../core/type-system/ffi-mapper.js";
import { toCamelCase, toValidMemberName } from "../../../core/utils/naming.js";
import { log } from "../../../core/utils/progress.js";
import { writeFfiTypeExpression } from "../../../core/writers/ffi-type-expression.js";
import { FieldBuilder } from "../record/field-builder.js";
import { classifyVfunc, VFUNC_SKIP_REASON_LABEL } from "./vfunc-filter.js";

/**
 * Logger surface used by {@link ClassStructGenerator} for skip diagnostics.
 *
 * Kept narrow on purpose so tests can pass a no-op without importing the
 * full progress module.
 */
export type VtableLogger = {
    warning: (message: string) => void;
};

type VtableKind = "class" | "interface";

const DESCRIPTOR_TYPE_BY_KIND: Record<VtableKind, string> = {
    class: "RegisterClassVfuncDescriptor",
    interface: "RegisterClassInterfaceVfuncDescriptor",
};

type VfuncEntry = {
    readonly key: string;
    readonly field: GirField;
    readonly byteOffset: number;
};

/**
 * Generates the vtable slot registry for a single class struct record.
 *
 * Instances are short-lived: one is constructed per record, `generate()`
 * is called once, and the resulting `FileBuilder` content is stringified
 * by the caller.
 */
export class ClassStructGenerator {
    private readonly fieldBuilder: FieldBuilder;

    constructor(
        private readonly ffiMapper: FfiMapper,
        private readonly file: FileBuilder,
        options: FfiGeneratorOptions,
        private readonly repo: GirRepository,
        private readonly logger: VtableLogger = log,
    ) {
        this.fieldBuilder = new FieldBuilder(
            ffiMapper,
            file,
            options.sharedLibrary,
            options.glibLibrary,
            repo,
            options.namespace,
        );
    }

    /**
     * Populates the file with the class struct's vtable registry. Returns
     * `true` when at least one eligible vfunc was emitted; `false` when the
     * record is unusable (no `cType` / unresolved owning type), has no
     * callback fields, or every vfunc was skipped — in those cases the
     * caller should avoid writing an empty file.
     */
    generate(record: GirRecord): boolean {
        const exportSymbol = record.cType;
        if (!exportSymbol) {
            this.logger.warning(`[class-struct] skipping ${record.qualifiedName}: missing c:type`);
            return false;
        }

        const kind = this.resolveVtableKind(record);
        if (!kind) {
            this.logger.warning(
                `[class-struct] skipping ${exportSymbol}: cannot determine whether it's a class or interface struct`,
            );
            return false;
        }

        const layout = this.fieldBuilder.calculateLayout(record.fields, true);
        const entries: VfuncEntry[] = [];

        for (const { field, offset } of layout) {
            const result = classifyVfunc(field, this.ffiMapper);
            if (!result.eligible) {
                if (result.reason === "no-callback") continue;
                this.logger.warning(
                    `[class-struct] skipping ${exportSymbol}.${field.name}: ${VFUNC_SKIP_REASON_LABEL[result.reason]}`,
                );
                continue;
            }
            entries.push({
                key: toValidMemberName(toCamelCase(field.name)),
                field,
                byteOffset: offset,
            });
        }

        if (entries.length === 0) return false;

        const descriptorType = DESCRIPTOR_TYPE_BY_KIND[kind];
        this.file.addImport("../../native.js", ["t"]);
        this.file.addTypeImport("../../register-class.js", [descriptorType]);
        this.file.add(
            variableStatement(exportSymbol, {
                exported: true,
                initializer: (writer) => this.writeRegistryObject(writer, exportSymbol, entries, kind),
            }),
        );
        return true;
    }

    private resolveVtableKind(record: GirRecord): VtableKind | null {
        const owner = record.isGtypeStructFor;
        if (owner) {
            const ownerNamespace = owner.includes(".") ? owner.split(".")[0] : record.qualifiedName.split(".")[0];
            const ownerName = owner.includes(".") ? owner.split(".")[1] : owner;
            if (ownerNamespace && ownerName) {
                const ns = this.repo.getNamespace(ownerNamespace);
                if (ns?.classes.has(ownerName)) return "class";
                if (ns?.interfaces.has(ownerName)) return "interface";
            }
        }
        if (record.name.endsWith("Iface") || record.name.endsWith("Interface")) return "interface";
        if (record.name.endsWith("Class")) return "class";
        return null;
    }

    private writeRegistryObject(
        writer: Writer,
        exportSymbol: string,
        entries: readonly VfuncEntry[],
        kind: VtableKind,
    ): void {
        const descriptorType = DESCRIPTOR_TYPE_BY_KIND[kind];
        writer.writeLine("{");
        writer.withIndent(() => {
            for (const entry of entries) {
                writer.write(`${entry.key}: `);
                this.writeDescriptor(writer, exportSymbol, entry, kind, descriptorType);
                writer.writeLine(",");
            }
        });
        writer.write("}");
    }

    private writeDescriptor(
        writer: Writer,
        exportSymbol: string,
        entry: VfuncEntry,
        kind: VtableKind,
        descriptorType: string,
    ): void {
        const callback = entry.field.callback;
        if (!callback) throw new Error(`writeDescriptor called for non-callback field ${entry.field.name}`);

        writer.writeLine("{");
        writer.withIndent(() => {
            writer.writeLine(`kind: ${JSON.stringify(kind)},`);
            writer.writeLine(`className: ${JSON.stringify(exportSymbol)},`);
            writer.writeLine(`vfuncName: ${JSON.stringify(entry.field.name)},`);
            writer.writeLine(`byteOffset: ${entry.byteOffset},`);

            writer.write("argTypes: [");
            for (let i = 0; i < callback.parameters.length; i++) {
                if (i > 0) writer.write(", ");
                const param = callback.parameters[i];
                if (!param) continue;
                const mapped = this.ffiMapper.mapType(param.type, false, param.transferOwnership);
                writeFfiTypeExpression(writer, mapped.ffi);
            }
            writer.writeLine("],");

            writer.write("returnType: ");
            const mappedReturn = this.ffiMapper.mapType(
                callback.returnType,
                true,
                callback.returnType.transferOwnership,
            );
            writeFfiTypeExpression(writer, mappedReturn.ffi);
            writer.writeLine(",");
        });
        writer.write(`} satisfies ${descriptorType}`);
    }
}
