import { describe, expect, it } from "vitest";
import { Object as GObject, typeFromName, typeName, typeParent } from "../src/generated/gobject/gobject.js";
import * as Gtk from "../src/generated/gtk/gtk.js";
import { getHandle } from "../src/handles.js";
import { findNativeClass, instanceIsA, registerClass } from "../src/index.js";

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

    it("registers the JS class so findNativeClass resolves to it for the new GType", () => {
        const name = uniqueName("GtkxResolvableSubclass");
        class CustomButton extends Gtk.Button {}

        registerClass(CustomButton, { gtypeName: name });

        const newGtype = typeFromName(name);
        expect(findNativeClass(newGtype)).toBe(CustomButton);
    });

    it("falls back to klass.name when no gtypeName option is supplied", () => {
        const dynamicName = uniqueName("GtkxAutoNameSubclass");
        const klass = { [dynamicName]: class extends Gtk.Box {} }[dynamicName] as typeof Gtk.Box;

        registerClass(klass);

        expect(typeFromName(dynamicName)).not.toBe(0);
    });

    it("rejects classes that do not extend a registered native class", () => {
        class NotANativeObject {}

        expect(() =>
            registerClass(NotANativeObject as unknown as Parameters<typeof registerClass>[0], {
                gtypeName: uniqueName("ShouldNotRegister"),
            }),
        ).toThrow(/must extend a registered native class/);
    });

    it("rejects a name that is already registered with the type system", () => {
        const name = uniqueName("GtkxAlreadyRegistered");
        class FirstUse extends Gtk.Label {}
        class SecondUse extends Gtk.Label {}

        registerClass(FirstUse, { gtypeName: name });
        expect(() => registerClass(SecondUse, { gtypeName: name })).toThrow(/already registered/);
    });

    it("auto-discovers a class vfunc override from a subclass method", () => {
        const name = uniqueName("GtkxVfuncSubclass");
        class CustomObject extends GObject {
            setProperty(): void {}
        }

        registerClass(CustomObject, { gtypeName: name });

        const customGtype = typeFromName(name);
        expect(customGtype).not.toBe(0);
        const instance = GObject.newv(customGtype, []);
        expect(instance).toBeDefined();
    });

    it("invokes the auto-discovered class vfunc trampoline when GObject dispatches the slot", () => {
        const name = uniqueName("GtkxVfuncInvocationSubclass");
        const constructedCalls: string[] = [];
        class CustomObject extends GObject {
            constructed(): void {
                constructedCalls.push("constructed invoked");
            }
        }

        registerClass(CustomObject, { gtypeName: name });

        const customGtype = typeFromName(name);
        GObject.newv(customGtype, []);

        expect(constructedCalls).toEqual(["constructed invoked"]);
    });

    it("auto-discovers and dispatches a vfunc override for an interface inherited from the parent", () => {
        const name = uniqueName("GtkxInheritedInterfaceVfunc");
        const parserFinishedCalls: number[] = [];
        class CustomWidget extends Gtk.Widget {
            parserFinished(..._args: unknown[]): void {
                parserFinishedCalls.push(1);
            }
        }

        registerClass(CustomWidget, { gtypeName: name });

        const customGtype = typeFromName(name);
        expect(customGtype).not.toBe(0);

        const instance = GObject.newv(customGtype, []);
        expect(instanceIsA(getHandle(instance), typeFromName("GtkBuildable"))).toBe(true);

        const builder = Gtk.Builder.new();
        builder.addFromString(`<interface><object class="${name}" id="customWidget"/></interface>`, -1);

        expect(parserFinishedCalls).toEqual([1]);
    });
});
