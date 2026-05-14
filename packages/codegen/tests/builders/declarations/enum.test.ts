import { describe, expect, it } from "vitest";
import { enumDecl } from "../../../src/builders/declarations/enum.js";
import { stringify } from "../../../src/builders/stringify.js";

describe("EnumDeclarationBuilder", () => {
    describe("TypeScript mode (default)", () => {
        it("emits an exported enum declaration", () => {
            const builder = enumDecl("Orientation", { exported: true })
                .addMember({ name: "HORIZONTAL", value: 0 })
                .addMember({ name: "VERTICAL", value: 1 });

            expect(stringify(builder)).toBe("export enum Orientation {\n    HORIZONTAL = 0,\n    VERTICAL = 1,\n}\n");
        });

        it("preserves string-literal values verbatim", () => {
            const builder = enumDecl("Color")
                .addMember({ name: "RED", value: '"red"' })
                .addMember({ name: "BLUE", value: '"blue"' });

            expect(stringify(builder)).toBe('enum Color {\n    RED = "red",\n    BLUE = "blue",\n}\n');
        });

        it("emits a leading doc comment", () => {
            const builder = enumDecl("Align", { exported: true, doc: "Alignment values." }).addMember({
                name: "FILL",
                value: 0,
            });

            expect(stringify(builder)).toBe("/** Alignment values. */\nexport enum Align {\n    FILL = 0,\n}\n");
        });

        it("emits a const enum when const: true", () => {
            const builder = enumDecl("Direction", { exported: true, const: true }).addMember({
                name: "LTR",
                value: 0,
            });

            expect(stringify(builder)).toBe("export const enum Direction {\n    LTR = 0,\n}\n");
        });

        it("emits a per-member doc comment", () => {
            const builder = enumDecl("Mode", { exported: true }).addMember({
                name: "NORMAL",
                value: 0,
                doc: "Normal mode.",
            });

            expect(stringify(builder)).toBe("export enum Mode {\n    /** Normal mode. */\n    NORMAL = 0,\n}\n");
        });
    });

    describe("JavaScript mode", () => {
        it("emits an exported enum as a frozen const object", () => {
            const builder = enumDecl("Orientation", { exported: true })
                .addMember({ name: "HORIZONTAL", value: 0 })
                .addMember({ name: "VERTICAL", value: 1 });

            expect(stringify(builder, "js")).toBe(
                "export const Orientation = globalThis.Object.freeze({\n    HORIZONTAL: 0,\n    VERTICAL: 1,\n});\n",
            );
        });

        it("auto-increments ordinals for members without explicit values", () => {
            const builder = enumDecl("Order", { exported: true })
                .addMember({ name: "FIRST" })
                .addMember({ name: "SECOND" })
                .addMember({ name: "THIRD", value: 10 })
                .addMember({ name: "FOURTH" });

            expect(stringify(builder, "js")).toBe(
                "export const Order = globalThis.Object.freeze({\n    FIRST: 0,\n    SECOND: 1,\n    THIRD: 10,\n    FOURTH: 11,\n});\n",
            );
        });
    });
});
