import { describe, expect, it } from "vitest";
import { stringify } from "../../../src/builders/stringify.js";
import { unionType } from "../../../src/builders/types/union.js";

describe("UnionType", () => {
    it("renders two members", () => {
        expect(stringify(unionType("string", "number"))).toBe("string | number");
    });

    it("renders three members", () => {
        expect(stringify(unionType("string", "number", "boolean"))).toBe("string | number | boolean");
    });
});
