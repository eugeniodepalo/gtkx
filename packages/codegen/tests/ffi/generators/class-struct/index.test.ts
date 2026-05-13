import { describe, expect, it } from "vitest";
import { fileBuilder } from "../../../../src/builders/file-builder.js";
import { stringify } from "../../../../src/builders/stringify.js";
import { FfiMapper } from "../../../../src/core/type-system/ffi-mapper.js";
import { ClassStructGenerator } from "../../../../src/ffi/generators/class-struct/index.js";
import {
    createNormalizedCallback,
    createNormalizedField,
    createNormalizedNamespace,
    createNormalizedParameter,
    createNormalizedRecord,
    createNormalizedType,
} from "../../../fixtures/gir-fixtures.js";
import { createMockRepository } from "../../../fixtures/mock-repository.js";

function createTestSetup() {
    const namespaces = new Map<string, ReturnType<typeof createNormalizedNamespace>>();
    const ns = createNormalizedNamespace({ name: "GObject" });
    namespaces.set("GObject", ns);
    const repo = createMockRepository(namespaces);
    const ffiMapper = new FfiMapper(repo as Parameters<typeof FfiMapper>[0], "GObject");
    const file = fileBuilder();
    const options = {
        namespace: "GObject",
        sharedLibrary: "libgobject-2.0.so.0",
        glibLibrary: "libglib-2.0.so.0",
        gobjectLibrary: "libgobject-2.0.so.0",
    };
    const skipMessages: string[] = [];
    const logger = { warning: (msg: string) => skipMessages.push(msg) };
    const generator = new ClassStructGenerator(
        ffiMapper,
        file,
        options,
        repo as Parameters<typeof ClassStructGenerator>[3],
        logger,
    );
    return { generator, file, repo, skipMessages };
}

function gpointerField(name: string): ReturnType<typeof createNormalizedField> {
    return createNormalizedField({ name, type: createNormalizedType({ name: "gpointer", cType: "gpointer" }) });
}

function callbackField(
    name: string,
    callback: ReturnType<typeof createNormalizedCallback>,
): ReturnType<typeof createNormalizedField> {
    return createNormalizedField({
        name,
        type: createNormalizedType({ name: "gpointer", cType: "gpointer" }),
        callback,
    });
}

describe("ClassStructGenerator", () => {
    it("emits an empty stub when the record has no callback fields", () => {
        const { generator, file } = createTestSetup();
        const record = createNormalizedRecord({
            name: "OpaqueClass",
            cType: "GOpaqueClass",
            isGtypeStructFor: "Opaque",
            fields: [gpointerField("padding")],
        });
        expect(generator.generate(record)).toBe(true);
        const output = stringify(file);
        expect(output).toContain("export interface OpaqueClass");
        expect(output).toContain("export const OpaqueClass");
    });

    it("emits a registry exported under the record's normalized name", () => {
        const { generator, file } = createTestSetup();
        const record = createNormalizedRecord({
            name: "ObjectClass",
            cType: "GObjectClass",
            isGtypeStructFor: "Object",
            fields: [
                callbackField(
                    "finalize",
                    createNormalizedCallback({
                        name: "finalize",
                        returnType: createNormalizedType({ name: "none" }),
                        parameters: [],
                    }),
                ),
            ],
        });
        expect(generator.generate(record)).toBe(true);
        const code = stringify(file);
        expect(code).toContain("export const ObjectClass");
        expect(code).toContain('vfuncName: "finalize"');
        expect(code).toContain("returnType: t.void");
    });

    it("computes byte offsets sequentially across pointer-sized callback fields", () => {
        const { generator, file } = createTestSetup();
        const noopCb = createNormalizedCallback({
            name: "noop",
            returnType: createNormalizedType({ name: "none" }),
            parameters: [],
        });
        const record = createNormalizedRecord({
            name: "VTableClass",
            cType: "TestVTableClass",
            isGtypeStructFor: "VTable",
            fields: [callbackField("first", noopCb), callbackField("second", noopCb), callbackField("third", noopCb)],
        });
        expect(generator.generate(record)).toBe(true);
        const code = stringify(file);
        expect(code).toMatch(/first:[\s\S]*?byteOffset: 0,/);
        expect(code).toMatch(/second:[\s\S]*?byteOffset: 8,/);
        expect(code).toMatch(/third:[\s\S]*?byteOffset: 16,/);
    });

    it("camelCases vfunc keys but preserves the snake_case vfuncName diagnostic", () => {
        const { generator, file } = createTestSetup();
        const record = createNormalizedRecord({
            name: "ObjectClass",
            cType: "GObjectClass",
            isGtypeStructFor: "Object",
            fields: [
                callbackField(
                    "set_property",
                    createNormalizedCallback({
                        name: "set_property",
                        returnType: createNormalizedType({ name: "none" }),
                        parameters: [],
                    }),
                ),
            ],
        });
        generator.generate(record);
        const code = stringify(file);
        expect(code).toContain("setProperty:");
        expect(code).toContain('vfuncName: "set_property"');
    });

    it("skips non-introspectable vfuncs and reports the skip via the logger", () => {
        const { generator, file, skipMessages } = createTestSetup();
        const record = createNormalizedRecord({
            name: "ObjectClass",
            cType: "GObjectClass",
            isGtypeStructFor: "Object",
            fields: [
                callbackField(
                    "constructor",
                    createNormalizedCallback({
                        name: "constructor",
                        returnType: createNormalizedType({ name: "none" }),
                        parameters: [],
                        introspectable: false,
                    }),
                ),
            ],
        });
        expect(generator.generate(record)).toBe(true);
        const output = stringify(file);
        expect(output).toContain("export interface ObjectClass");
        expect(output).not.toContain('vfuncName: "constructor"');
        expect(skipMessages).toHaveLength(1);
        expect(skipMessages[0]).toContain("ObjectClass.constructor");
        expect(skipMessages[0]).toContain('introspectable="0"');
    });

    it("skips vfuncs with non-caller-allocated out parameters", () => {
        const { generator, skipMessages } = createTestSetup();
        const record = createNormalizedRecord({
            name: "WidgetClass",
            cType: "TestWidgetClass",
            isGtypeStructFor: "Widget",
            fields: [
                callbackField(
                    "get_size",
                    createNormalizedCallback({
                        name: "get_size",
                        returnType: createNormalizedType({ name: "none" }),
                        parameters: [
                            createNormalizedParameter({
                                name: "out_w",
                                direction: "out",
                                callerAllocates: false,
                                type: createNormalizedType({ name: "gint" }),
                            }),
                        ],
                    }),
                ),
            ],
        });
        generator.generate(record);
        expect(skipMessages.some((m) => m.includes("get_size"))).toBe(true);
    });

    it("emits the registry imports only when at least one vfunc is eligible", () => {
        const { generator, file } = createTestSetup();
        const record = createNormalizedRecord({
            name: "ObjectClass",
            cType: "GObjectClass",
            isGtypeStructFor: "Object",
            fields: [
                callbackField(
                    "finalize",
                    createNormalizedCallback({
                        name: "finalize",
                        returnType: createNormalizedType({ name: "none" }),
                        parameters: [],
                    }),
                ),
            ],
        });
        generator.generate(record);
        const code = stringify(file);
        expect(code).toContain('import { t } from "../../native.js"');
        expect(code).toContain('import { type RegisterClassVfuncDescriptor } from "../../register-class.js"');
    });

    it("skips records that have no c:type (class struct without an exported C name)", () => {
        const { generator, file, skipMessages } = createTestSetup();
        const record = createNormalizedRecord({
            name: "AnonymousClass",
            cType: "",
            isGtypeStructFor: "Anonymous",
            fields: [
                callbackField(
                    "finalize",
                    createNormalizedCallback({
                        name: "finalize",
                        returnType: createNormalizedType({ name: "none" }),
                        parameters: [],
                    }),
                ),
            ],
        });
        expect(generator.generate(record)).toBe(false);
        expect(stringify(file)).toBe("");
        expect(skipMessages.some((m) => m.includes("missing c:type"))).toBe(true);
    });

    it("skips records whose vtable kind cannot be inferred from owner or name", () => {
        const { generator, file, skipMessages } = createTestSetup();
        const record = createNormalizedRecord({
            name: "MysteryVTable",
            cType: "GMysteryVTable",
            fields: [
                callbackField(
                    "act",
                    createNormalizedCallback({
                        name: "act",
                        returnType: createNormalizedType({ name: "none" }),
                        parameters: [],
                    }),
                ),
            ],
        });
        expect(generator.generate(record)).toBe(false);
        expect(stringify(file)).toBe("");
        expect(skipMessages.some((m) => m.includes("cannot determine"))).toBe(true);
    });

    it("treats records ending in Iface as interface vtables", () => {
        const { generator, file } = createTestSetup();
        const record = createNormalizedRecord({
            name: "ActionIface",
            cType: "GActionIface",
            fields: [
                callbackField(
                    "activate",
                    createNormalizedCallback({
                        name: "activate",
                        returnType: createNormalizedType({ name: "none" }),
                        parameters: [],
                    }),
                ),
            ],
        });
        expect(generator.generate(record)).toBe(true);
        const code = stringify(file);
        expect(code).toContain('kind: "interface"');
    });

    it("writes argTypes for eligible vfuncs that have parameters", () => {
        const { generator, file } = createTestSetup();
        const record = createNormalizedRecord({
            name: "ObjectClass",
            cType: "GObjectClass",
            isGtypeStructFor: "Object",
            fields: [
                callbackField(
                    "set_size",
                    createNormalizedCallback({
                        name: "set_size",
                        returnType: createNormalizedType({ name: "gboolean" }),
                        parameters: [
                            createNormalizedParameter({
                                name: "width",
                                type: createNormalizedType({ name: "gint" }),
                            }),
                            createNormalizedParameter({
                                name: "height",
                                type: createNormalizedType({ name: "gint" }),
                            }),
                        ],
                    }),
                ),
            ],
        });
        expect(generator.generate(record)).toBe(true);
        const code = stringify(file);
        expect(code).toContain("argTypes: [t.int32, t.int32]");
        expect(code).toContain("returnType: t.bool");
    });
});
