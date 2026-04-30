import { describe, expect, it } from "vitest";
import { Writer } from "../../../src/builders/writer.js";
import { FfiDescriptorRegistry } from "../../../src/core/writers/descriptor-registry.js";

function dump(registry: FfiDescriptorRegistry): string {
    const writer = new Writer();
    registry.write(writer);
    return writer.toString();
}

describe("FfiDescriptorRegistry", () => {
    it("starts empty", () => {
        const registry = new FfiDescriptorRegistry();
        expect(registry.isEmpty).toBe(true);
    });

    it("returns the same name for an identical descriptor", () => {
        const registry = new FfiDescriptorRegistry();
        const opts = {
            sharedLibrary: "libgtk-4.so.1",
            cIdentifier: "gtk_label_get_label",
            args: [],
            returnType: { type: "string" as const, ownership: "borrowed" as const },
            selfArg: {
                type: { type: "gobject" as const, ownership: "borrowed" as const },
                value: "this.handle",
            },
        };
        const a = registry.register(opts);
        const b = registry.register(opts);
        expect(a).toEqual({ varargs: false, name: "gtk_label_get_label" });
        expect(b).toEqual({ varargs: false, name: "gtk_label_get_label" });
    });

    it("returns varargs true for variadic callables and does not register them", () => {
        const registry = new FfiDescriptorRegistry();
        const result = registry.register({
            sharedLibrary: "libgobject-2.0.so.0",
            cIdentifier: "g_object_new",
            args: [{ type: { type: "uint64" }, value: "gtype" }],
            returnType: { type: "gobject", ownership: "full" },
            hasVarargs: true,
        });
        expect(result).toEqual({ varargs: true });
        expect(registry.isEmpty).toBe(true);
    });

    it("appends a numeric suffix when same cIdentifier has a different descriptor", () => {
        const registry = new FfiDescriptorRegistry();
        const a = registry.register({
            sharedLibrary: "libgobject-2.0.so.0",
            cIdentifier: "g_signal_connect_data",
            args: [],
            returnType: { type: "uint64" },
        });
        const b = registry.register({
            sharedLibrary: "libgobject-2.0.so.0",
            cIdentifier: "g_signal_connect_data",
            args: [{ type: { type: "string", ownership: "borrowed" }, value: "x" }],
            returnType: { type: "uint64" },
        });
        const c = registry.register({
            sharedLibrary: "libgobject-2.0.so.0",
            cIdentifier: "g_signal_connect_data",
            args: [
                { type: { type: "string", ownership: "borrowed" }, value: "x" },
                { type: { type: "string", ownership: "borrowed" }, value: "y" },
            ],
            returnType: { type: "uint64" },
        });
        expect(a).toEqual({ varargs: false, name: "g_signal_connect_data" });
        expect(b).toEqual({ varargs: false, name: "g_signal_connect_data_2" });
        expect(c).toEqual({ varargs: false, name: "g_signal_connect_data_3" });
    });

    it("preserves the optional flag in the emitted slot", () => {
        const registry = new FfiDescriptorRegistry();
        registry.register({
            sharedLibrary: "libgtk-4.so.1",
            cIdentifier: "gtk_label_new",
            args: [{ type: { type: "string", ownership: "borrowed" }, value: "str", optional: true }],
            returnType: { type: "gobject", ownership: "borrowed" },
        });
        const out = dump(registry);
        expect(out).toContain('{ type: {"type":"string","ownership":"borrowed"}, optional: true }');
    });

    it("emits one fn() declaration per registered descriptor in registration order", () => {
        const registry = new FfiDescriptorRegistry();
        registry.register({
            sharedLibrary: "libgtk-4.so.1",
            cIdentifier: "first_fn",
            args: [],
            returnType: { type: "void" },
        });
        registry.register({
            sharedLibrary: "libgtk-4.so.1",
            cIdentifier: "second_fn",
            args: [],
            returnType: { type: "void" },
        });
        const out = dump(registry);
        const firstIdx = out.indexOf("const first_fn = fn(");
        const secondIdx = out.indexOf("const second_fn = fn(");
        expect(firstIdx).toBeGreaterThanOrEqual(0);
        expect(secondIdx).toBeGreaterThan(firstIdx);
    });

    it("includes selfArg type as the first slot of the descriptor", () => {
        const registry = new FfiDescriptorRegistry();
        registry.register({
            sharedLibrary: "libgtk-4.so.1",
            cIdentifier: "gtk_widget_show",
            args: [],
            returnType: { type: "void" },
            selfArg: {
                type: { type: "gobject", ownership: "borrowed" },
                value: "this.handle",
            },
        });
        const out = dump(registry);
        expect(out).toContain('{ type: {"type":"gobject","ownership":"borrowed"} }');
    });
});
