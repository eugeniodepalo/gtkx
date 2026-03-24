import { describe, expect, it } from "vitest";
import { stringify } from "../../../src/builders/stringify.js";
import { arrayType } from "../../../src/builders/types/array.js";
import { unionType } from "../../../src/builders/types/union.js";

describe("ArrayType", () => {
    it("renders a simple array", () => {
        expect(stringify(arrayType("string"))).toBe("string[]");
    });

    it("wraps union types in parentheses", () => {
        expect(stringify(arrayType(unionType("string", "number")))).toBe("(string | number)[]");
    });
});
