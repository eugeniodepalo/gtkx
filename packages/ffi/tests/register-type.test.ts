import { describe, expect, it } from "vitest";
import * as Gtk from "../src/generated/gtk/index.js";
import { getObject, type NativeClass, NativeObject, registerNativeClass } from "../src/index.js";

describe("registerNativeClass", () => {
    it("registers a class with glibTypeName and objectType", () => {
        class TestClass extends NativeObject {
            static glibTypeName = "TestType";
            static objectType = "gobject" as const;
        }
        registerNativeClass(TestClass as NativeClass);
    });

    it("allows getObject to find registered types", () => {
        const label = new Gtk.Label("Test");
        const wrapped = getObject(label.id);
        expect(wrapped).toBeInstanceOf(Gtk.Label);
    });
});
