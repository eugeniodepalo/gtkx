import type { Builder } from "../types.js";
import type { Writer } from "../writer.js";

/** The set of built-in TypeScript keyword types. */
export type Keyword = "void" | "string" | "number" | "boolean" | "unknown" | "never" | "any" | "null" | "undefined";

/** Builder that emits a TypeScript keyword type (e.g. `string`, `number`, `void`). */
export class KeywordType implements Builder {
    constructor(readonly keyword: Keyword) {}

    /** @inheritdoc */
    write(writer: Writer): void {
        writer.write(this.keyword);
    }
}

/** Create a {@link KeywordType} for the given keyword. */
export function keywordType(keyword: Keyword): KeywordType {
    return new KeywordType(keyword);
}

/** Pre-built `void` keyword type. */
export const voidType = new KeywordType("void");
/** Pre-built `string` keyword type. */
export const stringType = new KeywordType("string");
/** Pre-built `number` keyword type. */
export const numberType = new KeywordType("number");
/** Pre-built `boolean` keyword type. */
export const booleanType = new KeywordType("boolean");
/** Pre-built `unknown` keyword type. */
export const unknownType = new KeywordType("unknown");
/** Pre-built `never` keyword type. */
export const neverType = new KeywordType("never");
/** Pre-built `any` keyword type. */
export const anyType = new KeywordType("any");
/** Pre-built `null` keyword type. */
export const nullType = new KeywordType("null");
