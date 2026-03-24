import { describe, expect, it } from "vitest";
import { stringify } from "../../../src/builders/stringify.js";
import { literalType } from "../../../src/builders/types/literal.js";

describe("LiteralType", () => {
    it("renders a string literal", () => {
        expect(stringify(literalType("gobject"))).toBe('"gobject"');
    });

    it("renders a number literal", () => {
        expect(stringify(literalType(42))).toBe("42");
    });

    it("renders a boolean literal", () => {
        expect(stringify(literalType(true))).toBe("true");
    });
});
