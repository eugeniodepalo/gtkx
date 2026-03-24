import { describe, expect, it } from "vitest";
import { stringify } from "../../../src/builders/stringify.js";
import { namedType } from "../../../src/builders/types/named.js";

describe("NamedType", () => {
    it("renders a simple name", () => {
        expect(stringify(namedType("Button"))).toBe("Button");
    });

    it("renders with type arguments", () => {
        expect(stringify(namedType("Map", "string", "number"))).toBe("Map<string, number>");
    });

    it("renders with nested type arguments", () => {
        const inner = namedType("Array", "string");
        expect(stringify(namedType("Map", "string", inner))).toBe("Map<string, Array<string>>");
    });
});
