import { describe, expect, it } from "vitest";
import { fileBuilder } from "../../../src/builders/file-builder.js";
import { stringify } from "../../../src/builders/stringify.js";
import { AliasGenerator } from "../../../src/ffi/generators/alias.js";
import { GirAlias } from "../../../src/gir/model/alias.js";
import { createNormalizedType } from "../../fixtures/gir-fixtures.js";

function createAlias(
    name: string,
    target: ReturnType<typeof createNormalizedType>,
    overrides: Partial<{ namespace: string; doc: string }> = {},
): GirAlias {
    const namespace = overrides.namespace ?? "Gtk";
    return new GirAlias({
        name,
        qualifiedName: `${namespace}.${name}`,
        cType: `${namespace}${name}`,
        targetType: target,
        doc: overrides.doc,
    });
}

function createTestSetup(namespace = "Gtk") {
    const file = fileBuilder();
    const generator = new AliasGenerator(file, { namespace });
    return { file, generator };
}

function getOutput(file: ReturnType<typeof fileBuilder>): string {
    return stringify(file);
}

describe("AliasGenerator", () => {
    describe("constructor", () => {
        it("creates generator with file builder and options", () => {
            const { generator } = createTestSetup();
            expect(generator).toBeInstanceOf(AliasGenerator);
        });
    });

    describe("addAliases", () => {
        it("emits an exported type alias for a numeric target", () => {
            const { file, generator } = createTestSetup();

            generator.addAliases([createAlias("Allocation", createNormalizedType({ name: "gint" }))]);

            expect(getOutput(file)).toContain("export type Allocation = number");
        });

        it("emits a string alias for a utf8 target", () => {
            const { file, generator } = createTestSetup();

            generator.addAliases([createAlias("Text", createNormalizedType({ name: "utf8" }))]);

            expect(getOutput(file)).toContain("export type Text = string");
        });

        it("emits a boolean alias for a gboolean target", () => {
            const { file, generator } = createTestSetup();

            generator.addAliases([createAlias("Flag", createNormalizedType({ name: "gboolean" }))]);

            expect(getOutput(file)).toContain("export type Flag = boolean");
        });

        it("emits a void alias for a none target", () => {
            const { file, generator } = createTestSetup();

            generator.addAliases([createAlias("Nothing", createNormalizedType({ name: "none" }))]);

            expect(getOutput(file)).toContain("export type Nothing = void");
        });

        it("emits an unknown alias for a gpointer target", () => {
            const { file, generator } = createTestSetup();

            generator.addAliases([createAlias("Handle", createNormalizedType({ name: "gpointer" }))]);

            expect(getOutput(file)).toContain("export type Handle = unknown");
        });

        it("emits an unknown alias for a gconstpointer target", () => {
            const { file, generator } = createTestSetup();

            generator.addAliases([createAlias("ConstHandle", createNormalizedType({ name: "gconstpointer" }))]);

            expect(getOutput(file)).toContain("export type ConstHandle = unknown");
        });

        it("emits an unknown array alias for an array target", () => {
            const { file, generator } = createTestSetup();

            generator.addAliases([
                createAlias(
                    "WidgetList",
                    createNormalizedType({ name: "Gtk.Widget", isArray: true, elementType: createNormalizedType() }),
                ),
            ]);

            expect(getOutput(file)).toContain("export type WidgetList = unknown[]");
        });

        it("emits an unknown alias for an unmappable record target", () => {
            const { file, generator } = createTestSetup();

            generator.addAliases([createAlias("WidgetRef", createNormalizedType({ name: "Gtk.Widget" }))]);

            expect(getOutput(file)).toContain("export type WidgetRef = unknown");
        });

        it("includes documentation in the emitted alias", () => {
            const { file, generator } = createTestSetup();

            generator.addAliases([
                createAlias("Allocation", createNormalizedType({ name: "gint" }), { doc: "A rectangle allocation." }),
            ]);

            expect(getOutput(file)).toContain("A rectangle allocation.");
        });

        it("emits multiple aliases in one pass", () => {
            const { file, generator } = createTestSetup();

            generator.addAliases([
                createAlias("First", createNormalizedType({ name: "gint" })),
                createAlias("Second", createNormalizedType({ name: "utf8" })),
            ]);

            const code = getOutput(file);
            expect(code).toContain("export type First = number");
            expect(code).toContain("export type Second = string");
        });

        it("skips suppressed aliases in the GObject namespace", () => {
            const { file, generator } = createTestSetup("GObject");

            generator.addAliases([
                createAlias("Type", createNormalizedType({ name: "gint" }), { namespace: "GObject" }),
                createAlias("Keep", createNormalizedType({ name: "gint" }), { namespace: "GObject" }),
            ]);

            const code = getOutput(file);
            expect(code).not.toContain("export type Type =");
            expect(code).toContain("export type Keep = number");
        });

        it("does not suppress a Type alias outside the GObject namespace", () => {
            const { file, generator } = createTestSetup("Gtk");

            generator.addAliases([createAlias("Type", createNormalizedType({ name: "gint" }))]);

            expect(getOutput(file)).toContain("export type Type = number");
        });

        it("emits nothing for an empty alias list", () => {
            const { file, generator } = createTestSetup();

            generator.addAliases([]);

            expect(getOutput(file).trim()).toBe("");
        });
    });

    describe("hasOverrides", () => {
        it("returns false for namespaces without type overrides", () => {
            expect(AliasGenerator.hasOverrides("Gtk")).toBe(false);
            expect(AliasGenerator.hasOverrides("GObject")).toBe(false);
        });
    });
});
