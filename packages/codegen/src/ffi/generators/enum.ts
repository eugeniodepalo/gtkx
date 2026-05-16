/**
 * Enum Generator
 *
 * Generates enum definitions using the builder library.
 */

import { enumDecl, type FileBuilder } from "../../builders/index.js";
import type { SimpleGeneratorOptions } from "../../core/generator-types.js";
import { formatJsDoc } from "../../core/utils/doc-formatter.js";
import { normalizeClassName, toConstantCase } from "../../core/utils/naming.js";
import type { GirEnumeration } from "../../gir/index.js";

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
        const enumName = normalizeClassName(enumeration.name);
        const doc = formatJsDoc(enumeration.doc, this.options.namespace);
        const errorDomainResolver = enumeration.glibErrorDomain
            ? this.errorDomainResolver(enumeration.glibErrorDomain)
            : undefined;
        const builder = enumDecl(enumName, { exported: true, doc, errorDomainResolver });

        const seenNames = new Set<string>();
        for (const member of enumeration.members) {
            let memberName = toConstantCase(member.name);
            if (/^\d/.test(memberName)) memberName = `TODO_${memberName}`;
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

    /**
     * Builds the `makeErrorDomain` quark-resolver expression for an error
     * domain, registering the imports the expression depends on.
     *
     * @param quark - The GLib error-domain quark name.
     * @returns A thunk expression resolving the domain quark at call time.
     */
    private errorDomainResolver(quark: string): string {
        this.file.addImport("../../native.js", ["makeErrorDomain"]);
        const literal = JSON.stringify(quark);
        if (this.options.namespace === "GLib") {
            return `() => quarkFromString(${literal})`;
        }
        this.file.addNamespaceImport("../glib/glib.js", "GLib");
        return `() => GLib.quarkFromString(${literal})`;
    }
}
