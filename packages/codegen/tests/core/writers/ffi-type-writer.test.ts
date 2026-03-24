import { describe, expect, it } from "vitest";
import { FfiTypeWriter } from "../../../src/core/writers/ffi-type-writer.js";

describe("FfiTypeWriter", () => {
    describe("constructor", () => {
        it("creates writer with no options", () => {
            const writer = new FfiTypeWriter();
            expect(writer).toBeInstanceOf(FfiTypeWriter);
        });

        it("creates writer with currentSharedLibrary option", () => {
            const writer = new FfiTypeWriter({ currentSharedLibrary: "libgtk-4.so.1" });
            expect(writer).toBeInstanceOf(FfiTypeWriter);
        });

        it("creates writer with glibLibrary option", () => {
            const writer = new FfiTypeWriter({ glibLibrary: "libglib-2.0.so.0" });
            expect(writer).toBeInstanceOf(FfiTypeWriter);
        });
    });

    describe("createGErrorRefTypeDescriptor", () => {
        it("creates GError ref type descriptor", () => {
            const writer = new FfiTypeWriter({ glibLibrary: "libglib-2.0.so.0" });
            const descriptor = writer.createGErrorRefTypeDescriptor();

            expect(descriptor).toEqual({
                type: "ref",
                innerType: {
                    type: "boxed",
                    ownership: "full",
                    innerType: "GError",
                    library: "libglib-2.0.so.0",
                    getTypeFn: "g_error_get_type",
                },
            });
        });

        it("throws when glibLibrary is not set", () => {
            const writer = new FfiTypeWriter();
            expect(() => writer.createGErrorRefTypeDescriptor()).toThrow(
                "glibLibrary must be set in FfiTypeWriterOptions for GError types",
            );
        });
    });

    describe("createSelfTypeDescriptor", () => {
        it("returns gobject self descriptor by default", () => {
            const writer = new FfiTypeWriter();
            const descriptor = writer.createSelfTypeDescriptor({});

            expect(descriptor).toEqual({ type: "gobject", ownership: "borrowed" });
        });

        it("returns fundamental self descriptor when isFundamental is true", () => {
            const writer = new FfiTypeWriter();
            const descriptor = writer.createSelfTypeDescriptor({
                isFundamental: true,
                fundamentalLib: "libgobject-2.0.so.0",
                fundamentalRefFunc: "g_param_spec_ref_sink",
                fundamentalUnrefFunc: "g_param_spec_unref",
            });

            expect(descriptor).toEqual({
                type: "fundamental",
                ownership: "borrowed",
                library: "libgobject-2.0.so.0",
                refFn: "g_param_spec_ref_sink",
                unrefFn: "g_param_spec_unref",
            });
        });

        it("includes typeName for fundamental when provided", () => {
            const writer = new FfiTypeWriter();
            const descriptor = writer.createSelfTypeDescriptor({
                isFundamental: true,
                fundamentalLib: "libgobject-2.0.so.0",
                fundamentalRefFunc: "g_param_spec_ref_sink",
                fundamentalUnrefFunc: "g_param_spec_unref",
                fundamentalTypeName: "GParamSpec",
            });

            expect(descriptor.typeName).toBe("GParamSpec");
        });

        it("returns boxed self descriptor for records", () => {
            const writer = new FfiTypeWriter({ currentSharedLibrary: "libgtk-4.so.1" });
            const descriptor = writer.createSelfTypeDescriptor({
                isRecord: true,
                recordName: "GdkRGBA",
            });

            expect(descriptor).toEqual({
                type: "boxed",
                ownership: "borrowed",
                innerType: "GdkRGBA",
                library: "libgtk-4.so.1",
            });
        });

        it("uses explicit sharedLibrary for records when provided", () => {
            const writer = new FfiTypeWriter({ currentSharedLibrary: "libgtk-4.so.1" });
            const descriptor = writer.createSelfTypeDescriptor({
                isRecord: true,
                recordName: "PangoAttrList",
                sharedLibrary: "libpango-1.0.so.0",
            });

            expect(descriptor.library).toBe("libpango-1.0.so.0");
        });

        it("uses empty lib when no library available for records", () => {
            const writer = new FfiTypeWriter();
            const descriptor = writer.createSelfTypeDescriptor({
                isRecord: true,
                recordName: "SomeRecord",
            });

            expect(descriptor.library).toBe("");
        });

        it("includes getTypeFn for records when provided", () => {
            const writer = new FfiTypeWriter({ currentSharedLibrary: "libgtk-4.so.1" });
            const descriptor = writer.createSelfTypeDescriptor({
                isRecord: true,
                recordName: "GdkRGBA",
                getTypeFn: "gdk_rgba_get_type",
            });

            expect(descriptor.getTypeFn).toBe("gdk_rgba_get_type");
        });
    });

    describe("setSharedLibrary", () => {
        it("sets the current shared library", () => {
            const writer = new FfiTypeWriter();
            writer.setSharedLibrary("libgtk-4.so.1");

            const descriptor = writer.createSelfTypeDescriptor({
                isRecord: true,
                recordName: "GdkRGBA",
            });

            expect(descriptor.library).toBe("libgtk-4.so.1");
        });

        it("overrides previously set library", () => {
            const writer = new FfiTypeWriter({ currentSharedLibrary: "libold.so" });
            writer.setSharedLibrary("libnew.so");

            const descriptor = writer.createSelfTypeDescriptor({
                isRecord: true,
                recordName: "SomeType",
            });

            expect(descriptor.library).toBe("libnew.so");
        });
    });
});
