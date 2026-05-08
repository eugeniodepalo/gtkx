import { findObjectProperty } from "@gtkx/native";
import { describe, expect, it } from "vitest";
import { ParamFlags } from "../src/generated/gobject/enums.js";
import {
    paramSpecBoolean,
    paramSpecString,
    signalEmitv,
    signalLookup,
    typeFromName,
    typeName,
    typeParent,
} from "../src/generated/gobject/functions.js";
import { Object as GObject } from "../src/generated/gobject/object.js";
import { Value as GValue } from "../src/generated/gobject/value.js";
import * as Gtk from "../src/generated/gtk/index.js";
import { findNativeClass, registerClass } from "../src/index.js";

let suffix = 0;
const uniqueName = (prefix: string): string => `${prefix}_${process.pid}_${++suffix}`;

const gtypeNone = (): number => typeFromName("void");
const gtypeString = (): number => typeFromName("gchararray");

const GOBJECT_CLASS_SET_PROPERTY_OFFSET = 24;
const GOBJECT_CLASS_GET_PROPERTY_OFFSET = 32;

const propertyAccessorArgTypes = [
    { type: "gobject", ownership: "borrowed" },
    { type: "uint32" },
    {
        type: "boxed",
        innerType: "GValue",
        ownership: "borrowed",
        library: "libgobject-2.0.so.0",
        getTypeFn: "g_value_get_type",
    },
    {
        type: "fundamental",
        ownership: "borrowed",
        library: "libgobject-2.0.so.0",
        refFn: "g_param_spec_ref_sink",
        unrefFn: "g_param_spec_unref",
        typeName: "GParam",
    },
] as const;

const noopPropertyAccessors = [
    {
        className: "GObjectClass",
        vfuncName: "set_property",
        byteOffset: GOBJECT_CLASS_SET_PROPERTY_OFFSET,
        argTypes: propertyAccessorArgTypes,
        returnType: { type: "void" } as const,
        fn: () => undefined,
    },
    {
        className: "GObjectClass",
        vfuncName: "get_property",
        byteOffset: GOBJECT_CLASS_GET_PROPERTY_OFFSET,
        argTypes: propertyAccessorArgTypes,
        returnType: { type: "void" } as const,
        fn: () => undefined,
    },
];

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

    it("installs a GParamSpec property that is discoverable on instances", () => {
        const name = uniqueName("GtkxPropertySubclass");
        class CustomObject extends GObject {}

        const pspec = paramSpecString("custom-prop", ParamFlags.READWRITE, "Custom Prop", "Custom property", "default");
        registerClass(CustomObject, {
            gtypeName: name,
            properties: [{ pspec }],
            vfuncs: noopPropertyAccessors,
        });

        const customGtype = typeFromName(name);
        const instance = GObject.newv(customGtype, []);
        const found = findObjectProperty(instance.handle, "custom-prop");
        expect(found).not.toBeNull();
    });

    it("installs multiple properties in the order provided", () => {
        const name = uniqueName("GtkxMultiPropertySubclass");
        class CustomObject extends GObject {}

        const stringSpec = paramSpecString("first", ParamFlags.READWRITE, null, null, null);
        const booleanSpec = paramSpecBoolean("second", false, ParamFlags.READWRITE, null, null);
        registerClass(CustomObject, {
            gtypeName: name,
            properties: [{ pspec: stringSpec }, { pspec: booleanSpec }],
            vfuncs: noopPropertyAccessors,
        });

        const customGtype = typeFromName(name);
        const instance = GObject.newv(customGtype, []);
        expect(findObjectProperty(instance.handle, "first")).not.toBeNull();
        expect(findObjectProperty(instance.handle, "second")).not.toBeNull();
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

    it("installs a vfunc trampoline without crashing class registration", () => {
        const name = uniqueName("GtkxVfuncSubclass");
        class CustomObject extends GObject {}

        registerClass(CustomObject, {
            gtypeName: name,
            vfuncs: [
                {
                    className: "GObjectClass",
                    vfuncName: "set_property",
                    byteOffset: GOBJECT_CLASS_SET_PROPERTY_OFFSET,
                    argTypes: propertyAccessorArgTypes,
                    returnType: { type: "void" },
                    fn: () => undefined,
                },
            ],
        });

        const customGtype = typeFromName(name);
        expect(customGtype).not.toBe(0);
        const instance = GObject.newv(customGtype, []);
        expect(instance).toBeDefined();
    });

    it("invokes the vfunc trampoline when the slot is dispatched by GObject", () => {
        const name = uniqueName("GtkxVfuncInvocationSubclass");
        class CustomObject extends GObject {}

        const setCalls: string[] = [];
        const pspec = paramSpecString("dispatched-prop", ParamFlags.READWRITE, null, null, null);
        registerClass(CustomObject, {
            gtypeName: name,
            properties: [{ pspec }],
            vfuncs: [
                {
                    className: "GObjectClass",
                    vfuncName: "set_property",
                    byteOffset: GOBJECT_CLASS_SET_PROPERTY_OFFSET,
                    argTypes: propertyAccessorArgTypes,
                    returnType: { type: "void" },
                    fn: (..._args: unknown[]) => {
                        setCalls.push("set_property invoked");
                    },
                },
                {
                    className: "GObjectClass",
                    vfuncName: "get_property",
                    byteOffset: GOBJECT_CLASS_GET_PROPERTY_OFFSET,
                    argTypes: propertyAccessorArgTypes,
                    returnType: { type: "void" },
                    fn: () => undefined,
                },
            ],
        });

        const customGtype = typeFromName(name);
        const instance = GObject.newv(customGtype, []) as unknown as {
            setProperty: (key: string, value: unknown) => void;
        };
        instance.setProperty("dispatched-prop", "hello world");

        expect(setCalls).toEqual(["set_property invoked"]);
    });

    it("rejects a vfunc whose offset is not pointer-aligned", () => {
        class CustomObject extends GObject {}

        expect(() =>
            registerClass(CustomObject, {
                gtypeName: uniqueName("GtkxMisalignedVfunc"),
                vfuncs: [
                    {
                        className: "GObjectClass",
                        vfuncName: "set_property",
                        byteOffset: 1,
                        argTypes: propertyAccessorArgTypes,
                        returnType: { type: "void" },
                        fn: () => undefined,
                    },
                ],
            }),
        ).toThrow(/not aligned to a pointer/);
    });

    it("rejects a vfunc whose offset exceeds the parent's class struct size", () => {
        class CustomObject extends GObject {}

        expect(() =>
            registerClass(CustomObject, {
                gtypeName: uniqueName("GtkxOversizedVfunc"),
                vfuncs: [
                    {
                        className: "GObjectClass",
                        vfuncName: "set_property",
                        byteOffset: 1_000_000,
                        argTypes: [],
                        returnType: { type: "void" },
                        fn: () => undefined,
                    },
                ],
            }),
        ).toThrow(/exceeds class size/);
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
});
