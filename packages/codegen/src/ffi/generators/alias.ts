/**
 * Alias Generator
 *
 * Emits TypeScript type aliases for each GIR `<alias>` element in a
 * namespace. Targets the simple typedef shape ts-for-gir produces — e.g.
 * `export type Quark = number;` — so consumer code that names a
 * `GLib.Quark` etc. resolves against gtkx's runtime module.
 */

import { raw, typeAlias } from "../../builders/index.js";
import type { FileBuilder } from "../../builders/file-builder.js";
import type { SimpleGeneratorOptions } from "../../core/generator-types.js";
import { formatJsDoc } from "../../core/utils/doc-formatter.js";
import type { GirAlias, GirType } from "../../gir/index.js";

/**
 * Per-namespace alias names that collide with hand-written runtime exports
 * in `packages/ffi/src/<ns>/`. Skipping them avoids `export *` ambiguity
 * without renaming the hand-written API.
 */
const SUPPRESSED_ALIASES: Readonly<Record<string, ReadonlySet<string>>> = {
    GObject: new Set(["Type"]),
};

/**
 * Type declarations appended to a namespace's aliases file beyond what the
 * GIR `<alias>` elements provide. Mirrors the ts-for-gir overrides that
 * Node-GTK and friends rely on (`GType<T>`, `TClosure<R, P>`).
 */
const NAMESPACE_TYPE_OVERRIDES: Readonly<Record<string, readonly string[]>> = {
    GObject: [
        "export type GType<T = unknown> = { __type__(arg: never): T; name: string };",
        "export type TClosure<R = unknown, P = unknown> = (...args: P[]) => R;",
    ],
};

/**
 * Generates per-namespace alias declarations into a FileBuilder.
 */
export class AliasGenerator {
    constructor(
        private readonly file: FileBuilder,
        private readonly options: SimpleGeneratorOptions,
    ) {}

    /**
     * Adds an `export type Name = TsType;` declaration for each alias.
     */
    addAliases(aliases: readonly GirAlias[]): void {
        const suppressed = SUPPRESSED_ALIASES[this.options.namespace] ?? new Set<string>();
        for (const alias of aliases) {
            if (suppressed.has(alias.name)) continue;
            this.file.add(
                typeAlias(alias.name, mapAliasTargetToTs(alias.targetType), {
                    exported: true,
                    doc: formatJsDoc(alias.doc, this.options.namespace),
                }),
            );
        }
        const overrides = NAMESPACE_TYPE_OVERRIDES[this.options.namespace] ?? [];
        for (const declaration of overrides) {
            this.file.add(raw(declaration));
        }
    }

    /**
     * Returns true when a namespace has overrides to emit even if it has no
     * GIR aliases of its own. Lets the orchestrator emit an aliases file
     * containing only overrides (e.g. GObject's `GType<T>` typedef).
     */
    static hasOverrides(namespace: string): boolean {
        return (NAMESPACE_TYPE_OVERRIDES[namespace]?.length ?? 0) > 0;
    }
}

/**
 * Returns the TypeScript surface representation of an alias target.
 *
 * Pointer-ish and unmappable targets collapse to `unknown` rather than
 * importing across namespace boundaries — alias consumers only care that
 * the name resolves; the precise underlying type is rarely meaningful.
 */
function mapAliasTargetToTs(target: GirType): string {
    if (target.isVoid()) return "void";
    if (target.isString()) return "string";
    if (target.isBoolean()) return "boolean";
    if (target.isNumeric()) return "number";
    if (target.name === "gpointer" || target.name === "gconstpointer") return "unknown";
    if (target.isArray) return "unknown[]";
    return "unknown";
}
