import { describe, expect, it } from "vitest";
import { fileBuilder } from "../../../src/builders/file-builder.js";
import { stringify } from "../../../src/builders/stringify.js";
import { ConstantGenerator } from "../../../src/ffi/generators/constant.js";
import { createNormalizedConstant, createNormalizedType } from "../../fixtures/gir-fixtures.js";

function createTestSetup() {
    const file = fileBuilder();
    const generator = new ConstantGenerator(file, { namespace: "Gtk" });
    return { file, generator };
}

function getOutput(file: ReturnType<typeof fileBuilder>): string {
    return stringify(file);
}

describe("ConstantGenerator", () => {
    describe("constructor", () => {
        it("creates generator with file builder and options", () => {
            const { generator } = createTestSetup();
            expect(generator).toBeInstanceOf(ConstantGenerator);
        });
    });

    describe("addConstants", () => {
        it("adds single constant to file", () => {
            const { file, generator } = createTestSetup();
            const constant = createNormalizedConstant({
                name: "MAJOR_VERSION",
                value: "4",
                type: createNormalizedType({ name: "gint" }),
            });

            generator.addConstants([constant]);

            const code = getOutput(file);
            expect(code).toContain("export const MAJOR_VERSION = 4");
        });

        it("adds multiple constants to file", () => {
            const { file, generator } = createTestSetup();
            const constants = [
                createNormalizedConstant({
                    name: "MAJOR_VERSION",
                    value: "4",
                    type: createNormalizedType({ name: "gint" }),
                }),
                createNormalizedConstant({
                    name: "MINOR_VERSION",
                    value: "0",
                    type: createNormalizedType({ name: "gint" }),
                }),
            ];

            generator.addConstants(constants);

            const code = getOutput(file);
            expect(code).toContain("MAJOR_VERSION = 4");
            expect(code).toContain("MINOR_VERSION = 0");
        });

        it("handles empty constants array", () => {
            const { file, generator } = createTestSetup();

            generator.addConstants([]);

            const code = getOutput(file);
            expect(code).toBe("");
        });

        it("wraps string values in quotes", () => {
            const { file, generator } = createTestSetup();
            const constant = createNormalizedConstant({
                name: "VERSION_STRING",
                value: "4.0.0",
                type: createNormalizedType({ name: "utf8" }),
            });

            generator.addConstants([constant]);

            const code = getOutput(file);
            expect(code).toContain('VERSION_STRING = "4.0.0"');
        });

        it("wraps filename type values in quotes", () => {
            const { file, generator } = createTestSetup();
            const constant = createNormalizedConstant({
                name: "DEFAULT_PATH",
                value: "/usr/share/gtk",
                type: createNormalizedType({ name: "filename" }),
            });

            generator.addConstants([constant]);

            const code = getOutput(file);
            expect(code).toContain('DEFAULT_PATH = "/usr/share/gtk"');
        });

        it("does not wrap numeric values in quotes", () => {
            const { file, generator } = createTestSetup();
            const constant = createNormalizedConstant({
                name: "MAX_SIZE",
                value: "65535",
                type: createNormalizedType({ name: "guint" }),
            });

            generator.addConstants([constant]);

            const code = getOutput(file);
            expect(code).toContain("MAX_SIZE = 65535");
            expect(code).not.toContain('"65535"');
        });

        it("does not wrap boolean-like values in quotes", () => {
            const { file, generator } = createTestSetup();
            const constant = createNormalizedConstant({
                name: "IS_ENABLED",
                value: "true",
                type: createNormalizedType({ name: "gboolean" }),
            });

            generator.addConstants([constant]);

            const code = getOutput(file);
            expect(code).toContain("IS_ENABLED = true");
        });

        it("preserves documentation on constants", () => {
            const { file, generator } = createTestSetup();
            const constant = createNormalizedConstant({
                name: "DOCUMENTED",
                value: "1",
                type: createNormalizedType({ name: "gint" }),
                doc: "This constant has documentation",
            });

            generator.addConstants([constant]);

            const code = getOutput(file);
            expect(code).toContain("This constant has documentation");
        });

        it("exports all constants", () => {
            const { file, generator } = createTestSetup();
            const constant = createNormalizedConstant({
                name: "TEST",
                value: "1",
                type: createNormalizedType({ name: "gint" }),
            });

            generator.addConstants([constant]);

            const code = getOutput(file);
            expect(code).toContain("export const TEST");
        });
    });

    describe("deduplication", () => {
        it("skips duplicate constants with same name", () => {
            const { file, generator } = createTestSetup();
            const constants = [
                createNormalizedConstant({
                    name: "DUPLICATE",
                    value: "1",
                    type: createNormalizedType({ name: "gint" }),
                }),
                createNormalizedConstant({
                    name: "DUPLICATE",
                    value: "2",
                    type: createNormalizedType({ name: "gint" }),
                }),
            ];

            generator.addConstants(constants);

            const code = getOutput(file);
            expect(code).toContain("DUPLICATE = 1");
            expect(code).not.toContain("DUPLICATE = 2");
        });

        it("keeps first occurrence when duplicates exist", () => {
            const { file, generator } = createTestSetup();
            const constants = [
                createNormalizedConstant({
                    name: "FIRST",
                    value: "first_value",
                    type: createNormalizedType({ name: "utf8" }),
                }),
                createNormalizedConstant({
                    name: "FIRST",
                    value: "second_value",
                    type: createNormalizedType({ name: "utf8" }),
                }),
            ];

            generator.addConstants(constants);

            const code = getOutput(file);
            expect(code).toContain('"first_value"');
            expect(code).not.toContain('"second_value"');
        });

        it("tracks duplicates across multiple addConstants calls", () => {
            const { file, generator } = createTestSetup();

            generator.addConstants([
                createNormalizedConstant({
                    name: "SHARED",
                    value: "1",
                    type: createNormalizedType({ name: "gint" }),
                }),
            ]);

            generator.addConstants([
                createNormalizedConstant({
                    name: "SHARED",
                    value: "2",
                    type: createNormalizedType({ name: "gint" }),
                }),
            ]);

            const code = getOutput(file);
            const matches = code.match(/SHARED/g);
            expect(matches).toHaveLength(1);
        });

        it("allows different constants with different names", () => {
            const { file, generator } = createTestSetup();
            const constants = [
                createNormalizedConstant({
                    name: "CONST_A",
                    value: "1",
                    type: createNormalizedType({ name: "gint" }),
                }),
                createNormalizedConstant({
                    name: "CONST_B",
                    value: "2",
                    type: createNormalizedType({ name: "gint" }),
                }),
            ];

            generator.addConstants(constants);

            const code = getOutput(file);
            expect(code).toContain("CONST_A = 1");
            expect(code).toContain("CONST_B = 2");
        });
    });

    describe("edge cases", () => {
        it("handles negative numeric values", () => {
            const { file, generator } = createTestSetup();
            const constant = createNormalizedConstant({
                name: "NEGATIVE",
                value: "-1",
                type: createNormalizedType({ name: "gint" }),
            });

            generator.addConstants([constant]);

            const code = getOutput(file);
            expect(code).toContain("NEGATIVE = -1");
        });

        it("handles floating point values", () => {
            const { file, generator } = createTestSetup();
            const constant = createNormalizedConstant({
                name: "PI",
                value: "3.14159",
                type: createNormalizedType({ name: "gdouble" }),
            });

            generator.addConstants([constant]);

            const code = getOutput(file);
            expect(code).toContain("PI = 3.14159");
        });

        it("handles empty string values", () => {
            const { file, generator } = createTestSetup();
            const constant = createNormalizedConstant({
                name: "EMPTY",
                value: "",
                type: createNormalizedType({ name: "utf8" }),
            });

            generator.addConstants([constant]);

            const code = getOutput(file);
            expect(code).toContain('EMPTY = ""');
        });

        it("handles string with special characters", () => {
            const { file, generator } = createTestSetup();
            const constant = createNormalizedConstant({
                name: "SPECIAL",
                value: "hello\\nworld",
                type: createNormalizedType({ name: "utf8" }),
            });

            generator.addConstants([constant]);

            const code = getOutput(file);
            expect(code).toContain("SPECIAL =");
        });
    });
});
