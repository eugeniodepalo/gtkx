import { describe, expect, it } from "vitest";
import { typeFromName, typeName, typeParent } from "../src/generated/gobject/functions.js";
import * as Gtk from "../src/generated/gtk/index.js";
import { findNativeClass, registerClass } from "../src/index.js";

let suffix = 0;
const uniqueName = (prefix: string): string => `${prefix}_${process.pid}_${++suffix}`;

describe("registerClass", () => {
    it("registers a new GType derived from the parent class", () => {
        const name = uniqueName("GtkxTestSubclass");
        class CustomLabel extends Gtk.Label {}

        registerClass(CustomLabel, { gtypeName: name });

        const gtype = typeFromName(name);
        expect(gtype).not.toBe(0);
        expect(typeName(gtype)).toBe(name);
        expect(typeName(typeParent(gtype))).toBe("GtkLabel");
    });

    it("registers the JS class so getNativeObject resolves to it for the new GType", () => {
        const name = uniqueName("GtkxResolvableSubclass");
        class CustomButton extends Gtk.Button {}

        registerClass(CustomButton, { gtypeName: name });

        expect(findNativeClass(name)).toBe(CustomButton);
    });

    it("falls back to klass.name when no gtypeName option is supplied", () => {
        const dynamicName = uniqueName("GtkxAutoNameSubclass");
        const klass = { [dynamicName]: class extends Gtk.Box {} }[dynamicName] as typeof Gtk.Box;

        registerClass(klass);

        expect(typeFromName(dynamicName)).not.toBe(0);
        expect(klass.glibTypeName).toBe(dynamicName);
    });

    it("rejects classes that do not extend a NativeObject", () => {
        class NotANativeObject {}

        expect(() =>
            registerClass(NotANativeObject as unknown as Parameters<typeof registerClass>[0], {
                gtypeName: uniqueName("ShouldNotRegister"),
            }),
        ).toThrow(/must extend a NativeObject subclass/);
    });

    it("rejects when the parent has no registered GType", () => {
        class Orphan extends Gtk.Widget {
            static override readonly glibTypeName: string = "";
        }

        const child = class extends Orphan {};
        expect(() => registerClass(child, { gtypeName: uniqueName("ChildOfOrphan") })).toThrow(
            /no registered GType parent/,
        );
    });

    it("rejects a name that is already registered with the type system", () => {
        const name = uniqueName("GtkxAlreadyRegistered");
        class FirstUse extends Gtk.Label {}
        class SecondUse extends Gtk.Label {}

        registerClass(FirstUse, { gtypeName: name });
        expect(() => registerClass(SecondUse, { gtypeName: name })).toThrow(/already registered/);
    });
});
