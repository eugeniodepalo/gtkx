import { describe, expect, it } from "vitest";
import {
    loadAndRewrite,
    type NamespaceAsyncMembers,
    rewriteAsyncSignatures,
    rewriteEnumsToConstObjects,
    rewriteGTypeDeclaration,
    rewriteModuleKeywordToNamespace,
    stripEventEmitterSignalOverloads,
    stripSignalActionMethods,
    unwrapOuterNamespace,
} from "../../../src/pipelines/types/rewrite.js";

describe("unwrapOuterNamespace", () => {
    it("lifts namespace contents to top level with export keyword", () => {
        const text = unwrapOuterNamespace(
            [
                "export namespace foo {",
                "    enum Status { OK, FAIL }",
                "    class Bar {}",
                "    interface Baz { x: number; }",
                "}",
                "export default foo;",
            ].join("\n"),
        );

        expect(text).toContain("export enum Status");
        expect(text).toContain("export class Bar");
        expect(text).toContain("export interface Baz");
        expect(text).not.toMatch(/export\s+namespace\s+foo\s*\{/);
        expect(text).not.toContain("export default foo");
    });

    it("preserves statements already carrying an export keyword", () => {
        const text = unwrapOuterNamespace(
            ["export namespace foo {", "    export const SIZE: number;", "    enum Tag { A }", "}"].join("\n"),
        );

        expect(text).toContain("export const SIZE: number;");
        expect(text).toContain("export enum Tag");
        expect(text).not.toMatch(/export\s+export/);
    });

    it("leaves files without an outer namespace untouched", () => {
        const before = ["export enum Already { A, B }", "export class Other {}"].join("\n");
        expect(unwrapOuterNamespace(before)).toBe(before);
    });

    it("ignores non-exported module declarations", () => {
        const before = ["namespace internal {", "    interface Hidden {}", "}"].join("\n");
        expect(unwrapOuterNamespace(before)).toBe(before);
    });
});

describe("rewriteEnumsToConstObjects", () => {
    it("replaces top-level enums with const + type pair", () => {
        const text = rewriteEnumsToConstObjects("export enum Status { OK, FAIL }");

        expect(text).toContain("export const Status: {");
        expect(text).toContain("readonly OK: 0;");
        expect(text).toContain("readonly FAIL: 1;");
        expect(text).toContain("export type Status = (typeof Status)[keyof typeof Status];");
        expect(text).not.toMatch(/\benum\b/);
    });

    it("preserves explicit numeric values verbatim", () => {
        const text = rewriteEnumsToConstObjects(
            ["export enum Flags {", "    NONE = 0,", "    READ = 1,", "    WRITE = 2,", "    EXEC = 4,", "}"].join(
                "\n",
            ),
        );

        expect(text).toContain("readonly NONE: 0;");
        expect(text).toContain("readonly READ: 1;");
        expect(text).toContain("readonly WRITE: 2;");
        expect(text).toContain("readonly EXEC: 4;");
    });

    it("preserves string-valued enum members", () => {
        const text = rewriteEnumsToConstObjects(
            ["export enum Color {", '    RED = "red",', '    BLUE = "blue",', "}"].join("\n"),
        );

        expect(text).toContain('readonly RED: "red";');
        expect(text).toContain('readonly BLUE: "blue";');
    });

    it("drops export keyword when the original enum had none", () => {
        const text = rewriteEnumsToConstObjects("enum Internal { ONE, TWO }");

        expect(text).toContain("const Internal: {");
        expect(text).toContain("type Internal =");
        expect(text).not.toContain("export const Internal");
        expect(text).not.toContain("export type Internal");
    });

    it("handles enums nested inside namespaces", () => {
        const text = rewriteEnumsToConstObjects(
            ["export namespace outer {", "    enum Nested { A, B }", "}"].join("\n"),
        );

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

describe("rewriteGTypeDeclaration", () => {
    it("rewrites the phantom-object GType alias to a branded number", () => {
        const input = [
            "export type GType<T = unknown> = {",
            "    __type__(arg: never): T",
            "    name: string",
            "};",
        ].join("\n");

        expect(rewriteGTypeDeclaration(input)).toBe(
            "export type GType<T = unknown> = number & { readonly __gtype__?: T };",
        );
    });

    it("retypes the TYPE_INVALID bigint literal to GType", () => {
        expect(rewriteGTypeDeclaration("export let TYPE_INVALID   : 0n")).toBe("export let TYPE_INVALID   : GType");
    });

    it("leaves sources without the GType declaration untouched", () => {
        const before = "export type TClosure<R = any, P = any> = (...args: P[]) => R;";
        expect(rewriteGTypeDeclaration(before)).toBe(before);
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
        const text = file.content;

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

describe("rewriteAsyncSignatures", () => {
    it("retypes a class async method to Promise and drops its callback parameter", () => {
        const source = [
            "export class InputStream {",
            "    readAsync(ioPriority: number, cancellable: Cancellable | null, callback: AsyncReadyCallback | null): void",
            "    readFinish(result: AsyncResult): number",
            "}",
        ].join("\n");
        const asyncMembers: NamespaceAsyncMembers = new Map([
            ["InputStream", [{ asyncMember: "readAsync", finishMember: "readFinish" }]],
        ]);

        const result = rewriteAsyncSignatures(source, asyncMembers);

        expect(result).toContain("readAsync(ioPriority: number, cancellable: Cancellable | null): Promise<number>");
        expect(result).not.toContain("callback: AsyncReadyCallback");
        expect(result).toContain("readFinish(result: AsyncResult): number");
    });

    it("retypes a standalone async function to Promise", () => {
        const source = [
            "export function busGet(busType: BusType, cancellable: Cancellable | null, callback: AsyncReadyCallback | null): void",
            "export function busGetFinish(res: AsyncResult): DBusConnection",
        ].join("\n");
        const asyncMembers: NamespaceAsyncMembers = new Map([
            ["", [{ asyncMember: "busGet", finishMember: "busGetFinish" }]],
        ]);

        const result = rewriteAsyncSignatures(source, asyncMembers);

        expect(result).toContain(
            "export function busGet(busType: BusType, cancellable: Cancellable | null): Promise<DBusConnection>",
        );
        expect(result).toContain("export function busGetFinish(res: AsyncResult): DBusConnection");
    });

    it("retypes an interface async method within its class block", () => {
        const source = [
            "export class AsyncInitable {",
            "    initAsync(ioPriority: number, callback: AsyncReadyCallback | null): void",
            "    initFinish(res: AsyncResult): boolean",
            "}",
        ].join("\n");
        const asyncMembers: NamespaceAsyncMembers = new Map([
            ["AsyncInitable", [{ asyncMember: "initAsync", finishMember: "initFinish" }]],
        ]);

        const result = rewriteAsyncSignatures(source, asyncMembers);

        expect(result).toContain("initAsync(ioPriority: number): Promise<boolean>");
    });

    it("leaves the source untouched when no async members are supplied", () => {
        const source = "export class Foo {\n    bar(): void\n}";
        expect(rewriteAsyncSignatures(source, undefined)).toBe(source);
        expect(rewriteAsyncSignatures(source, new Map())).toBe(source);
    });

    it("leaves the async method intact when its finish member is absent", () => {
        const source = ["export class Stream {", "    flushAsync(callback: AsyncReadyCallback | null): void", "}"].join(
            "\n",
        );
        const asyncMembers: NamespaceAsyncMembers = new Map([
            ["Stream", [{ asyncMember: "flushAsync", finishMember: "flushFinish" }]],
        ]);

        expect(rewriteAsyncSignatures(source, asyncMembers)).toBe(source);
    });
});

describe("stripEventEmitterSignalOverloads", () => {
    it("corrects on/once/off return type to the declaring class and keeps the members", () => {
        const source = [
            "export class Button {",
            '    on(sigName: "clicked", callback: (...args: any[]) => void, after?: boolean): NodeJS.EventEmitter',
            '    once(sigName: "clicked", callback: (...args: any[]) => void, after?: boolean): NodeJS.EventEmitter',
            '    off(sigName: "clicked", callback: (...args: any[]) => void): NodeJS.EventEmitter',
            "}",
        ].join("\n");

        const result = stripEventEmitterSignalOverloads(source);

        expect(result).toContain('on(sigName: "clicked", callback: (...args: any[]) => void, after?: boolean): Button');
        expect(result).toContain(
            'once(sigName: "clicked", callback: (...args: any[]) => void, after?: boolean): Button',
        );
        expect(result).toContain('off(sigName: "clicked", callback: (...args: any[]) => void): Button');
        expect(result).not.toContain("NodeJS.EventEmitter");
    });

    it("corrects on/once/off return type within an interface block", () => {
        const source = [
            "export interface Editable {",
            '    on(sigName: "changed", callback: (...args: any[]) => void, after?: boolean): NodeJS.EventEmitter',
            "}",
        ].join("\n");

        expect(stripEventEmitterSignalOverloads(source)).toContain(
            'on(sigName: "changed", callback: (...args: any[]) => void, after?: boolean): Editable',
        );
    });

    it("removes the synthetic _init, gTypeInstance, __gtype__, and notify::__gtype__ lines", () => {
        const source = [
            "export class Widget {",
            "    _init(config?: Widget.ConstructorProperties): void",
            "    gTypeInstance: TypeInstance",
            "    __gtype__: number",
            '    connect(sigName: "notify::__gtype__", callback: (...args: any[]) => void): number',
            "    realMethod(): void",
            "}",
        ].join("\n");

        const result = stripEventEmitterSignalOverloads(source);

        expect(result).not.toContain("_init(config?:");
        expect(result).not.toContain("gTypeInstance: TypeInstance");
        expect(result).not.toContain("__gtype__: number");
        expect(result).not.toContain("notify::__gtype__");
        expect(result).toContain("realMethod(): void");
    });

    it("keeps the disconnect overload", () => {
        const source = ["export class Widget {", "    disconnect(id: number): void", "}"].join("\n");

        expect(stripEventEmitterSignalOverloads(source)).toContain("disconnect(id: number): void");
    });
});

describe("stripSignalActionMethods", () => {
    it("removes signal-action method declarations scoped to their owner block", () => {
        const source = [
            "export class Button {",
            "    /** Activates the button. */",
            "    clicked(): void",
            "    realMethod(): void",
            "}",
            "export class Label {",
            "    clicked(): void",
            "}",
        ].join("\n");
        const stripped = new Map([["Button", new Set(["clicked"])]]);

        const result = stripSignalActionMethods(source, stripped);

        const buttonBody = result.slice(result.indexOf("class Button"), result.indexOf("class Label"));
        expect(buttonBody).not.toContain("clicked(): void");
        expect(buttonBody).toContain("realMethod(): void");
        expect(result.slice(result.indexOf("class Label"))).toContain("clicked(): void");
    });

    it("leaves the source untouched when no signal-action methods are supplied", () => {
        const source = "export class Foo {\n    bar(): void\n}";
        expect(stripSignalActionMethods(source, undefined)).toBe(source);
        expect(stripSignalActionMethods(source, new Map())).toBe(source);
    });
});
