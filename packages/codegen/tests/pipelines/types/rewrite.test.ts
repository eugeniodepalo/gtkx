import { Project, type SourceFile } from "ts-morph";
import { describe, expect, it } from "vitest";
import {
    loadAndRewrite,
    rewriteEnumsToConstObjects,
    rewriteModuleKeywordToNamespace,
    unwrapOuterNamespace,
} from "../../../src/pipelines/types/rewrite.js";

function sourceFor(content: string): SourceFile {
    const project = new Project({ useInMemoryFileSystem: true, skipFileDependencyResolution: true });
    return project.createSourceFile("node-foo-1.0.d.ts", content, { overwrite: true });
}

describe("unwrapOuterNamespace", () => {
    it("lifts namespace contents to top level with export keyword", () => {
        const source = sourceFor(
            [
                "export namespace foo {",
                "    enum Status { OK, FAIL }",
                "    class Bar {}",
                "    interface Baz { x: number; }",
                "}",
                "export default foo;",
            ].join("\n"),
        );

        unwrapOuterNamespace(source);
        const text = source.getFullText();

        expect(text).toContain("export enum Status");
        expect(text).toContain("export class Bar");
        expect(text).toContain("export interface Baz");
        expect(text).not.toMatch(/export\s+namespace\s+foo\s*\{/);
        expect(text).not.toContain("export default foo");
    });

    it("preserves statements already carrying an export keyword", () => {
        const source = sourceFor(
            ["export namespace foo {", "    export const SIZE: number;", "    enum Tag { A }", "}"].join("\n"),
        );

        unwrapOuterNamespace(source);
        const text = source.getFullText();

        expect(text).toContain("export const SIZE: number;");
        expect(text).toContain("export enum Tag");
        expect(text).not.toMatch(/export\s+export/);
    });

    it("leaves files without an outer namespace untouched", () => {
        const source = sourceFor(["export enum Already { A, B }", "export class Other {}"].join("\n"));
        const before = source.getFullText();

        unwrapOuterNamespace(source);

        expect(source.getFullText()).toBe(before);
    });

    it("ignores non-exported module declarations", () => {
        const source = sourceFor(["namespace internal {", "    interface Hidden {}", "}"].join("\n"));
        const before = source.getFullText();

        unwrapOuterNamespace(source);

        expect(source.getFullText()).toBe(before);
    });
});

describe("rewriteEnumsToConstObjects", () => {
    it("replaces top-level enums with const + type pair", () => {
        const source = sourceFor("export enum Status { OK, FAIL }");

        rewriteEnumsToConstObjects(source);
        const text = source.getFullText();

        expect(text).toContain("export const Status: {");
        expect(text).toContain("readonly OK: 0;");
        expect(text).toContain("readonly FAIL: 1;");
        expect(text).toContain("export type Status = (typeof Status)[keyof typeof Status];");
        expect(text).not.toMatch(/\benum\b/);
    });

    it("preserves explicit numeric values verbatim", () => {
        const source = sourceFor(
            ["export enum Flags {", "    NONE = 0,", "    READ = 1,", "    WRITE = 2,", "    EXEC = 4,", "}"].join(
                "\n",
            ),
        );

        rewriteEnumsToConstObjects(source);
        const text = source.getFullText();

        expect(text).toContain("readonly NONE: 0;");
        expect(text).toContain("readonly READ: 1;");
        expect(text).toContain("readonly WRITE: 2;");
        expect(text).toContain("readonly EXEC: 4;");
    });

    it("preserves string-valued enum members", () => {
        const source = sourceFor(["export enum Color {", '    RED = "red",', '    BLUE = "blue",', "}"].join("\n"));

        rewriteEnumsToConstObjects(source);
        const text = source.getFullText();

        expect(text).toContain('readonly RED: "red";');
        expect(text).toContain('readonly BLUE: "blue";');
    });

    it("drops export keyword when the original enum had none", () => {
        const source = sourceFor("enum Internal { ONE, TWO }");

        rewriteEnumsToConstObjects(source);
        const text = source.getFullText();

        expect(text).toContain("const Internal: {");
        expect(text).toContain("type Internal =");
        expect(text).not.toContain("export const Internal");
        expect(text).not.toContain("export type Internal");
    });

    it("handles enums nested inside namespaces", () => {
        const source = sourceFor(["export namespace outer {", "    enum Nested { A, B }", "}"].join("\n"));

        rewriteEnumsToConstObjects(source);
        const text = source.getFullText();

        expect(text).toContain("const Nested: {");
        expect(text).toContain("readonly A: 0;");
        expect(text).not.toMatch(/\benum\s+Nested\b/);
    });
});

describe("rewriteModuleKeywordToNamespace", () => {
    it("rewrites bare `module Foo {` to `namespace Foo {`", () => {
        const input = "module Foo {\n}";
        expect(rewriteModuleKeywordToNamespace(input)).toBe("namespace Foo {\n}");
    });

    it("rewrites `export module Foo {` to `export namespace Foo {`", () => {
        const input = "export module Foo {\n}";
        expect(rewriteModuleKeywordToNamespace(input)).toBe("export namespace Foo {\n}");
    });

    it("preserves leading indentation", () => {
        const input = "    export module Nested {\n    }";
        expect(rewriteModuleKeywordToNamespace(input)).toBe("    export namespace Nested {\n    }");
    });

    it("does not touch declare module declarations or import statements", () => {
        const input = ["import './x.js';", "declare module 'pkg' {", "}"].join("\n");
        expect(rewriteModuleKeywordToNamespace(input)).toBe(input);
    });
});

describe("loadAndRewrite", () => {
    it("applies unwrap, enum rewrite, and import rewrite in order", () => {
        const raw = [
            "import './node-foo-1.0-import.d.ts';",
            "import type GObject from './node-gobject-2.0.js';",
            "",
            "export namespace foo {",
            "    enum Status { OK, FAIL }",
            "    class Bar extends GObject.Object {}",
            "}",
            "export default foo;",
        ].join("\n");

        const rewritten = loadAndRewrite(new Map([["node-foo-1.0.d.ts", raw]]));
        expect(rewritten).toHaveLength(1);
        const file = rewritten[0];
        if (!file) throw new Error("missing rewritten file");
        expect(file.namespace).toBe("foo");
        const text = file.sourceFile.getFullText();

        expect(text).not.toContain("node-foo-1.0-import.d.ts");
        expect(text).toContain("@gtkx/ffi/gobject");
        expect(text).toContain("export const Status: {");
        expect(text).toContain("readonly OK: 0;");
        expect(text).toContain("readonly FAIL: 1;");
        expect(text).toContain("export type Status = (typeof Status)[keyof typeof Status];");
        expect(text).toContain("export class Bar extends GObject.Object");
        expect(text).not.toMatch(/export\s+namespace\s+foo\s*\{/);
        expect(text).not.toContain("export default foo");
    });

    it("skips ts-for-gir ambient and import-shim files", () => {
        const rewritten = loadAndRewrite(
            new Map([
                ["node-ambient.d.ts", "declare module 'node-gtk' {}"],
                ["node-foo-1.0-import.d.ts", "// shim"],
                ["node-gtk.d.ts", "declare const gi: any;"],
            ]),
        );

        expect(rewritten).toHaveLength(0);
    });
});
