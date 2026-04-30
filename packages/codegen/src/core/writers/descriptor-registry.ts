/**
 * FFI Descriptor Registry
 *
 * Tracks per-file FFI call descriptors so generated code can hoist a single
 * `fn(...)` declaration per unique (library, symbol, argument shape, return
 * type) tuple, instead of inlining the descriptor at every call site.
 *
 * The registry is a write-side accumulator: callers `register(...)` a
 * descriptor while emitting a method body and receive back a binding name.
 * The registry then emits one `const <name> = fn(...)` declaration per
 * registered descriptor when the file is rendered.
 */

import type { Writer } from "../../builders/writer.js";
import type { FfiTypeDescriptor } from "../type-system/ffi-types.js";
import type { CallArgument } from "./call-expression-builder.js";

/**
 * Inputs to {@link FfiDescriptorRegistry.register}. Mirrors the subset of
 * `CallExpressionOptions` that contributes to descriptor identity (everything
 * except per-call value expressions).
 */
export type DescriptorRegistration = {
    sharedLibrary: string;
    cIdentifier: string;
    args: readonly CallArgument[];
    returnType: FfiTypeDescriptor;
    selfArg?: { type: FfiTypeDescriptor; value: string };
    hasVarargs?: boolean;
};

/**
 * Result of {@link FfiDescriptorRegistry.register}.
 *
 * - `varargs: true` indicates the call cannot be hoisted (variadic). Callers
 *   must fall back to emitting an inline `call(...)` expression.
 * - Otherwise `name` is the binding identifier to invoke at the call site.
 */
export type DescriptorBinding = { varargs: true } | { varargs: false; name: string };

type DescriptorEntry = {
    name: string;
    library: string;
    symbol: string;
    argSlots: ReadonlyArray<{ type: FfiTypeDescriptor; optional: boolean }>;
    returnType: FfiTypeDescriptor;
};

/**
 * Per-file collector of hoisted FFI descriptors. Use one instance per
 * generated source file.
 */
export class FfiDescriptorRegistry {
    private readonly entriesByKey = new Map<string, DescriptorEntry>();
    private readonly entriesInOrder: DescriptorEntry[] = [];
    private readonly nameUsage = new Map<string, number>();

    /**
     * Registers (or returns a cached entry for) a descriptor.
     *
     * Returns `{ varargs: true }` for variadic callables — these cannot be
     * curried because the argument count is unknown at module load.
     * Otherwise returns the binding name to invoke.
     */
    register(opts: DescriptorRegistration): DescriptorBinding {
        if (opts.hasVarargs) {
            return { varargs: true };
        }

        const argSlots: Array<{ type: FfiTypeDescriptor; optional: boolean }> = [];
        if (opts.selfArg) {
            argSlots.push({ type: opts.selfArg.type, optional: false });
        }
        for (const arg of opts.args) {
            argSlots.push({ type: arg.type, optional: arg.optional === true });
        }

        const key = JSON.stringify({
            lib: opts.sharedLibrary,
            sym: opts.cIdentifier,
            args: argSlots,
            ret: opts.returnType,
        });

        const existing = this.entriesByKey.get(key);
        if (existing) {
            return { varargs: false, name: existing.name };
        }

        const name = this.allocateName(opts.cIdentifier);
        const entry: DescriptorEntry = {
            name,
            library: opts.sharedLibrary,
            symbol: opts.cIdentifier,
            argSlots,
            returnType: opts.returnType,
        };
        this.entriesByKey.set(key, entry);
        this.entriesInOrder.push(entry);
        return { varargs: false, name };
    }

    /** Whether any descriptors have been registered. */
    get isEmpty(): boolean {
        return this.entriesInOrder.length === 0;
    }

    /**
     * Emits one `const <name> = fn(...)` declaration per registered
     * descriptor, in registration order.
     */
    write(writer: Writer): void {
        for (let i = 0; i < this.entriesInOrder.length; i++) {
            const entry = this.entriesInOrder[i];
            if (entry === undefined) continue;
            this.writeEntry(writer, entry);
            if (i < this.entriesInOrder.length - 1) {
                writer.newLine();
            }
        }
    }

    private writeEntry(writer: Writer, entry: DescriptorEntry): void {
        writer.write(`const ${entry.name} = fn(`);
        writer.newLine();
        writer.withIndent(() => {
            writer.writeLine(`"${entry.library}",`);
            writer.writeLine(`"${entry.symbol}",`);
            writer.write("[");
            if (entry.argSlots.length > 0) {
                writer.newLine();
                writer.withIndent(() => {
                    for (let i = 0; i < entry.argSlots.length; i++) {
                        const slot = entry.argSlots[i];
                        if (slot === undefined) continue;
                        if (slot.optional) {
                            writer.writeLine(`{ type: ${JSON.stringify(slot.type)}, optional: true },`);
                        } else {
                            writer.writeLine(`{ type: ${JSON.stringify(slot.type)} },`);
                        }
                    }
                });
            }
            writer.writeLine("],");
            writer.write(JSON.stringify(entry.returnType));
            writer.newLine();
        });
        writer.writeLine(");");
    }

    private allocateName(cIdentifier: string): string {
        const used = this.nameUsage.get(cIdentifier);
        if (used === undefined) {
            this.nameUsage.set(cIdentifier, 1);
            return cIdentifier;
        }
        const next = used + 1;
        this.nameUsage.set(cIdentifier, next);
        return `${cIdentifier}_${next}`;
    }
}
