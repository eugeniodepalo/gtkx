import { describe, expect, it } from "vitest";
import { fileBuilder, stringify } from "../../../src/builders/index.js";
import { RegistryGenerator } from "../../../src/react/generators/registry.js";

function generateCode(namespaceNames: string[] = ["Gtk"]): string {
    const file = fileBuilder();
    const generator = new RegistryGenerator(namespaceNames);
    generator.generate(file);
    return stringify(file);
}

describe("RegistryGenerator", () => {
    describe("constructor", () => {
        it("creates generator with namespace names", () => {
            const generator = new RegistryGenerator(["Gtk"]);
            expect(generator).toBeInstanceOf(RegistryGenerator);
        });
    });

    describe("generate", () => {
        it("produces non-empty output", () => {
            const code = generateCode();
            expect(code.length).toBeGreaterThan(0);
        });

        it("adds file comment", () => {
            const code = generateCode();
            expect(code).toContain("Generated namespace registry");
        });

        it("adds Namespace type alias", () => {
            const code = generateCode();
            expect(code).toContain("type Namespace = Record<string, unknown>");
        });

        it("adds NAMESPACE_REGISTRY constant", () => {
            const code = generateCode();
            expect(code).toContain("NAMESPACE_REGISTRY");
        });

        it("exports NAMESPACE_REGISTRY", () => {
            const code = generateCode();
            expect(code).toContain("export const NAMESPACE_REGISTRY");
        });

        it("types NAMESPACE_REGISTRY as [string, Namespace][]", () => {
            const code = generateCode();
            expect(code).toContain("[string, Namespace][]");
        });

        it("includes namespace import for single namespace", () => {
            const code = generateCode(["Gtk"]);
            expect(code).toContain("* as Gtk");
            expect(code).toContain("@gtkx/ffi/gtk");
        });

        it("includes namespace imports for multiple namespaces", () => {
            const code = generateCode(["Gtk", "Gdk", "Gio"]);
            expect(code).toContain("* as Gtk");
            expect(code).toContain("* as Gdk");
            expect(code).toContain("* as Gio");
        });

        it("includes namespace entries in registry array", () => {
            const code = generateCode(["Gtk"]);
            expect(code).toContain('["Gtk", Gtk]');
        });

        it("includes all namespace entries in registry array", () => {
            const code = generateCode(["Gtk", "Adw", "Gio"]);
            expect(code).toContain('["Gtk", Gtk]');
            expect(code).toContain('["Adw", Adw]');
            expect(code).toContain('["Gio", Gio]');
        });

        it("sorts namespaces by length descending then alphabetically", () => {
            const code = generateCode(["Gtk", "GObject", "Gio"]);

            const gobjectIndex = code.indexOf('["GObject"');
            const gtkIndex = code.indexOf('["Gtk"');
            const gioIndex = code.indexOf('["Gio"');

            expect(gobjectIndex).toBeLessThan(gioIndex);
            expect(gioIndex).toBeLessThan(gtkIndex);
        });

        it("handles empty namespace list", () => {
            const code = generateCode([]);
            expect(code).toContain("NAMESPACE_REGISTRY");
            expect(code).toContain("[]");
        });

        it("handles single namespace", () => {
            const code = generateCode(["Adw"]);
            expect(code).toContain('["Adw", Adw]');
        });
    });

    describe("namespace import paths", () => {
        it("imports namespaces from generated FFI modules", () => {
            const code = generateCode(["Gtk"]);
            expect(code).toContain("@gtkx/ffi/gtk");
        });
    });

    describe("integration", () => {
        it("generates valid TypeScript structure", () => {
            const code = generateCode(["Gtk", "Gdk", "Gio", "GObject", "Pango"]);
            expect(code).toContain("type Namespace");
            expect(code).toContain("export const NAMESPACE_REGISTRY");
        });
    });
});
