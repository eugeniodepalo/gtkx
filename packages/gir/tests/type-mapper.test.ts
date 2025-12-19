import { describe, expect, it, vi } from "vitest";
import type { GirParameter } from "../src/index.js";
import { TypeMapper, TypeRegistry } from "../src/index.js";

describe("TypeMapper", () => {
    describe("basic type mapping", () => {
        it("maps gboolean to boolean", () => {
            const mapper = new TypeMapper();

            const result = mapper.mapType({ name: "gboolean" });

            expect(result.ts).toBe("boolean");
            expect(result.ffi.type).toBe("boolean");
        });

        it("maps gint to number with int32", () => {
            const mapper = new TypeMapper();

            const result = mapper.mapType({ name: "gint" });

            expect(result.ts).toBe("number");
            expect(result.ffi.type).toBe("int");
            expect(result.ffi.size).toBe(32);
            expect(result.ffi.unsigned).toBe(false);
        });

        it("maps guint to number with unsigned int32", () => {
            const mapper = new TypeMapper();

            const result = mapper.mapType({ name: "guint" });

            expect(result.ts).toBe("number");
            expect(result.ffi.type).toBe("int");
            expect(result.ffi.size).toBe(32);
            expect(result.ffi.unsigned).toBe(true);
        });

        it("maps gint64 to number with int64", () => {
            const mapper = new TypeMapper();

            const result = mapper.mapType({ name: "gint64" });

            expect(result.ts).toBe("number");
            expect(result.ffi.type).toBe("int");
            expect(result.ffi.size).toBe(64);
        });

        it("maps gfloat to number with float32", () => {
            const mapper = new TypeMapper();

            const result = mapper.mapType({ name: "gfloat" });

            expect(result.ts).toBe("number");
            expect(result.ffi.type).toBe("float");
            expect(result.ffi.size).toBe(32);
        });

        it("maps gdouble to number with float64", () => {
            const mapper = new TypeMapper();

            const result = mapper.mapType({ name: "gdouble" });

            expect(result.ts).toBe("number");
            expect(result.ffi.type).toBe("float");
            expect(result.ffi.size).toBe(64);
        });

        it("maps void to void with undefined ffi", () => {
            const mapper = new TypeMapper();

            const result = mapper.mapType({ name: "void" });

            expect(result.ts).toBe("void");
            expect(result.ffi.type).toBe("undefined");
        });

        it("maps none to void", () => {
            const mapper = new TypeMapper();

            const result = mapper.mapType({ name: "none" });

            expect(result.ts).toBe("void");
        });

        it("maps gpointer to number", () => {
            const mapper = new TypeMapper();

            const result = mapper.mapType({ name: "gpointer" });

            expect(result.ts).toBe("number");
            expect(result.ffi.type).toBe("int");
            expect(result.ffi.size).toBe(64);
            expect(result.ffi.unsigned).toBe(true);
        });

        it("maps GType to number", () => {
            const mapper = new TypeMapper();

            const result = mapper.mapType({ name: "GType" });

            expect(result.ts).toBe("number");
            expect(result.ffi.type).toBe("int");
            expect(result.ffi.size).toBe(64);
        });
    });

    describe("string type mapping", () => {
        it("maps utf8 to string", () => {
            const mapper = new TypeMapper();

            const result = mapper.mapType({ name: "utf8" });

            expect(result.ts).toBe("string");
            expect(result.ffi.type).toBe("string");
        });

        it("maps filename to string", () => {
            const mapper = new TypeMapper();

            const result = mapper.mapType({ name: "filename" });

            expect(result.ts).toBe("string");
            expect(result.ffi.type).toBe("string");
        });

        it("marks string as borrowed when transfer-ownership is none", () => {
            const mapper = new TypeMapper();

            const result = mapper.mapType({ name: "utf8", transferOwnership: "none" });

            expect(result.ffi.borrowed).toBe(true);
        });
    });

    describe("array type mapping", () => {
        it("maps array type with element type", () => {
            const mapper = new TypeMapper();

            const result = mapper.mapType({
                name: "array",
                isArray: true,
                elementType: { name: "utf8" },
            });

            expect(result.ts).toBe("string[]");
            expect(result.ffi.type).toBe("array");
            expect(result.ffi.itemType?.type).toBe("string");
        });

        it("maps array without element type to unknown[]", () => {
            const mapper = new TypeMapper();

            const result = mapper.mapType({ name: "array", isArray: true });

            expect(result.ts).toBe("unknown[]");
            expect(result.ffi.type).toBe("array");
        });

        it("handles GList with listType", () => {
            const mapper = new TypeMapper();

            const result = mapper.mapType({
                name: "array",
                isArray: true,
                elementType: { name: "utf8" },
                cType: "GList*",
            });

            expect(result.ffi.listType).toBe("glist");
        });

        it("handles GSList with listType", () => {
            const mapper = new TypeMapper();

            const result = mapper.mapType({
                name: "array",
                isArray: true,
                elementType: { name: "utf8" },
                cType: "GSList*",
            });

            expect(result.ffi.listType).toBe("gslist");
        });
    });

    describe("enum type mapping", () => {
        it("maps registered enum", () => {
            const mapper = new TypeMapper();
            mapper.registerEnum("Orientation", "Orientation");

            const result = mapper.mapType({ name: "Orientation" });

            expect(result.ts).toBe("Orientation");
            expect(result.ffi.type).toBe("int");
            expect(result.ffi.size).toBe(32);
        });

        it("uses transformed name for enum", () => {
            const mapper = new TypeMapper();
            mapper.registerEnum("text_direction", "TextDirection");

            const result = mapper.mapType({ name: "text_direction" });

            expect(result.ts).toBe("TextDirection");
        });

        it("calls enum usage callback when enum is mapped", () => {
            const mapper = new TypeMapper();
            mapper.registerEnum("Orientation", "Orientation");
            const callback = vi.fn();
            mapper.setEnumUsageCallback(callback);

            mapper.mapType({ name: "Orientation" });

            expect(callback).toHaveBeenCalledWith("Orientation");
        });
    });

    describe("record type mapping", () => {
        it("maps registered record to boxed type", () => {
            const mapper = new TypeMapper();
            mapper.registerRecord("Rectangle", "Rectangle", "GdkRectangle");

            const result = mapper.mapType({ name: "Rectangle" });

            expect(result.ts).toBe("Rectangle");
            expect(result.ffi.type).toBe("boxed");
            expect(result.ffi.innerType).toBe("GdkRectangle");
        });

        it("calls record usage callback when record is mapped", () => {
            const mapper = new TypeMapper();
            mapper.registerRecord("Rectangle", "Rectangle", "GdkRectangle");
            const callback = vi.fn();
            mapper.setRecordUsageCallback(callback);

            mapper.mapType({ name: "Rectangle" });

            expect(callback).toHaveBeenCalledWith("Rectangle");
        });
    });

    describe("type registry integration", () => {
        it("resolves types from registry", () => {
            const registry = new TypeRegistry();
            registry.registerNativeClass("Gtk", "Widget");
            const mapper = new TypeMapper();
            mapper.setTypeRegistry(registry, "Gtk");

            const result = mapper.mapType({ name: "Widget" });

            expect(result.ts).toBe("Widget");
            expect(result.ffi.type).toBe("gobject");
        });

        it("resolves external namespace types", () => {
            const registry = new TypeRegistry();
            registry.registerNativeClass("Gdk", "Display");
            const mapper = new TypeMapper();
            mapper.setTypeRegistry(registry, "Gtk");

            const result = mapper.mapType({ name: "Gdk.Display" });

            expect(result.ts).toBe("Gdk.Display");
            expect(result.externalType?.namespace).toBe("Gdk");
            expect(result.externalType?.name).toBe("Display");
        });

        it("calls external type usage callback", () => {
            const registry = new TypeRegistry();
            registry.registerNativeClass("Gdk", "Display");
            const mapper = new TypeMapper();
            mapper.setTypeRegistry(registry, "Gtk");
            const callback = vi.fn();
            mapper.setExternalTypeUsageCallback(callback);

            mapper.mapType({ name: "Gdk.Display" });

            expect(callback).toHaveBeenCalledWith(
                expect.objectContaining({
                    namespace: "Gdk",
                    name: "Display",
                }),
            );
        });

        it("calls same-namespace class usage callback", () => {
            const registry = new TypeRegistry();
            registry.registerNativeClass("Gtk", "Widget");
            const mapper = new TypeMapper();
            mapper.setTypeRegistry(registry, "Gtk");
            const callback = vi.fn();
            mapper.setSameNamespaceClassUsageCallback(callback);

            mapper.mapType({ name: "Widget" });

            expect(callback).toHaveBeenCalledWith("Widget", "Widget");
        });

        it("resolves enums from registry", () => {
            const registry = new TypeRegistry();
            registry.registerEnum("Gtk", "Orientation");
            const mapper = new TypeMapper();
            mapper.setTypeRegistry(registry, "Gtk");

            const result = mapper.mapType({ name: "Orientation" });

            expect(result.ts).toBe("Orientation");
            expect(result.ffi.type).toBe("int");
        });

        it("resolves records from registry", () => {
            const registry = new TypeRegistry();
            registry.registerRecord("Gdk", "Rectangle", "GdkRectangle");
            const mapper = new TypeMapper();
            mapper.setTypeRegistry(registry, "Gdk");

            const result = mapper.mapType({ name: "Rectangle" });

            expect(result.ts).toBe("Rectangle");
            expect(result.ffi.type).toBe("boxed");
        });
    });

    describe("parameter mapping", () => {
        it("maps out parameter to Ref type", () => {
            const mapper = new TypeMapper();
            const param: GirParameter = {
                name: "value",
                type: { name: "gint" },
                direction: "out",
            };

            const result = mapper.mapParameter(param);

            expect(result.ts).toBe("Ref<number>");
            expect(result.ffi.type).toBe("ref");
            expect(result.ffi.innerType).toEqual({ type: "int", size: 32, unsigned: false });
        });

        it("maps inout parameter to Ref type", () => {
            const mapper = new TypeMapper();
            const param: GirParameter = {
                name: "value",
                type: { name: "gint" },
                direction: "inout",
            };

            const result = mapper.mapParameter(param);

            expect(result.ts).toBe("Ref<number>");
            expect(result.ffi.type).toBe("ref");
        });

        it("passes caller-allocates boxed types directly", () => {
            const registry = new TypeRegistry();
            registry.registerRecord("Gdk", "Rectangle", "GdkRectangle");
            const mapper = new TypeMapper();
            mapper.setTypeRegistry(registry, "Gdk");
            const param: GirParameter = {
                name: "rect",
                type: { name: "Rectangle" },
                direction: "out",
                callerAllocates: true,
            };

            const result = mapper.mapParameter(param);

            expect(result.ts).toBe("Rectangle");
            expect(result.ffi.borrowed).toBe(true);
        });

        it("maps AsyncReadyCallback to special callback type", () => {
            const mapper = new TypeMapper();
            const param: GirParameter = {
                name: "callback",
                type: { name: "Gio.AsyncReadyCallback" },
            };

            const result = mapper.mapParameter(param);

            expect(result.ts).toBe("(source: unknown, result: unknown) => void");
            expect(result.ffi.type).toBe("callback");
            expect(result.ffi.trampoline).toBe("asyncReady");
        });

        it("maps DestroyNotify to destroy callback", () => {
            const mapper = new TypeMapper();
            const param: GirParameter = {
                name: "destroy",
                type: { name: "GLib.DestroyNotify" },
            };

            const result = mapper.mapParameter(param);

            expect(result.ts).toBe("() => void");
            expect(result.ffi.trampoline).toBe("destroy");
        });

        it("maps DrawingAreaDrawFunc to drawFunc callback", () => {
            const mapper = new TypeMapper();
            const param: GirParameter = {
                name: "draw_func",
                type: { name: "Gtk.DrawingAreaDrawFunc" },
            };

            const result = mapper.mapParameter(param);

            expect(result.ts).toBe("(self: DrawingArea, cr: Cairo.Context, width: number, height: number) => void");
            expect(result.ffi.trampoline).toBe("drawFunc");
            expect(result.ffi.argTypes).toEqual([
                { type: "gobject", borrowed: true },
                { type: "boxed", borrowed: true, innerType: "CairoContext" },
                { type: "int", size: 32, unsigned: false },
                { type: "int", size: 32, unsigned: false },
            ]);
        });

        it("handles transfer-ownership full for gobject params", () => {
            const registry = new TypeRegistry();
            registry.registerNativeClass("Gtk", "Widget");
            const mapper = new TypeMapper();
            mapper.setTypeRegistry(registry, "Gtk");
            const param: GirParameter = {
                name: "widget",
                type: { name: "Widget" },
                transferOwnership: "full",
            };

            const result = mapper.mapParameter(param);

            expect(result.ffi.borrowed).toBe(false);
        });

        it("handles transfer-ownership none for gobject params", () => {
            const registry = new TypeRegistry();
            registry.registerNativeClass("Gtk", "Widget");
            const mapper = new TypeMapper();
            mapper.setTypeRegistry(registry, "Gtk");
            const param: GirParameter = {
                name: "widget",
                type: { name: "Widget" },
                transferOwnership: "none",
            };

            const result = mapper.mapParameter(param);

            expect(result.ffi.borrowed).toBe(true);
        });
    });

    describe("isCallback", () => {
        it("returns true for callback type", () => {
            const registry = new TypeRegistry();
            registry.registerCallback("Gtk", "TickCallback");
            const mapper = new TypeMapper();
            mapper.setTypeRegistry(registry, "Gtk");

            expect(mapper.isCallback("TickCallback")).toBe(true);
        });

        it("returns false for non-callback type", () => {
            const registry = new TypeRegistry();
            registry.registerNativeClass("Gtk", "Widget");
            const mapper = new TypeMapper();
            mapper.setTypeRegistry(registry, "Gtk");

            expect(mapper.isCallback("Widget")).toBe(false);
        });

        it("returns false without registry", () => {
            const mapper = new TypeMapper();

            expect(mapper.isCallback("SomeCallback")).toBe(false);
        });
    });

    describe("isClosureTarget", () => {
        it("returns true for user_data parameter of trampoline callback", () => {
            const mapper = new TypeMapper();
            const params: GirParameter[] = [
                { name: "callback", type: { name: "Gio.AsyncReadyCallback" }, closure: 1 },
                { name: "user_data", type: { name: "gpointer" } },
            ];

            expect(mapper.isClosureTarget(1, params)).toBe(true);
        });

        it("returns true for destroy parameter of trampoline callback", () => {
            const mapper = new TypeMapper();
            const params: GirParameter[] = [
                { name: "callback", type: { name: "Gio.AsyncReadyCallback" }, destroy: 2 },
                { name: "user_data", type: { name: "gpointer" } },
                { name: "destroy", type: { name: "GLib.DestroyNotify" } },
            ];

            expect(mapper.isClosureTarget(2, params)).toBe(true);
        });

        it("returns false for non-closure parameters", () => {
            const mapper = new TypeMapper();
            const params: GirParameter[] = [
                { name: "widget", type: { name: "Widget" } },
                { name: "label", type: { name: "utf8" } },
            ];

            expect(mapper.isClosureTarget(0, params)).toBe(false);
            expect(mapper.isClosureTarget(1, params)).toBe(false);
        });
    });

    describe("isNullable", () => {
        it("returns true for nullable parameter", () => {
            const mapper = new TypeMapper();
            const param: GirParameter = {
                name: "value",
                type: { name: "utf8" },
                nullable: true,
            };

            expect(mapper.isNullable(param)).toBe(true);
        });

        it("returns true for optional parameter", () => {
            const mapper = new TypeMapper();
            const param: GirParameter = {
                name: "value",
                type: { name: "utf8" },
                optional: true,
            };

            expect(mapper.isNullable(param)).toBe(true);
        });

        it("returns false for required parameter", () => {
            const mapper = new TypeMapper();
            const param: GirParameter = {
                name: "value",
                type: { name: "utf8" },
            };

            expect(mapper.isNullable(param)).toBe(false);
        });
    });

    describe("callback usage", () => {
        it("getEnumUsageCallback returns null by default", () => {
            const mapper = new TypeMapper();

            expect(mapper.getEnumUsageCallback()).toBeNull();
        });

        it("setEnumUsageCallback with null clears callback", () => {
            const mapper = new TypeMapper();
            mapper.setEnumUsageCallback(() => {});
            mapper.setEnumUsageCallback(null);

            expect(mapper.getEnumUsageCallback()).toBeNull();
        });

        it("getRecordUsageCallback returns null by default", () => {
            const mapper = new TypeMapper();

            expect(mapper.getRecordUsageCallback()).toBeNull();
        });

        it("getExternalTypeUsageCallback returns null by default", () => {
            const mapper = new TypeMapper();

            expect(mapper.getExternalTypeUsageCallback()).toBeNull();
        });

        it("getSameNamespaceClassUsageCallback returns null by default", () => {
            const mapper = new TypeMapper();

            expect(mapper.getSameNamespaceClassUsageCallback()).toBeNull();
        });
    });

    describe("edge cases", () => {
        it("falls back to C type mapping for unknown types", () => {
            const mapper = new TypeMapper();

            const result = mapper.mapType({ name: "UnknownType", cType: "gint" });

            expect(result.ts).toBe("number");
            expect(result.ffi.type).toBe("int");
        });

        it("falls back to pointer type for completely unknown types", () => {
            const mapper = new TypeMapper();

            const result = mapper.mapType({ name: "CompletelyUnknown" });

            expect(result.ts).toBe("number");
            expect(result.ffi.type).toBe("int");
            expect(result.ffi.size).toBe(64);
            expect(result.ffi.unsigned).toBe(true);
        });

        it("handles qualified names with current namespace prefix", () => {
            const mapper = new TypeMapper();
            mapper.registerEnum("Orientation", "Orientation");
            mapper.setTypeRegistry(new TypeRegistry(), "Gtk");

            const result = mapper.mapType({ name: "Gtk.Orientation" });

            expect(result.ts).toBe("Orientation");
        });
    });
});
