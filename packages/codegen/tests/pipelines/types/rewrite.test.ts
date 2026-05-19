import { describe, expect, it } from "vitest";
import {
    type HashTableMemberEntry,
    honorConflictSignatures,
    loadAndRewrite,
    type MethodShadowRename,
    type NamespaceAsyncMembers,
    type NamespaceConnectRenames,
    type NamespaceFieldNames,
    type NamespaceHashTableMembers,
    type NamespaceMethodShadowRenames,
    namespaceFromRawFilename,
    relaxGtypeConstants,
    relaxMultiReturnTuples,
    relaxNumericConstants,
    relaxOptionalInoutReturns,
    renameConflictingConnectMethods,
    renameShadowedMethods,
    rewriteAsyncSignatures,
    rewriteDefaultImportsToNamespace,
    rewriteEnumsToConstObjects,
    rewriteGTypeDeclaration,
    rewriteHashTableTypes,
    rewriteModuleKeywordToNamespace,
    rewriteNamespaceDeclarations,
    stripAnonymousCompositeClasses,
    stripClassFields,
    stripEventEmitterSignalOverloads,
    stripGtypeStructClasses,
    stripPositionalConstructors,
    stripSignalActionMethods,
    stripUntaggedPositionalConstructors,
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

describe("rewriteEnumsToConstObjects (1)", () => {
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
});

describe("rewriteEnumsToConstObjects (2)", () => {
    it("handles enums nested inside namespaces", () => {
        const text = rewriteEnumsToConstObjects(
            ["export namespace outer {", "    enum Nested { A, B }", "}"].join("\n"),
        );

        expect(text).toContain("const Nested: {");
        expect(text).toContain("readonly A: 0;");
        expect(text).not.toMatch(/\benum\s+Nested\b/);
    });

    it("widens the type alias to number for bitfield enums", () => {
        const text = rewriteEnumsToConstObjects(
            "export enum DragAction { COPY, MOVE }",
            undefined,
            undefined,
            new Set(["DragAction"]),
        );

        expect(text).toContain("export const DragAction: {");
        expect(text).toContain("readonly COPY: 0;");
        expect(text).toContain("export type DragAction = number;");
        expect(text).not.toContain("(typeof DragAction)[keyof typeof DragAction]");
    });

    it("keeps the structural union for enums absent from the bitfield set", () => {
        const text = rewriteEnumsToConstObjects(
            "export enum Orientation { HORIZONTAL, VERTICAL }",
            undefined,
            undefined,
            new Set(["DragAction"]),
        );

        expect(text).toContain("export type Orientation = (typeof Orientation)[keyof typeof Orientation];");
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
    it("rewrites the phantom-object GType alias to number", () => {
        const input = [
            "export type GType<T = unknown> = {",
            "    __type__(arg: never): T",
            "    name: string",
            "};",
        ].join("\n");

        expect(rewriteGTypeDeclaration(input)).toBe("export type GType<T = unknown> = number;");
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

describe("rewriteAsyncSignatures (1)", () => {
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
});

describe("rewriteAsyncSignatures (2)", () => {
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

describe("stripEventEmitterSignalOverloads (1)", () => {
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
});

describe("stripEventEmitterSignalOverloads (2)", () => {
    it("removes the synthetic _init, gTypeInstance, and notify::__gtype__ lines, keeping __gtype__", () => {
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
        expect(result).not.toContain("notify::__gtype__");
        expect(result).toContain("__gtype__: number");
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

describe("namespaceFromRawFilename", () => {
    it("extracts the lowercase namespace from a per-namespace raw filename", () => {
        expect(namespaceFromRawFilename("node-glib-2.0.d.ts")).toBe("glib");
        expect(namespaceFromRawFilename("node-gtk-4.0.d.ts")).toBe("gtk");
    });

    it("returns null for companion import shims", () => {
        expect(namespaceFromRawFilename("node-glib-2.0-import.d.ts")).toBeNull();
    });

    it("returns null for files that do not match the per-namespace shape", () => {
        expect(namespaceFromRawFilename("node-ambient.d.ts")).toBeNull();
        expect(namespaceFromRawFilename("node-gtk.d.ts")).toBeNull();
        expect(namespaceFromRawFilename("index.d.ts")).toBeNull();
    });
});

describe("rewriteNamespaceDeclarations", () => {
    it("rewrites relative node-<ns>-<ver>.js imports to @gtkx/ffi/<ns>", () => {
        const source = "import type Gdk from './node-gdk-4.0.js';";
        expect(rewriteNamespaceDeclarations(source)).toBe("import type Gdk from '@gtkx/ffi/gdk';");
    });

    it("preserves the trailing quote and semicolon style of the import line", () => {
        const source = 'import type GObject from "./node-gobject-2.0.js"';
        expect(rewriteNamespaceDeclarations(source)).toBe('import type GObject from "@gtkx/ffi/gobject"');
    });

    it("removes the per-namespace import shim lines", () => {
        const source = ["import './node-glib-2.0-import.d.ts';", "export const X: number;"].join("\n");
        const result = rewriteNamespaceDeclarations(source);

        expect(result).not.toContain("node-glib-2.0-import.d.ts");
        expect(result).toContain("export const X: number;");
    });

    it("leaves unrelated imports untouched", () => {
        const source = "import type { Foo } from './other.js';";
        expect(rewriteNamespaceDeclarations(source)).toBe(source);
    });
});

describe("rewriteDefaultImportsToNamespace", () => {
    it("converts a default ffi import into a namespace import", () => {
        const source = "import type Gdk from '@gtkx/ffi/gdk';";
        expect(rewriteDefaultImportsToNamespace(source)).toBe("import type * as Gdk from '@gtkx/ffi/gdk';");
    });

    it("rewrites every default ffi import in the file", () => {
        const source = ["import type Gdk from '@gtkx/ffi/gdk';", 'import type GLib from "@gtkx/ffi/glib";'].join("\n");
        const result = rewriteDefaultImportsToNamespace(source);

        expect(result).toContain("import type * as Gdk from '@gtkx/ffi/gdk';");
        expect(result).toContain('import type * as GLib from "@gtkx/ffi/glib";');
    });

    it("leaves non-ffi default imports untouched", () => {
        const source = "import type Foo from './foo.js';";
        expect(rewriteDefaultImportsToNamespace(source)).toBe(source);
    });
});

describe("rewriteEnumsToConstObjects error domains (1)", () => {
    it("emits a Symbol.hasInstance member for error-domain enums", () => {
        const text = rewriteEnumsToConstObjects(
            "export enum FileError { EXIST, ACCES }",
            undefined,
            new Set(["FileError"]),
        );

        expect(text).toContain("export const FileError: {");
        expect(text).toContain("readonly EXIST: 0;");
        expect(text).toContain("[Symbol.hasInstance]");
        expect(text).toContain("export type FileError = (typeof FileError)[Exclude<keyof typeof FileError, symbol>];");
    });

    it("uses real GIR member values when supplied and resets the running ordinal", () => {
        const enumValues = new Map([["Mask", new Map([["FIRST", 8]])]]);
        const text = rewriteEnumsToConstObjects(
            ["export enum Mask {", "    FIRST,", "    SECOND,", "}"].join("\n"),
            enumValues,
        );

        expect(text).toContain("readonly FIRST: 8;");
        expect(text).toContain("readonly SECOND: 9;");
    });

    it("resolves TODO_-prefixed member names against the unprefixed GIR value", () => {
        const enumValues = new Map([["Kind", new Map([["DELETE", 3]])]]);
        const text = rewriteEnumsToConstObjects("export enum Kind { TODO_DELETE }", enumValues);

        expect(text).toContain("readonly TODO_DELETE: 3;");
    });

    it("keeps the export prefix attached when a JSDoc block precedes the enum keyword", () => {
        const text = rewriteEnumsToConstObjects(["export /** Doc block. */ enum Tag { A, B }"].join("\n"));

        expect(text).toContain("/** Doc block. */");
        expect(text).toContain("export const Tag: {");
    });

    it("strips JSDoc and line comments between enum members", () => {
        const text = rewriteEnumsToConstObjects(
            ["export enum Doced {", "    /** first member */", "    A,", "    B, // trailing note", "}"].join("\n"),
        );

        expect(text).toContain("readonly A: 0;");
        expect(text).toContain("readonly B: 1;");
        expect(text).not.toContain("first member");
        expect(text).not.toContain("trailing note");
    });
});

describe("rewriteEnumsToConstObjects error domains (2)", () => {
    it("leaves sources without an enum untouched", () => {
        const source = "export class Foo {}";
        expect(rewriteEnumsToConstObjects(source)).toBe(source);
    });
});

describe("relaxGtypeConstants", () => {
    it("relaxes a GType-typed uppercase constant to number", () => {
        expect(relaxGtypeConstants("export const TYPE_FLAG_RESERVED_ID_BIT: GType")).toBe(
            "export const TYPE_FLAG_RESERVED_ID_BIT: number",
        );
    });

    it("leaves non-GType constants untouched", () => {
        const source = "export const SIZE: number";
        expect(relaxGtypeConstants(source)).toBe(source);
    });
});

describe("relaxNumericConstants", () => {
    it("relaxes a named numeric constant typed after an opaque GIR type", () => {
        const result = relaxNumericConstants("export const PRIORITY: SomeOpaqueType", new Set(["PRIORITY"]));
        expect(result).toBe("export const PRIORITY: number");
    });

    it("leaves constants already typed as a primitive untouched", () => {
        const source = "export const COUNT: number";
        expect(relaxNumericConstants(source, new Set(["COUNT"]))).toBe(source);
    });

    it("leaves constants absent from the relax set untouched", () => {
        const source = "export const OTHER: Opaque";
        expect(relaxNumericConstants(source, new Set(["PRIORITY"]))).toBe(source);
    });

    it("returns the source unchanged when no numeric constants are supplied", () => {
        const source = "export const PRIORITY: Opaque";
        expect(relaxNumericConstants(source, undefined)).toBe(source);
        expect(relaxNumericConstants(source, new Set())).toBe(source);
    });
});

describe("relaxMultiReturnTuples", () => {
    it("reduces a labelled multi-return tuple to a same-arity any tuple", () => {
        const source = "    getBounds(): [ /* returnType */ boolean, /* x */ number, /* y */ number ]";
        const result = relaxMultiReturnTuples(source);

        expect(result).toContain("getBounds(): [any, any, any]");
        expect(result).not.toContain("returnType");
    });

    it("leaves sources without a labelled tuple untouched", () => {
        const source = "    getName(): string";
        expect(relaxMultiReturnTuples(source)).toBe(source);
    });
});

describe("relaxOptionalInoutReturns", () => {
    it("widens a return derived from an optional parameter to include null", () => {
        const source = "    lookup(value?: string): /* value */ string\n";
        const result = relaxOptionalInoutReturns(source);

        expect(result).toContain("/* value */ string | null");
    });

    it("leaves the return untouched when the source parameter is required", () => {
        const source = "    lookup(value: string): /* value */ string\n";
        expect(relaxOptionalInoutReturns(source)).toBe(source);
    });

    it("preserves an array suffix while appending null", () => {
        const source = "    items(items?: string): /* items */ string[]\n";
        const result = relaxOptionalInoutReturns(source);

        expect(result).toContain("/* items */ string[] | null");
    });
});

describe("honorConflictSignatures", () => {
    it("rewrites the active member to the signature recorded in the conflict comment", () => {
        const source = [
            "export class Widget {",
            "    // Has conflict: draw(cr: Context): void",
            "    draw(snapshot: Snapshot): boolean",
            "}",
        ].join("\n");

        const result = honorConflictSignatures(source);

        expect(result).toContain("draw(cr: Context): void");
        expect(result).not.toContain("draw(snapshot: Snapshot): boolean");
    });

    it("leaves a body without a conflict comment untouched", () => {
        const source = ["export class Widget {", "    draw(snapshot: Snapshot): boolean", "}"].join("\n");
        expect(honorConflictSignatures(source)).toBe(source);
    });
});

describe("renameConflictingConnectMethods", () => {
    it("renames a colliding GIR connect method within its owner block", () => {
        const source = [
            "export class Socket {",
            "    connect(address: SocketAddress): boolean",
            '    connect(sigName: "ready", callback: (...args: any[]) => void): number',
            "}",
        ].join("\n");
        const renames: NamespaceConnectRenames = new Map([["Socket", "socketConnect"]]);

        const result = renameConflictingConnectMethods(source, renames);

        expect(result).toContain("socketConnect(address: SocketAddress): boolean");
        expect(result).toContain('connect(sigName: "ready", callback: (...args: any[]) => void): number');
    });

    it("returns the source unchanged when no renames are supplied", () => {
        const source = ["export class Socket {", "    connect(a: A): boolean", "}"].join("\n");
        expect(renameConflictingConnectMethods(source, undefined)).toBe(source);
        expect(renameConflictingConnectMethods(source, new Map())).toBe(source);
    });

    it("leaves a class absent from the rename map untouched", () => {
        const source = ["export class Other {", "    connect(a: A): boolean", "}"].join("\n");
        const renames: NamespaceConnectRenames = new Map([["Socket", "socketConnect"]]);
        expect(renameConflictingConnectMethods(source, renames)).toBe(source);
    });
});

describe("renameShadowedMethods", () => {
    it("renames the overload whose arity matches the shadow-rename entry", () => {
        const source = ["export class Child {", "    show(): void", "    show(detailed: boolean): number", "}"].join(
            "\n",
        );
        const rename: MethodShadowRename = { original: "show", renamed: "childShow", arity: 1 };
        const renames: NamespaceMethodShadowRenames = new Map([["Child", [rename]]]);

        const result = renameShadowedMethods(source, renames);

        expect(result).toContain("show(): void");
        expect(result).toContain("childShow(detailed: boolean): number");
    });

    it("renames a zero-arity overload when the entry arity is zero", () => {
        const source = ["export class Child {", "    reset(): void", "    reset(force: boolean): number", "}"].join(
            "\n",
        );
        const rename: MethodShadowRename = { original: "reset", renamed: "childReset", arity: 0 };
        const renames: NamespaceMethodShadowRenames = new Map([["Child", [rename]]]);

        const result = renameShadowedMethods(source, renames);

        expect(result).toContain("childReset(): void");
        expect(result).toContain("reset(force: boolean): number");
    });

    it("returns the source unchanged when no renames are supplied", () => {
        const source = ["export class Child {", "    show(): void", "}"].join("\n");
        expect(renameShadowedMethods(source, undefined)).toBe(source);
        expect(renameShadowedMethods(source, new Map())).toBe(source);
    });
});

describe("stripGtypeStructClasses", () => {
    it("removes the value class declaration for a named gtype-struct", () => {
        const source = [
            "export abstract class WidgetClass {",
            "    parentClass: ObjectClass",
            "}",
            "export interface WidgetClass {",
            "    parentClass: ObjectClass",
            "}",
        ].join("\n");

        const result = stripGtypeStructClasses(source, new Set(["WidgetClass"]));

        expect(result).not.toContain("export abstract class WidgetClass");
        expect(result).toContain("export interface WidgetClass");
    });

    it("returns the source unchanged when no gtype-struct names are supplied", () => {
        const source = "export abstract class WidgetClass {}";
        expect(stripGtypeStructClasses(source, undefined)).toBe(source);
        expect(stripGtypeStructClasses(source, new Set())).toBe(source);
    });

    it("leaves classes absent from the gtype-struct set untouched", () => {
        const source = "export class Widget {}";
        expect(stripGtypeStructClasses(source, new Set(["WidgetClass"]))).toBe(source);
    });
});

describe("stripAnonymousCompositeClasses", () => {
    it("removes synthetic anonymous-union value class declarations", () => {
        const source = [
            "export class _Event__data__union {",
            "    x: number",
            "}",
            "export interface _Event__data__union {",
            "    x: number",
            "}",
        ].join("\n");

        const result = stripAnonymousCompositeClasses(source);

        expect(result).not.toContain("export class _Event__data__union");
        expect(result).toContain("export interface _Event__data__union");
    });

    it("leaves sources without a synthetic composite class untouched", () => {
        const source = "export class RealClass {}";
        expect(stripAnonymousCompositeClasses(source)).toBe(source);
    });
});

describe("stripClassFields", () => {
    it("removes named instance-struct fields from a class body", () => {
        const source = [
            "export class Widget {",
            "    parentInstance: GObject.Object",
            "    priv: WidgetPrivate",
            "    realMethod(): void",
            "}",
        ].join("\n");
        const fieldNames: NamespaceFieldNames = new Map([["Widget", new Set(["parentInstance", "priv"])]]);

        const result = stripClassFields(source, fieldNames);

        expect(result).not.toContain("parentInstance:");
        expect(result).not.toContain("priv:");
        expect(result).toContain("realMethod(): void");
    });

    it("removes an optional field declaration", () => {
        const source = ["export class Widget {", "    cached?: number", "}"].join("\n");
        const fieldNames: NamespaceFieldNames = new Map([["Widget", new Set(["cached"])]]);

        expect(stripClassFields(source, fieldNames)).not.toContain("cached?: number");
    });

    it("returns the source unchanged when no field names are supplied", () => {
        const source = ["export class Widget {", "    priv: WidgetPrivate", "}"].join("\n");
        expect(stripClassFields(source, undefined)).toBe(source);
        expect(stripClassFields(source, new Map())).toBe(source);
    });

    it("skips owners whose field set is empty", () => {
        const source = ["export class Widget {", "    priv: WidgetPrivate", "}"].join("\n");
        const fieldNames: NamespaceFieldNames = new Map([["Widget", new Set()]]);
        expect(stripClassFields(source, fieldNames)).toBe(source);
    });
});

describe("stripPositionalConstructors", () => {
    it("removes a constructor overload preceded by a @constructor JSDoc tag", () => {
        const source = [
            "export class Window {",
            "    /**",
            "     * @constructor",
            "     */",
            "    constructor(title: string)",
            "    constructor(config?: Window.ConstructorProperties)",
            "}",
        ].join("\n");

        const result = stripPositionalConstructors(source);

        expect(result).not.toContain("constructor(title: string)");
        expect(result).toContain("constructor(config?: Window.ConstructorProperties)");
    });

    it("leaves a tagged block whose following member is not a constructor untouched", () => {
        const source = ["export class Window {", "    /** @constructor */", "    notAConstructor(): void", "}"].join(
            "\n",
        );

        expect(stripPositionalConstructors(source)).toContain("notAConstructor(): void");
    });
});

describe("stripUntaggedPositionalConstructors", () => {
    it("removes an untagged positional constructor overload", () => {
        const source = [
            "export class Dialog {",
            "    constructor(title: string)",
            "    constructor(config?: Dialog.ConstructorProperties)",
            "}",
        ].join("\n");

        const result = stripUntaggedPositionalConstructors(source);

        expect(result).not.toContain("constructor(title: string)");
        expect(result).toContain("constructor(config?: Dialog.ConstructorProperties)");
    });

    it("keeps a no-argument constructor and the props-object constructor", () => {
        const source = [
            "export class Dialog {",
            "    constructor()",
            "    constructor(config?: Dialog.ConstructorProperties)",
            "}",
        ].join("\n");

        const result = stripUntaggedPositionalConstructors(source);

        expect(result).toContain("constructor()");
        expect(result).toContain("constructor(config?: Dialog.ConstructorProperties)");
    });
});

describe("rewriteHashTableTypes", () => {
    it("retypes a class method's GLib.HashTable parameter and return to a Map", () => {
        const source = ["export class Settings {", "    listKeys(table: GLib.HashTable): GLib.HashTable", "}"].join(
            "\n",
        );
        const entry: HashTableMemberEntry = {
            member: "listKeys",
            isFunction: false,
            mapType: "Map<string, string>",
        };
        const hashTableMembers: NamespaceHashTableMembers = new Map([["Settings", [entry]]]);

        const result = rewriteHashTableTypes(source, hashTableMembers);

        expect(result).toContain("listKeys(table: Map<string, string>): Map<string, string>");
        expect(result).not.toContain("GLib.HashTable");
    });

    it("retypes a standalone function's bare HashTable token to a Map", () => {
        const source = "export function readTable(): HashTable";
        const entry: HashTableMemberEntry = {
            member: "readTable",
            isFunction: true,
            mapType: "Map<string, number>",
        };
        const hashTableMembers: NamespaceHashTableMembers = new Map([["", [entry]]]);

        const result = rewriteHashTableTypes(source, hashTableMembers);

        expect(result).toContain("readTable(): Map<string, number>");
    });

    it("leaves a member without a HashTable token untouched", () => {
        const source = ["export class Settings {", "    listKeys(): string[]", "}"].join("\n");
        const entry: HashTableMemberEntry = {
            member: "listKeys",
            isFunction: false,
            mapType: "Map<string, string>",
        };
        const hashTableMembers: NamespaceHashTableMembers = new Map([["Settings", [entry]]]);

        expect(rewriteHashTableTypes(source, hashTableMembers)).toBe(source);
    });

    it("returns the source unchanged when no hashtable members are supplied", () => {
        const source = "export class Settings {\n    listKeys(table: GLib.HashTable): void\n}";
        expect(rewriteHashTableTypes(source, undefined)).toBe(source);
        expect(rewriteHashTableTypes(source, new Map())).toBe(source);
    });
});

describe("rewriteAsyncSignatures closure form", () => {
    it("drops a trailing closure parameter on a virtual-method-derived async member", () => {
        const source = [
            "export class Worker {",
            "    runAsync(progress: ProgressCallback, done: GObject.Closure): void",
            "    runFinish(res: AsyncResult): number",
            "}",
        ].join("\n");
        const asyncMembers: NamespaceAsyncMembers = new Map([
            ["Worker", [{ asyncMember: "runAsync", finishMember: "runFinish" }]],
        ]);

        const result = rewriteAsyncSignatures(source, asyncMembers);

        expect(result).toContain("runAsync(progress: ProgressCallback): Promise<number>");
        expect(result).not.toContain("done: GObject.Closure");
    });

    it("drops the user_data parameter alongside the ready callback", () => {
        const source = [
            "export class Stream {",
            "    closeAsync(callback: AsyncReadyCallback | null, userData: any): void",
            "    closeFinish(res: AsyncResult): boolean",
            "}",
        ].join("\n");
        const asyncMembers: NamespaceAsyncMembers = new Map([
            ["Stream", [{ asyncMember: "closeAsync", finishMember: "closeFinish" }]],
        ]);

        const result = rewriteAsyncSignatures(source, asyncMembers);

        expect(result).toContain("closeAsync(): Promise<boolean>");
        expect(result).not.toContain("userData");
    });

    it("leaves an async member with no recognizable callback parameter intact", () => {
        const source = [
            "export class Stream {",
            "    pollAsync(timeout: number): void",
            "    pollFinish(res: AsyncResult): boolean",
            "}",
        ].join("\n");
        const asyncMembers: NamespaceAsyncMembers = new Map([
            ["Stream", [{ asyncMember: "pollAsync", finishMember: "pollFinish" }]],
        ]);

        expect(rewriteAsyncSignatures(source, asyncMembers)).toBe(source);
    });
});

describe("loadAndRewrite with rewrite inputs", () => {
    it("threads per-namespace inputs through the full pipeline", () => {
        const raw = [
            "export namespace gtk {",
            "    enum Align { FILL, START }",
            "    export class Widget {",
            "        priv: WidgetPrivate",
            "        loadAsync(callback: AsyncReadyCallback | null): void",
            "        loadFinish(res: AsyncResult): boolean",
            "    }",
            "}",
            "export default gtk;",
        ].join("\n");

        const rewritten = loadAndRewrite(new Map([["node-gtk-4.0.d.ts", raw]]), {
            enumValues: new Map([["gtk", new Map([["Align", new Map([["FILL", 2]])]])]]),
            classFieldNames: new Map([["gtk", new Map([["Widget", new Set(["priv"])]])]]),
            asyncMembers: new Map([
                ["gtk", new Map([["Widget", [{ asyncMember: "loadAsync", finishMember: "loadFinish" }]]])],
            ]),
        });

        const file = rewritten[0];
        if (!file) throw new Error("missing rewritten file");
        const text = file.content;

        expect(text).toContain("readonly FILL: 2;");
        expect(text).toContain("readonly START: 3;");
        expect(text).not.toContain("priv: WidgetPrivate");
        expect(text).toContain("loadAsync(): Promise<boolean>");
    });

    it("processes multiple namespace files in one pass", () => {
        const rewritten = loadAndRewrite(
            new Map([
                ["node-glib-2.0.d.ts", "export namespace glib {\n    enum E { A }\n}\nexport default glib;"],
                ["node-gio-2.0.d.ts", "export namespace gio {\n    enum F { B }\n}\nexport default gio;"],
            ]),
        );

        expect(rewritten.map((file) => file.namespace).sort()).toEqual(["gio", "glib"]);
    });
});
