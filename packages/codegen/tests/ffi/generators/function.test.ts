import { describe, expect, it } from "vitest";
import { fileBuilder } from "../../../src/builders/file-builder.js";
import { stringify } from "../../../src/builders/stringify.js";
import { FfiMapper } from "../../../src/core/type-system/ffi-mapper.js";
import { FunctionGenerator } from "../../../src/ffi/generators/function.js";
import {
    createNormalizedFunction,
    createNormalizedNamespace,
    createNormalizedParameter,
    createNormalizedType,
} from "../../fixtures/gir-fixtures.js";
import { createMockRepository } from "../../fixtures/mock-repository.js";

function createTestSetup(namespaces: Map<string, ReturnType<typeof createNormalizedNamespace>> = new Map()) {
    const ns = createNormalizedNamespace({ name: "Gtk" });
    namespaces.set("Gtk", ns);
    const repo = createMockRepository(namespaces);
    const ffiMapper = new FfiMapper(repo as Parameters<typeof FfiMapper>[0], "Gtk");
    const file = fileBuilder();
    const options = {
        namespace: "Gtk",
        sharedLibrary: "libgtk-4.so.1",
        glibLibrary: "libglib-2.0.so.0",
        gobjectLibrary: "libgobject-2.0.so.0",
    };
    const generator = new FunctionGenerator(ffiMapper, file, options);
    return { generator, file };
}

function getOutput(file: ReturnType<typeof fileBuilder>): string {
    return stringify(file);
}

describe("FunctionGenerator", () => {
    describe("constructor", () => {
        it("creates generator with dependencies", () => {
            const { generator } = createTestSetup();
            expect(generator).toBeInstanceOf(FunctionGenerator);
        });
    });

    describe("generate", () => {
        it("returns false when no functions provided", () => {
            const { generator } = createTestSetup();

            const result = generator.generate([]);

            expect(result).toBe(false);
        });

        it("returns true when functions are generated", () => {
            const { generator } = createTestSetup();
            const func = createNormalizedFunction({
                name: "init",
                cIdentifier: "gtk_init",
                returnType: createNormalizedType({ name: "none" }),
            });

            const result = generator.generate([func]);

            expect(result).toBe(true);
        });

        it("generates single function", () => {
            const { generator, file } = createTestSetup();
            const func = createNormalizedFunction({
                name: "init",
                cIdentifier: "gtk_init",
                returnType: createNormalizedType({ name: "none" }),
            });

            generator.generate([func]);

            const code = getOutput(file);
            expect(code).toContain("export const init");
        });

        it("generates multiple functions", () => {
            const { generator, file } = createTestSetup();
            const functions = [
                createNormalizedFunction({
                    name: "init",
                    cIdentifier: "gtk_init",
                    returnType: createNormalizedType({ name: "none" }),
                }),
                createNormalizedFunction({
                    name: "main",
                    cIdentifier: "gtk_main",
                    returnType: createNormalizedType({ name: "none" }),
                }),
            ];

            generator.generate(functions);

            const code = getOutput(file);
            expect(code).toContain("export const init");
            expect(code).toContain("export const main");
        });

        it("converts function names to camelCase", () => {
            const { generator, file } = createTestSetup();
            const func = createNormalizedFunction({
                name: "some_long_function",
                cIdentifier: "gtk_some_long_function",
                returnType: createNormalizedType({ name: "none" }),
            });

            generator.generate([func]);

            const code = getOutput(file);
            expect(code).toContain("export const someLongFunction");
        });

        it("generates arrow function syntax", () => {
            const { generator, file } = createTestSetup();
            const func = createNormalizedFunction({
                name: "test",
                cIdentifier: "gtk_test",
                returnType: createNormalizedType({ name: "none" }),
            });

            generator.generate([func]);

            const code = getOutput(file);
            expect(code).toContain("=>");
        });

        it("includes parameters in function signature", () => {
            const { generator, file } = createTestSetup();
            const func = createNormalizedFunction({
                name: "with_params",
                cIdentifier: "gtk_with_params",
                returnType: createNormalizedType({ name: "none" }),
                parameters: [
                    createNormalizedParameter({
                        name: "label",
                        type: createNormalizedType({ name: "utf8" }),
                    }),
                    createNormalizedParameter({
                        name: "count",
                        type: createNormalizedType({ name: "gint" }),
                    }),
                ],
            });

            generator.generate([func]);

            const code = getOutput(file);
            expect(code).toContain("label: string");
            expect(code).toContain("count: number");
        });

        it("includes return type for non-void functions", () => {
            const { generator, file } = createTestSetup();
            const func = createNormalizedFunction({
                name: "get_value",
                cIdentifier: "gtk_get_value",
                returnType: createNormalizedType({ name: "gint" }),
            });

            generator.generate([func]);

            const code = getOutput(file);
            expect(code).toContain(": number");
        });

        it("handles nullable return types", () => {
            const { generator, file } = createTestSetup();
            const func = createNormalizedFunction({
                name: "get_value",
                cIdentifier: "gtk_get_value",
                returnType: createNormalizedType({ name: "utf8", nullable: true }),
            });

            generator.generate([func]);

            const code = getOutput(file);
            expect(code).toContain("string | null");
        });

        it("marks optional parameters with question token", () => {
            const { generator, file } = createTestSetup();
            const func = createNormalizedFunction({
                name: "optional_param",
                cIdentifier: "gtk_optional_param",
                returnType: createNormalizedType({ name: "none" }),
                parameters: [
                    createNormalizedParameter({
                        name: "optional",
                        type: createNormalizedType({ name: "utf8", nullable: true }),
                        nullable: true,
                    }),
                ],
            });

            generator.generate([func]);

            const code = getOutput(file);
            expect(code).toContain("optional?:");
        });

        it("includes call expression in function body", () => {
            const { generator, file } = createTestSetup();
            const func = createNormalizedFunction({
                name: "test",
                cIdentifier: "gtk_test",
                returnType: createNormalizedType({ name: "gint" }),
            });

            generator.generate([func]);

            const code = getOutput(file);
            expect(code).toContain("call(");
            expect(code).toContain('"libgtk-4.so.1"');
            expect(code).toContain('"gtk_test"');
        });

        it("preserves documentation", () => {
            const { generator, file } = createTestSetup();
            const func = createNormalizedFunction({
                name: "documented",
                cIdentifier: "gtk_documented",
                returnType: createNormalizedType({ name: "none" }),
                doc: "This function has documentation",
            });

            generator.generate([func]);

            const code = getOutput(file);
            expect(code).toContain("This function has documentation");
        });
    });

    describe("filtering", () => {
        it("generates functions with varargs converting to rest parameter", () => {
            const { generator, file } = createTestSetup();
            const functions = [
                createNormalizedFunction({
                    name: "with_varargs",
                    cIdentifier: "gtk_with_varargs",
                    returnType: createNormalizedType({ name: "none" }),
                    parameters: [
                        createNormalizedParameter({
                            name: "format",
                            type: createNormalizedType({ name: "utf8" }),
                        }),
                        createNormalizedParameter({ name: "..." }),
                    ],
                }),
                createNormalizedFunction({
                    name: "normal",
                    cIdentifier: "gtk_normal",
                    returnType: createNormalizedType({ name: "none" }),
                }),
            ];

            generator.generate(functions);

            const code = getOutput(file);
            expect(code).toContain("withVarargs");
            expect(code).toContain("format: string");
            expect(code).toContain("...args: Arg[]");
            expect(code).toContain("normal");
        });
    });
});
