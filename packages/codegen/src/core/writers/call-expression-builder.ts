/**
 * Call Expression Builder
 *
 * Builds FFI call() expressions for code generation.
 * Uses our Writer for streaming code output.
 */

import type { Writer } from "../../builders/writer.js";
import type { FfiTypeDescriptor, MappedType } from "../type-system/ffi-types.js";

/**
 * Callback wrapper info for generating wrapped callback arguments.
 */
export type CallbackWrapperInfo = {
    paramName: string;
    wrappedName: string;
    wrapExpression: (writer: Writer) => void;
    isOptional: boolean;
};

/**
 * Represents a single argument to a call() expression.
 */
export type CallArgument = {
    /** The FFI type descriptor for this argument */
    type: FfiTypeDescriptor;
    /** The value expression (JavaScript code) */
    value: string;
    /** Whether this argument is optional */
    optional?: boolean;
    /** Callback wrapper info if this is a callback that needs wrapping */
    callbackWrapper?: CallbackWrapperInfo;
};

/**
 * Options for building a call expression.
 */
export type CallExpressionOptions = {
    /** The shared library (e.g., "libgtk-4.so.1") */
    sharedLibrary: string;
    /** The C identifier (e.g., "gtk_button_new") */
    cIdentifier: string;
    /** Arguments to pass to the function */
    args: CallArgument[];
    /** Return type descriptor */
    returnType: FfiTypeDescriptor;
    /** Self argument to prepend (for instance methods) */
    selfArg?: {
        type: FfiTypeDescriptor;
        value: string;
    };
    /** Whether this function has varargs (spreads ...args at the end) */
    hasVarargs?: boolean;
};

/**
 * Builds FFI call() expressions.
 *
 * Uses our Writer for streaming code output.
 *
 * @example
 * ```typescript
 * const builder = new CallExpressionBuilder();
 *
 * const writerFn = builder.toWriter({
 *   sharedLibrary: "libgtk-4.so.1",
 *   cIdentifier: "gtk_button_set_label",
 *   args: [{ type: { type: "string" }, value: "label" }],
 *   returnType: { type: "void" },
 *   selfArg: { type: { type: "gobject" }, value: "this.handle" },
 * });
 * writerFn(writer);
 * ```
 */
export class CallExpressionBuilder {
    /**
     * Builds a call expression as a writer function.
     *
     * @param options - Call expression options
     * @returns Function that writes the call expression to a Writer
     */
    toWriter(options: CallExpressionOptions): (writer: Writer) => void {
        return (writer) => {
            writer.write("call(");
            writer.newLine();
            writer.withIndent(() => {
                writer.writeLine(`"${options.sharedLibrary}",`);
                writer.writeLine(`"${options.cIdentifier}",`);
                writer.write("[");
                const allArgs = this.collectArguments(options);
                const hasContent = allArgs.length > 0 || options.hasVarargs;
                if (hasContent) {
                    writer.newLine();
                    writer.withIndent(() => {
                        allArgs.forEach((arg, index) => {
                            this.writeArgument(writer, arg);
                            if (index < allArgs.length - 1 || options.hasVarargs) {
                                writer.write(",");
                            }
                            writer.newLine();
                        });
                        if (options.hasVarargs) {
                            writer.writeLine("...args,");
                        }
                    });
                }
                writer.writeLine("],");
                writer.write(JSON.stringify(options.returnType));
                writer.newLine();
            });
            writer.write(")");
        };
    }

    /**
     * Builds a value expression that handles object ID extraction.
     *
     * For gobject/boxed/struct types, extracts the `.handle` property (NativeHandle).
     * For arrays of gobject/boxed/struct types, maps each item to its `.handle`.
     * For hashtable types, generates: `Array.from(value)` to convert Map to array of tuples.
     * For primitives, just returns the value name.
     */
    buildValueExpression(valueName: string, mappedType: MappedType, nullable = false): string {
        const needsPtr =
            mappedType.ffi.type === "gobject" ||
            mappedType.ffi.type === "boxed" ||
            mappedType.ffi.type === "struct" ||
            mappedType.ffi.type === "fundamental";

        if (needsPtr) {
            const isUnknownType = mappedType.ts === "unknown";
            if (isUnknownType) {
                return nullable
                    ? `(${valueName} as { handle: NativeHandle } | null)?.handle`
                    : `(${valueName} as { handle: NativeHandle }).handle`;
            }
            return nullable ? `${valueName}?.handle` : `${valueName}.handle`;
        }

        if (mappedType.ffi.type === "array" && mappedType.ffi.itemType) {
            const itemType = mappedType.ffi.itemType.type;
            const itemNeedsPtr =
                itemType === "gobject" || itemType === "boxed" || itemType === "struct" || itemType === "fundamental";

            if (itemNeedsPtr) {
                return nullable ? `${valueName}?.map(item => item.handle)` : `${valueName}.map(item => item.handle)`;
            }
        }

        if (mappedType.ffi.type === "hashtable") {
            const valueType = mappedType.ffi.valueType?.type;
            const valueNeedsPtr =
                valueType === "gobject" ||
                valueType === "boxed" ||
                valueType === "struct" ||
                valueType === "fundamental";

            if (valueNeedsPtr) {
                return `${valueName} ? Array.from(${valueName}).map(([k, v]) => [k, v?.handle]) : null`;
            }
            return `${valueName} ? Array.from(${valueName}) : null`;
        }

        return valueName;
    }

    /**
     * Builds error checking code as a writer function.
     *
     * @param gerrorRef - The GError class reference (e.g., "GLib.GError" or "GError")
     */
    errorCheckWriter(gerrorRef = "GLib.GError"): (writer: Writer) => void {
        return (writer) => {
            writer.writeLine("if (error.value !== null) {");
            writer.withIndent(() => {
                writer.writeLine(`throw new NativeError(getNativeObject(error.value as NativeHandle, ${gerrorRef}));`);
            });
            writer.writeLine("}");
        };
    }

    private collectArguments(
        options: CallExpressionOptions,
    ): Array<{ type: FfiTypeDescriptor; value: string; optional?: boolean }> {
        const allArgs: Array<{ type: FfiTypeDescriptor; value: string; optional?: boolean }> = [];

        if (options.selfArg) {
            allArgs.push({
                type: options.selfArg.type,
                value: options.selfArg.value,
            });
        }

        for (const arg of options.args) {
            allArgs.push(arg);
        }

        return allArgs;
    }

    private writeArgument(writer: Writer, arg: { type: FfiTypeDescriptor; value: string; optional?: boolean }): void {
        writer.write("{");
        writer.newLine();
        writer.withIndent(() => {
            writer.writeLine(`type: ${JSON.stringify(arg.type)},`);
            writer.write(`value: ${arg.value}`);
            if (arg.optional) {
                writer.writeLine(",");
                writer.write("optional: true");
            }
            writer.newLine();
        });
        writer.write("}");
    }
}
