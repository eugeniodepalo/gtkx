/**
 * Enum Generator
 *
 * Generates enum definitions using the builder library.
 */

import type { GirEnumeration } from "@gtkx/gir";
import { enumDecl, type FileBuilder } from "../../builders/index.js";
import type { SimpleGeneratorOptions } from "../../core/generator-types.js";
import { formatJsDoc } from "../../core/utils/doc-formatter.js";
import { toConstantCase, toPascalCase } from "../../core/utils/naming.js";

/**
 * Generates enum declarations into a FileBuilder.
 *
 * @example
 * ```typescript
 * const generator = new EnumGenerator(file, { namespace: "Gtk" });
 * generator.addEnums(enumerations);
 * ```
 */
export class EnumGenerator {
    constructor(
        private readonly file: FileBuilder,
        private readonly options: SimpleGeneratorOptions,
    ) {}

    /**
     * Adds multiple enum declarations to the file.
     */
    addEnums(enumerations: readonly GirEnumeration[]): void {
        for (const enumeration of enumerations) {
            this.addEnum(enumeration);
        }
    }

    private addEnum(enumeration: GirEnumeration): void {
        const enumName = toPascalCase(enumeration.name);
        const doc = formatJsDoc(enumeration.doc, this.options.namespace);
        const builder = enumDecl(enumName, { exported: true, doc });

        const seenNames = new Set<string>();
        for (const member of enumeration.members) {
            let memberName = toConstantCase(member.name);
            if (/^\d/.test(memberName)) memberName = `_${memberName}`;
            if (seenNames.has(memberName)) continue;
            seenNames.add(memberName);

            builder.addMember({
                name: memberName,
                value: Number(member.value),
                doc: formatJsDoc(member.doc, this.options.namespace),
            });
        }

        this.file.add(builder);
    }
}
