import { describe, expect, it } from "vitest";
import { stringify } from "../../../src/builders/stringify.js";
import { booleanType, numberType, stringType, unknownType, voidType } from "../../../src/builders/types/keyword.js";

describe("KeywordType", () => {
    it("renders void", () => {
        expect(stringify(voidType)).toBe("void");
    });

    it("renders string", () => {
        expect(stringify(stringType)).toBe("string");
    });

    it("renders number", () => {
        expect(stringify(numberType)).toBe("number");
    });

    it("renders boolean", () => {
        expect(stringify(booleanType)).toBe("boolean");
    });

    it("renders unknown", () => {
        expect(stringify(unknownType)).toBe("unknown");
    });
});
