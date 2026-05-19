/**
 * Enum rewrites
 *
 * Converts ts-for-gir numeric `enum` declarations into structural const-object
 * plus type-alias pairs, widening bitfields and error domains as needed.
 */

import { findMatchingBrace } from "./shared.js";

/**
 * Real enum member values for one namespace, keyed enum name then member name.
 */
export type NamespaceEnumValues = ReadonlyMap<string, ReadonlyMap<string, number>>;

/**
 * Real enum member values for every namespace, keyed lowercase namespace
 * identifier (e.g. `"gtk"`, `"cairo"`).
 */
export type EnumValueMap = ReadonlyMap<string, NamespaceEnumValues>;

/**
 * Error-domain enum names for every namespace, keyed lowercase namespace
 * identifier. Enums named here are rewritten with an `instanceof`-capable
 * `[Symbol.hasInstance]` member.
 */
export type ErrorDomainMap = ReadonlyMap<string, ReadonlySet<string>>;

/**
 * Bitfield enum names for every namespace, keyed lowercase namespace
 * identifier. Enums named here receive a `number` type alias so a value may be
 * any `OR` combination of their flags, including the empty (zero) set.
 */
export type BitfieldMap = ReadonlyMap<string, ReadonlySet<string>>;

const ENUM_HEAD_PATTERN = /(^|\n)([ \t]*)(export[ \t]+)?((?:\/\*\*[\s\S]*?\*\/[ \t\n]*)?)enum[ \t]+(\w+)[ \t]*\{/g;
const EXPORT_BEFORE_DOC_ENUM_PATTERN = /\bexport[ \t]+(\/\*\*[\s\S]*?\*\/)[ \t\n]+(enum\b)/g;
const BLOCK_COMMENT_PATTERN = /\/\*[\s\S]*?\*\//g;
const LINE_COMMENT_PATTERN = /\/\/[^\n]*/g;

/**
 * Converts each `enum Foo { A, B }` declaration into a structural
 * `const Foo: { readonly A: 0; readonly B: 1; }` plus a sibling type alias:
 * `type Foo = (typeof Foo)[keyof typeof Foo]` for a plain enumeration, or
 * `type Foo = number` for a bitfield, whose values are arbitrary `OR`
 * combinations of its flags — including the empty set — rather than only the
 * named members.
 *
 * ts-for-gir emits numeric TypeScript enums, which are nominally branded and
 * cannot be satisfied by a plain `Object.freeze({ ... })` value emitted from
 * the raw-`.js` codegen side. The const-object shape produced here accepts
 * the frozen object while preserving consumer-facing usage: `M.Foo.A` reads
 * the constant and `Foo` continues to work as a type in function signatures.
 *
 * Member values are resolved in priority order: the real GIR value from
 * `enumValues`, then an explicit initializer present in the source, then the
 * computed ordinal. ts-for-gir emits enums without initializers, so the GIR
 * values are what keep non-sequential enums (offset enums, bitfields)
 * accurate against the runtime. JSDoc comments preceding members are stripped
 * because the const-object shape cannot host per-property block comments.
 *
 * Any JSDoc block authored between the `export` keyword and the `enum`
 * keyword is preserved on the rewritten `const` declaration so the rendered
 * docs stay attached to the new value declaration.
 *
 * @param source - The `.d.ts` source to rewrite.
 * @param enumValues - Real enum member values for the namespace, keyed enum
 *     name then member name; members absent from the map fall back as above.
 * @param errorDomainNames - Names of error-domain enums rewritten with an
 *     `instanceof`-capable `[Symbol.hasInstance]` member.
 * @param bitfieldNames - Names of `<bitfield>` enums whose type alias is
 *     widened to `number` to admit flag combinations and the empty set.
 */
export function rewriteEnumsToConstObjects(
    source: string,
    enumValues?: NamespaceEnumValues,
    errorDomainNames?: ReadonlySet<string>,
    bitfieldNames?: ReadonlySet<string>,
): string {
    const normalized = source.replace(EXPORT_BEFORE_DOC_ENUM_PATTERN, "$1\nexport $2");
    const matches: Array<{
        start: number;
        end: number;
        replacement: string;
    }> = [];

    ENUM_HEAD_PATTERN.lastIndex = 0;
    for (;;) {
        const result = ENUM_HEAD_PATTERN.exec(normalized);
        if (result === null) break;
        const [matched, lineStart, indent, exportKw, leadingDoc, name] = result;
        if (!name) continue;
        const bodyStart = result.index + matched.length;
        const bodyEnd = findMatchingBrace(normalized, bodyStart);
        if (bodyEnd < 0) continue;
        const body = normalized.slice(bodyStart, bodyEnd);

        matches.push({
            start: result.index,
            end: bodyEnd + 1,
            replacement: renderEnumReplacement({
                lineStart: lineStart ?? "",
                indent: indent ?? "",
                exportKw: exportKw ?? "",
                leadingDoc: leadingDoc ?? "",
                name,
                body,
                memberValues: enumValues?.get(name),
                isErrorDomain: errorDomainNames?.has(name) ?? false,
                isBitfield: bitfieldNames?.has(name) ?? false,
            }),
        });
    }

    if (matches.length === 0) return normalized;

    const parts: string[] = [];
    let cursor = 0;
    for (const { start, end, replacement } of matches) {
        parts.push(normalized.slice(cursor, start), replacement);
        cursor = end;
    }
    parts.push(normalized.slice(cursor));
    return parts.join("");
}

type EnumReplacementInput = {
    lineStart: string;
    indent: string;
    exportKw: string;
    leadingDoc: string;
    name: string;
    body: string;
    memberValues?: ReadonlyMap<string, number>;
    isErrorDomain: boolean;
    isBitfield: boolean;
};

const renderEnumReplacement = (input: EnumReplacementInput): string => {
    const { lineStart, indent, exportKw, leadingDoc, name, body, memberValues, isErrorDomain, isBitfield } = input;
    const stripped = body.replace(BLOCK_COMMENT_PATTERN, "").replace(LINE_COMMENT_PATTERN, "");
    let nextOrdinal = 0;
    const memberLines: string[] = [];
    for (const raw of stripped.split(",")) {
        const member = raw.trim();
        if (member.length === 0) continue;
        const [memberName, initializer] = splitEnumMember(member);
        if (!memberName || !/^[A-Za-z_]\w*$/.test(memberName)) continue;
        let literal: string;
        const knownValue =
            memberValues?.get(memberName) ??
            (memberName.startsWith("TODO_") ? memberValues?.get(memberName.slice("TODO_".length)) : undefined);
        if (knownValue !== undefined) {
            literal = String(knownValue);
            nextOrdinal = knownValue + 1;
        } else if (initializer === undefined) {
            literal = String(nextOrdinal);
            nextOrdinal += 1;
        } else {
            literal = initializer;
            const numeric = parseNumericLiteral(initializer);
            if (numeric !== null) nextOrdinal = numeric + 1;
        }
        memberLines.push(`    readonly ${memberName}: ${literal};`);
    }
    const memberBlock = memberLines.join("\n");
    if (isErrorDomain) {
        const hasInstance =
            "{ readonly [Symbol.hasInstance]: (value: unknown) =>" +
            " value is Error & { readonly domain: number; readonly code: number } }";
        return [
            `${lineStart}${indent}${leadingDoc}${exportKw}const ${name}: {`,
            memberBlock,
            `} & ${hasInstance};`,
            `${indent}${exportKw}type ${name} = (typeof ${name})[Exclude<keyof typeof ${name}, symbol>];`,
        ].join("\n");
    }
    const typeAlias = isBitfield
        ? `${indent}${exportKw}type ${name} = number;`
        : `${indent}${exportKw}type ${name} = (typeof ${name})[keyof typeof ${name}];`;
    return [`${lineStart}${indent}${leadingDoc}${exportKw}const ${name}: {`, memberBlock, `};`, typeAlias].join("\n");
};

const splitEnumMember = (member: string): [string, string | undefined] => {
    const equalsIndex = member.indexOf("=");
    if (equalsIndex === -1) return [member.trim(), undefined];
    return [member.slice(0, equalsIndex).trim(), member.slice(equalsIndex + 1).trim()];
};

const parseNumericLiteral = (text: string): number | null => {
    const trimmed = text.trim();
    if (trimmed === "") return null;
    const value = Number(trimmed);
    return Number.isFinite(value) ? value : null;
};
