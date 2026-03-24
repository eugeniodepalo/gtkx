import { describe, expect, it } from "vitest";
import { fileBuilder } from "../../../src/builders/file-builder.js";
import { stringify } from "../../../src/builders/stringify.js";
import { EnumGenerator } from "../../../src/ffi/generators/enum.js";
import { createNormalizedEnumeration, createNormalizedEnumerationMember } from "../../fixtures/gir-fixtures.js";

function createTestSetup() {
    const file = fileBuilder();
    const generator = new EnumGenerator(file, { namespace: "Gtk" });
    return { file, generator };
}

function getOutput(file: ReturnType<typeof fileBuilder>): string {
    return stringify(file);
}

describe("EnumGenerator", () => {
    describe("constructor", () => {
        it("creates generator with file builder and options", () => {
            const { generator } = createTestSetup();
            expect(generator).toBeInstanceOf(EnumGenerator);
        });
    });

    describe("addEnums", () => {
        it("adds single enum to file", () => {
            const { file, generator } = createTestSetup();
            const enumeration = createNormalizedEnumeration({
                name: "Orientation",
                members: [
                    createNormalizedEnumerationMember({ name: "HORIZONTAL", value: "0" }),
                    createNormalizedEnumerationMember({ name: "VERTICAL", value: "1" }),
                ],
            });

            generator.addEnums([enumeration]);

            const code = getOutput(file);
            expect(code).toContain("export enum Orientation");
            expect(code).toContain("HORIZONTAL = 0");
            expect(code).toContain("VERTICAL = 1");
        });

        it("adds multiple enums to file", () => {
            const { file, generator } = createTestSetup();
            const enums = [
                createNormalizedEnumeration({
                    name: "Orientation",
                    members: [createNormalizedEnumerationMember({ name: "HORIZONTAL", value: "0" })],
                }),
                createNormalizedEnumeration({
                    name: "Align",
                    members: [createNormalizedEnumerationMember({ name: "START", value: "0" })],
                }),
            ];

            generator.addEnums(enums);

            const code = getOutput(file);
            expect(code).toContain("export enum Orientation");
            expect(code).toContain("export enum Align");
        });

        it("handles empty enumeration array", () => {
            const { file, generator } = createTestSetup();

            generator.addEnums([]);

            const code = getOutput(file);
            expect(code).toBe("");
        });

        it("converts enum name to PascalCase", () => {
            const { file, generator } = createTestSetup();
            const enumeration = createNormalizedEnumeration({
                name: "text_direction",
                members: [createNormalizedEnumerationMember({ name: "LTR", value: "0" })],
            });

            generator.addEnums([enumeration]);

            const code = getOutput(file);
            expect(code).toContain("export enum TextDirection");
        });

        it("converts member names to CONSTANT_CASE", () => {
            const { file, generator } = createTestSetup();
            const enumeration = createNormalizedEnumeration({
                name: "Type",
                members: [
                    createNormalizedEnumerationMember({ name: "some-value", value: "0" }),
                    createNormalizedEnumerationMember({ name: "anotherValue", value: "1" }),
                ],
            });

            generator.addEnums([enumeration]);

            const code = getOutput(file);
            expect(code).toContain("SOME_VALUE = 0");
            expect(code).toContain("ANOTHERVALUE = 1");
        });

        it("prefixes member names starting with digit", () => {
            const { file, generator } = createTestSetup();
            const enumeration = createNormalizedEnumeration({
                name: "Format",
                members: [
                    createNormalizedEnumerationMember({ name: "1X", value: "0" }),
                    createNormalizedEnumerationMember({ name: "2D", value: "1" }),
                    createNormalizedEnumerationMember({ name: "3D_STEREO", value: "2" }),
                ],
            });

            generator.addEnums([enumeration]);

            const code = getOutput(file);
            expect(code).toContain("_1X = 0");
            expect(code).toContain("_2D = 1");
            expect(code).toContain("_3D_STEREO = 2");
        });

        it("converts string values to numbers", () => {
            const { file, generator } = createTestSetup();
            const enumeration = createNormalizedEnumeration({
                name: "Value",
                members: [
                    createNormalizedEnumerationMember({ name: "NEGATIVE", value: "-1" }),
                    createNormalizedEnumerationMember({ name: "ZERO", value: "0" }),
                    createNormalizedEnumerationMember({ name: "LARGE", value: "999" }),
                ],
            });

            generator.addEnums([enumeration]);

            const code = getOutput(file);
            expect(code).toContain("NEGATIVE = -1");
            expect(code).toContain("ZERO = 0");
            expect(code).toContain("LARGE = 999");
        });

        it("exports all enums", () => {
            const { file, generator } = createTestSetup();
            const enumeration = createNormalizedEnumeration({
                name: "Test",
                members: [createNormalizedEnumerationMember({ name: "VALUE", value: "0" })],
            });

            generator.addEnums([enumeration]);

            const code = getOutput(file);
            expect(code).toContain("export enum Test");
        });

        it("preserves documentation on enum", () => {
            const { file, generator } = createTestSetup();
            const enumeration = createNormalizedEnumeration({
                name: "Documented",
                doc: "This is a documented enum",
                members: [createNormalizedEnumerationMember({ name: "VALUE", value: "0" })],
            });

            generator.addEnums([enumeration]);

            const code = getOutput(file);
            expect(code).toContain("This is a documented enum");
        });

        it("preserves documentation on enum members", () => {
            const { file, generator } = createTestSetup();
            const enumeration = createNormalizedEnumeration({
                name: "Test",
                members: [
                    createNormalizedEnumerationMember({
                        name: "DOCUMENTED",
                        value: "0",
                        doc: "This member has docs",
                    }),
                ],
            });

            generator.addEnums([enumeration]);

            const code = getOutput(file);
            expect(code).toContain("This member has docs");
        });

        it("handles enum with many members", () => {
            const { file, generator } = createTestSetup();
            const members = Array.from({ length: 20 }, (_, i) =>
                createNormalizedEnumerationMember({ name: `VALUE_${i}`, value: String(i) }),
            );
            const enumeration = createNormalizedEnumeration({ name: "Large", members });

            generator.addEnums([enumeration]);

            const code = getOutput(file);
            for (let i = 0; i < 20; i++) {
                expect(code).toContain(`VALUE_${i} = ${i}`);
            }
        });
    });

    describe("deduplication", () => {
        it("skips duplicate member names within same enum", () => {
            const { file, generator } = createTestSetup();
            const enumeration = createNormalizedEnumeration({
                name: "Test",
                members: [
                    createNormalizedEnumerationMember({ name: "VALUE", value: "0" }),
                    createNormalizedEnumerationMember({ name: "VALUE", value: "1" }),
                ],
            });

            generator.addEnums([enumeration]);

            const code = getOutput(file);
            const matches = code.match(/VALUE = /g);
            expect(matches).toHaveLength(1);
            expect(code).toContain("VALUE = 0");
        });
    });
});
