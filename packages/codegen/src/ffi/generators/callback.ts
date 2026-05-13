/**
 * Callback Generator
 *
 * Emits TypeScript type aliases for each GIR `<callback>` element in a
 * namespace. Each callback becomes
 * `export type Name = (param1: unknown, ...) => ReturnType;` so consumer
 * code that names a callback (e.g. `Gio.AsyncReadyCallback`) resolves
 * against gtkx's runtime module surface.
 */

import type { FileBuilder } from "../../builders/file-builder.js";
import { typeAlias } from "../../builders/index.js";
import type { SimpleGeneratorOptions } from "../../core/generator-types.js";
import { formatJsDoc } from "../../core/utils/doc-formatter.js";
import { toCamelCase, toValidIdentifier } from "../../core/utils/naming.js";
import type { GirCallback, GirType } from "../../gir/index.js";

/**
 * Generates per-namespace callback type aliases into a FileBuilder.
 */
export class CallbackGenerator {
    constructor(
        private readonly file: FileBuilder,
        private readonly options: SimpleGeneratorOptions,
    ) {}

    /**
     * Adds an `export type Name = (...) => Return;` declaration for each callback.
     */
    addCallbacks(callbacks: readonly GirCallback[]): void {
        for (const callback of callbacks) {
            this.file.add(
                typeAlias(callback.name, buildCallbackSignature(callback), {
                    exported: true,
                    doc: formatJsDoc(callback.doc, this.options.namespace),
                }),
            );
        }
    }
}

function buildCallbackSignature(callback: GirCallback): string {
    const params = callback.parameters
        .map((param, index) => {
            const baseName =
                param.name && param.name !== "..." ? toValidIdentifier(toCamelCase(param.name)) : `arg${index}`;
            return `${baseName}: unknown`;
        })
        .join(", ");
    return `(${params}) => ${mapReturnTypeToTs(callback.returnType)}`;
}

function mapReturnTypeToTs(target: GirType): string {
    if (target.isVoid()) return "void";
    if (target.isString()) return "string";
    if (target.isBoolean()) return "boolean";
    if (target.isNumeric()) return "number";
    return "unknown";
}
