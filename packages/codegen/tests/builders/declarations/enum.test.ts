import { describe, expect, it } from "vitest";
import { enumDecl } from "../../../src/builders/declarations/enum.js";
import { stringify } from "../../../src/builders/stringify.js";

describe("EnumDeclarationBuilder", () => {
    it("generates a simple exported enum", () => {
        const builder = enumDecl("Orientation", { exported: true })
            .addMember({ name: "HORIZONTAL", value: 0 })
            .addMember({ name: "VERTICAL", value: 1 });

        expect(stringify(builder)).toBe("export enum Orientation {\n    HORIZONTAL = 0,\n    VERTICAL = 1,\n}\n");
    });

    it("generates enum with string values", () => {
        const builder = enumDecl("Color")
            .addMember({ name: "RED", value: '"red"' })
            .addMember({ name: "BLUE", value: '"blue"' });

        expect(stringify(builder)).toBe('enum Color {\n    RED = "red",\n    BLUE = "blue",\n}\n');
    });

    it("generates enum with doc", () => {
        const builder = enumDecl("Align", { exported: true, doc: "Alignment values." }).addMember({
            name: "FILL",
            value: 0,
        });

        expect(stringify(builder)).toBe("/** Alignment values. */\nexport enum Align {\n    FILL = 0,\n}\n");
    });

    it("generates const enum", () => {
        const builder = enumDecl("Direction", { exported: true, const: true }).addMember({ name: "LTR", value: 0 });

        expect(stringify(builder)).toBe("export const enum Direction {\n    LTR = 0,\n}\n");
    });

    it("generates member with doc", () => {
        const builder = enumDecl("Mode", { exported: true }).addMember({
            name: "NORMAL",
            value: 0,
            doc: "Normal mode.",
        });

        expect(stringify(builder)).toBe("export enum Mode {\n    /** Normal mode. */\n    NORMAL = 0,\n}\n");
    });
});
