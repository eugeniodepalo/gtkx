/**
 * Constructor rewrites
 *
 * Removes the positional `constructor(...)` overloads ts-for-gir emits for GIR
 * `<constructor>` elements — both the `@constructor`-tagged class form and the
 * untagged interface form — which neither node-gtk nor the gtkx runtime
 * provides.
 */

const taggedDocPattern = (tag: string): RegExp =>
    new RegExp(String.raw`[ \t]*\/\*\*(?:(?!\*\/)[\s\S])*?@${tag}\b(?:(?!\*\/)[\s\S])*?\*\/`, "g");

/**
 * Region spanning the single source line that immediately follows a tagged
 * JSDoc block, with `text` trimmed of its bounding whitespace.
 */
type FollowingMemberLine = { start: number; end: number; text: string };

const indexOfLineEnd = (source: string, from: number): number => {
    let i = from;
    while (i < source.length && source[i] !== "\n") i += 1;
    return i;
};

const followingMemberLine = (source: string, docEnd: number): FollowingMemberLine => {
    let start = indexOfLineEnd(source, docEnd);
    if (start < source.length) start += 1;
    const lineEnd = indexOfLineEnd(source, start);
    const end = lineEnd < source.length ? lineEnd + 1 : lineEnd;
    return { start, end, text: source.slice(start, lineEnd) };
};

/**
 * Removes each member declaration whose preceding JSDoc block carries the
 * given tag, together with the single member line that follows it.
 *
 * When `memberFilter` is supplied, a tagged block is removed only if the
 * trimmed text of the member line that follows it satisfies the predicate;
 * the JSDoc block is then dropped together with that line.
 *
 * @param source - The `.d.ts` source to rewrite.
 * @param tag - JSDoc tag (without the leading `@`) marking members to strip.
 * @param memberFilter - Optional predicate over the trimmed member line.
 * @returns The source with the tagged member declarations removed.
 */
const stripTaggedMembers = (source: string, tag: string, memberFilter?: (memberLine: string) => boolean): string => {
    const pattern = taggedDocPattern(tag);
    const parts: string[] = [];
    let cursor = 0;
    for (;;) {
        const match = pattern.exec(source);
        if (match === null) break;
        const docStart = match.index;
        const lineStart = source.lastIndexOf("\n", docStart) + 1;
        const docEnd = docStart + match[0].length;
        const member = followingMemberLine(source, docEnd);
        if (memberFilter && !memberFilter(member.text.trim())) {
            pattern.lastIndex = docEnd;
            continue;
        }
        parts.push(source.slice(cursor, lineStart));
        cursor = member.end;
        pattern.lastIndex = cursor;
    }
    parts.push(source.slice(cursor));
    return parts.join("");
};

/**
 * Removes the positional `constructor(...)` overloads that ts-for-gir emits
 * for every GIR `<constructor>`, marked with a `@constructor` JSDoc tag.
 *
 * node-gtk's runtime constructor accepts a single GObject construct-properties
 * object; the GIR constructors are exposed only as `static` factory methods.
 * The gtkx runtime matches that: a props-object constructor plus `static`
 * factories. The props-object `constructor(config?: ConstructorProperties)`
 * overload — emitted without a `@constructor` tag — is left in place.
 *
 * ts-for-gir bug: it emits a positional `constructor` overload for every GIR
 * `<constructor>`, a shape neither node-gtk nor the gtkx runtime provides.
 *
 * @param source - The `.d.ts` source to rewrite.
 * @returns The source with positional constructor overloads removed.
 */
export function stripPositionalConstructors(source: string): string {
    return stripTaggedMembers(source, "constructor", (memberLine) => memberLine.startsWith("constructor"));
}

const POSITIONAL_CONSTRUCTOR_LINE = /(^|\n)([ \t]*)constructor\((?!\s*\)|\s*config\?:)[^\n]*\n/g;

/**
 * Removes the untagged positional `constructor(...)` overloads ts-for-gir
 * emits for GIR `<interface>` declarations carrying a `<constructor>`.
 *
 * ts-for-gir renders such an interface as a `class` with two constructor
 * overloads: the GObject `constructor(config?: ConstructorProperties)` form
 * and a positional one mirroring the GIR constructor. The gtkx runtime only
 * provides the props-object constructor plus `static` factories, matching
 * node-gtk; the positional overload — emitted without the `@constructor`
 * JSDoc tag {@link stripPositionalConstructors} keys on — is removed here.
 *
 * ts-for-gir bug: it emits a positional `constructor` overload for an
 * `<interface>`'s `<constructor>`, untagged, that the runtime never provides.
 *
 * @param source - The `.d.ts` source to rewrite.
 * @returns The source with untagged positional constructor overloads removed.
 */
export function stripUntaggedPositionalConstructors(source: string): string {
    return source.replace(POSITIONAL_CONSTRUCTOR_LINE, "$1");
}
