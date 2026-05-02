/**
 * Constant Generator
 *
 * Generates constant definitions using the builder library.
 */

import type { GirConstant } from "@gtkx/gir";
import { type FileBuilder, variableStatement } from "../../builders/index.js";
import type { SimpleGeneratorOptions } from "../../core/generator-types.js";
import { UNSAFE_PRIMITIVE_NAMES } from "../../core/type-system/ffi-types.js";
import { formatJsDoc } from "../../core/utils/doc-formatter.js";

/**
 * Generates constant declarations into a FileBuilder.
 *
 * @example
 * ```typescript
 * const generator = new ConstantGenerator(file, { namespace: "Gtk" });
 * generator.addConstants(constants);
 * ```
 */
export class ConstantGenerator {
    private readonly seen = new Set<string>();

    constructor(
        private readonly file: FileBuilder,
        private readonly options: SimpleGeneratorOptions,
    ) {}

    /**
     * Adds multiple constant declarations to the file.
     */
    addConstants(constants: readonly GirConstant[]): void {
        for (const constant of constants) {
            this.addConstant(constant);
        }
    }

    private addConstant(constant: GirConstant): void {
        const constName = constant.name;

        if (this.seen.has(constName)) return;
        if (UNSAFE_PRIMITIVE_NAMES.has(constant.type.name)) return;
        this.seen.add(constName);

        const isStringType = constant.type.name === "utf8" || constant.type.name === "filename";
        const constValue = isStringType ? `"${constant.value}"` : constant.value;

        this.file.add(
            variableStatement(constName, {
                exported: true,
                initializer: constValue,
                doc: formatJsDoc(constant.doc, this.options.namespace),
            }),
        );
    }
}
