import { describe, expect, it } from "vitest";
import { variableStatement } from "../../../src/builders/declarations/variable.js";
import { stringify } from "../../../src/builders/stringify.js";

describe("VariableStatementBuilder", () => {
    it("generates a typed const declaration in TS mode", () => {
        const v = variableStatement("FOO", {
            exported: true,
            type: "string",
            initializer: '"bar"',
        });

        expect(stringify(v)).toBe('export const FOO: string = "bar";\n');
    });

    it("generates a typed let declaration in TS mode", () => {
        const v = variableStatement("count", {
            kind: "let",
            type: "number",
            initializer: "0",
        });

        expect(stringify(v)).toBe("let count: number = 0;\n");
    });

    it("emits a doc comment above the declaration", () => {
        const v = variableStatement("PI", {
            exported: true,
            initializer: "3.14",
            doc: "The value of PI.",
        });

        expect(stringify(v)).toBe("/** The value of PI. */\nexport const PI = 3.14;\n");
    });

    it("invokes the initializer writer callback when provided", () => {
        const v = variableStatement("META", {
            exported: true,
            type: "Record<string, string>",
            initializer: (w) => {
                w.writeBlock(() => {
                    w.writeLine('"foo": "bar",');
                });
            },
        });

        const output = stringify(v);
        expect(output).toContain("export const META: Record<string, string> = {");
        expect(output).toContain('    "foo": "bar",');
        expect(output).toContain("};");
    });

    it("drops the type annotation in JS mode", () => {
        const v = variableStatement("FOO", {
            exported: true,
            type: "string",
            initializer: '"bar"',
        });

        expect(stringify(v, "js")).toBe('export const FOO = "bar";\n');
    });
});
