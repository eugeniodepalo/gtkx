import { findObjectProperty } from "@gtkx/native";
import { describe, expect, it } from "vitest";
import type { GType } from "../src/generated/gobject/gobject.js";
import {
    Object as GObject,
    Value as GValue,
    ParamFlags,
    paramSpecBoolean,
    paramSpecString,
    signalEmitv,
    signalLookup,
    typeFromName,
    typeName,
    typeParent,
} from "../src/generated/gobject/gobject.js";
import * as Gtk from "../src/generated/gtk/gtk.js";
import { getHandle } from "../src/handles.js";
import { findNativeClass, instanceIsA, registerClass } from "../src/index.js";
import { call, t } from "../src/native.js";

let suffix = 0;
const uniqueName = (prefix: string): string => `${prefix}_${process.pid}_${++suffix}`;

const INVALID_GTYPE = 0 as unknown as GType;

const gtypeNone = (): GType => typeFromName("void") as unknown as GType;
const gtypeString = (): GType => typeFromName("gchararray");

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

    it("installs a GParamSpec property that is discoverable on instances", () => {
        const name = uniqueName("GtkxPropertySubclass");
        class CustomObject extends GObject {
            setProperty(): void {}
            getProperty(): void {}
        }

        const pspec = paramSpecString("custom-prop", "Custom Prop", "Custom property", "default", ParamFlags.READWRITE);
        registerClass(CustomObject, {
            gtypeName: name,
            properties: [{ pspec }],
        });

        const customGtype = typeFromName(name);
        const instance = GObject.newv(customGtype, []);
        const found = findObjectProperty(getHandle(instance), "custom-prop");
        expect(found).not.toBeNull();
    });

    it("installs multiple properties in the order provided", () => {
        const name = uniqueName("GtkxMultiPropertySubclass");
        class CustomObject extends GObject {
            setProperty(): void {}
            getProperty(): void {}
        }

        const stringSpec = paramSpecString("first", null, null, null, ParamFlags.READWRITE);
        const booleanSpec = paramSpecBoolean("second", null, null, false, ParamFlags.READWRITE);
        registerClass(CustomObject, {
            gtypeName: name,
            properties: [{ pspec: stringSpec }, { pspec: booleanSpec }],
        });

        const customGtype = typeFromName(name);
        const instance = GObject.newv(customGtype, []);
        expect(findObjectProperty(getHandle(instance), "first")).not.toBeNull();
        expect(findObjectProperty(getHandle(instance), "second")).not.toBeNull();
    });

    it("registers a signal that can be looked up on the new GType", () => {
        const name = uniqueName("GtkxSignalSubclass");
        const signalName = "ping";
        class CustomObject extends GObject {}

        registerClass(CustomObject, {
            gtypeName: name,
            signals: [
                {
                    name: signalName,
                    flags: 0,
                    returnGType: gtypeNone(),
                    paramGTypes: [gtypeString()],
                },
            ],
        });

        const customGtype = typeFromName(name);
        const signalId = signalLookup(signalName, customGtype);
        expect(signalId).not.toBe(0);
    });

    it("invokes the signal default handler on emission", () => {
        const name = uniqueName("GtkxDefaultHandlerSubclass");
        const signalName = "pong";
        class CustomObject extends GObject {}

        const SIGNAL_RUN_LAST = 1 << 1;
        const calls: string[] = [];
        registerClass(CustomObject, {
            gtypeName: name,
            signals: [
                {
                    name: signalName,
                    flags: SIGNAL_RUN_LAST,
                    returnGType: gtypeNone(),
                    paramGTypes: [gtypeString()],
                    defaultHandler: (_instance: unknown, message: unknown) => {
                        calls.push(message as string);
                    },
                    defaultHandlerArgTypes: [
                        { type: "gobject", ownership: "borrowed" },
                        { type: "string", ownership: "borrowed" },
                    ],
                    defaultHandlerReturnType: { type: "void" },
                },
            ],
        });

        const customGtype = typeFromName(name);
        const instance = GObject.newv(customGtype, []);
        const signalId = signalLookup(signalName, customGtype);
        expect(signalId).not.toBe(0);

        const instanceValue = new GValue();
        instanceValue.init(customGtype);
        instanceValue.setObject(instance);
        const messageValue = new GValue();
        messageValue.init(gtypeString());
        messageValue.setString("hello");

        signalEmitv([instanceValue, messageValue], signalId, 0);

        expect(calls).toEqual(["hello"]);
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

    it("invokes the auto-discovered vfunc trampoline when GObject dispatches the slot", () => {
        const name = uniqueName("GtkxVfuncInvocationSubclass");
        const setCalls: string[] = [];
        class CustomObject extends GObject {
            setProperty(..._args: unknown[]): void {
                setCalls.push("set_property invoked");
            }
            getProperty(): void {}
        }

        const pspec = paramSpecString("dispatched-prop", null, null, null, ParamFlags.READWRITE);
        registerClass(CustomObject, {
            gtypeName: name,
            properties: [{ pspec }],
        });

        const customGtype = typeFromName(name);
        const instance = GObject.newv(customGtype, []) as unknown as {
            setProperty: (key: string, value: unknown) => void;
        };
        instance.setProperty("dispatched-prop", "hello world");

        expect(setCalls).toEqual(["set_property invoked"]);
    });

    it("rejects a signal with a default handler missing argument or return types", () => {
        class CustomObject extends GObject {}

        expect(() =>
            registerClass(CustomObject, {
                gtypeName: uniqueName("GtkxBadDefaultHandler"),
                signals: [
                    {
                        name: "missing-types",
                        flags: 0,
                        returnGType: gtypeNone(),
                        paramGTypes: [],
                        defaultHandler: () => undefined,
                    },
                ],
            }),
        ).toThrow(/defaultHandlerArgTypes or defaultHandlerReturnType/);
    });

    it("registers a class as implementing an interface and dispatches through its vtable", () => {
        const name = uniqueName("GtkxIconImpl");
        const hashCalls: number[] = [];
        class CustomIcon extends GObject {
            hash(): number {
                hashCalls.push(1);
                return 0xfeed_face;
            }
        }

        const giconGtype = typeFromName("GIcon");
        expect(giconGtype).not.toBe(0);

        registerClass(CustomIcon, {
            gtypeName: name,
            interfaces: [{ gtype: giconGtype }],
        });

        const customGtype = typeFromName(name);
        const instance = GObject.newv(customGtype, []);
        expect(instanceIsA(getHandle(instance), giconGtype)).toBe(true);

        const result = call(
            "libgio-2.0.so.0",
            "g_icon_hash",
            [{ type: t.object("borrowed"), value: getHandle(instance) }],
            t.uint32,
        );

        expect(hashCalls).toEqual([1]);
        expect(result).toBe(0xfeed_face);
    });

    it("rejects a registration with an invalid (zero) interface gtype", () => {
        class CustomObject extends GObject {
            hash(): number {
                return 0;
            }
        }

        expect(() =>
            registerClass(CustomObject, {
                gtypeName: uniqueName("GtkxBadInterfaceGtype"),
                interfaces: [{ gtype: INVALID_GTYPE }],
            }),
        ).toThrow(/interface gtype must be non-zero/);
    });
});
