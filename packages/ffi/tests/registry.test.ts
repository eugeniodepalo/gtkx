import { describe, expect, it } from "vitest";
import * as Gtk from "../src/generated/gtk/index.js";
import { getNativeObject, type NativeClass, NativeObject, registerNativeClass } from "../src/index.js";

describe("registerNativeClass", () => {
    it("registers a class with glibTypeName and objectType", () => {
        class TestClass extends NativeObject {
            static glibTypeName = "TestType";
            static objectType = "gobject" as const;
        }
        registerNativeClass(TestClass as NativeClass);
    });

    it("allows getNativeObject to find registered types", () => {
        const label = new Gtk.Label("Test");
        const wrapped = getNativeObject(label.handle);
        expect(wrapped).toBeInstanceOf(Gtk.Label);
    });
});
