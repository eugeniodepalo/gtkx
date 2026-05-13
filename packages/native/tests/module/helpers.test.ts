import { describe, expect, it } from "vitest";
import {
    call,
    findObjectProperty,
    freeze,
    getInstanceGType,
    getNativeId,
    type NativeHandle,
    registerClass,
    unfreeze,
} from "../../index.js";
import { createLabel, GOBJECT_BORROWED, GOBJECT_LIB, INT32, STRING, UINT32, UINT64, VOID } from "./utils.js";

const PARAM_READWRITE = 3;
const G_SIGNAL_RUN_LAST = 1 << 1;
const G_TYPE_INVALID_NAME = "ThisGTypeDefinitelyDoesNotExist";

const GVALUE_BOXED_BORROWED = {
    type: "boxed" as const,
    innerType: "GValue",
    library: "libgobject-2.0.so.0",
    getTypeFn: "g_value_get_type",
    ownership: "borrowed" as const,
};

const GPARAMSPEC_FULL = {
    type: "fundamental" as const,
    library: "libgobject-2.0.so.0",
    refFn: "g_param_spec_ref_sink",
    unrefFn: "g_param_spec_unref",
    ownership: "full" as const,
    typeName: "GParam",
};

const GPARAMSPEC_BORROWED = {
    ...GPARAMSPEC_FULL,
    ownership: "borrowed" as const,
};

const typeFromName = (name: string): number =>
    Number(
        call(
            GOBJECT_LIB,
            "g_type_from_name",
            [{ type: { type: "string", ownership: "borrowed" }, value: name }],
            UINT64,
        ),
    );

const paramSpecString = (
    name: string,
    nick: string,
    blurb: string,
    defaultValue: string,
    flags: number,
): NativeHandle =>
    call(
        GOBJECT_LIB,
        "g_param_spec_string",
        [
            { type: STRING, value: name },
            { type: STRING, value: nick },
            { type: STRING, value: blurb },
            { type: STRING, value: defaultValue },
            { type: UINT32, value: flags },
        ],
        GPARAMSPEC_FULL,
    ) as NativeHandle;

const gobjectClassVfunc = (byteOffset: number, fn: (...args: unknown[]) => unknown) => ({
    byteOffset,
    argTypes: [
        { type: "gobject" as const, ownership: "borrowed" as const },
        UINT32,
        GVALUE_BOXED_BORROWED,
        GPARAMSPEC_BORROWED,
    ],
    returnType: VOID,
    fn,
});

const NOOP_PROPERTY_VFUNCS = [gobjectClassVfunc(24, () => undefined), gobjectClassVfunc(32, () => undefined)];

let uniqueSuffix = 0;
const uniqueName = (prefix: string): string => `${prefix}NativeTest${process.pid}_${++uniqueSuffix}`;

describe("getInstanceGType", () => {
    it("returns the runtime GType of a GtkLabel instance", () => {
        const label = createLabel("Test") as NativeHandle;
        const gtype = getInstanceGType(label);

        expect(gtype).toBeGreaterThan(0);
        expect(gtype).toBe(typeFromName("GtkLabel"));
    });
});

describe("findObjectProperty", () => {
    it("returns a handle for a property that exists on the instance", () => {
        const label = createLabel("Test") as NativeHandle;
        const pspec = findObjectProperty(label, "label");

        expect(pspec).not.toBeNull();
        expect(pspec).toBeDefined();
        expect(typeof getNativeId(pspec as NativeHandle)).toBe("number");
    });

    it("returns null when the property name is unknown", () => {
        const label = createLabel("Test") as NativeHandle;

        expect(findObjectProperty(label, "this-property-does-not-exist")).toBeNull();
    });
});

describe("freeze and unfreeze", () => {
    it("can be called without arguments", () => {
        expect(() => {
            freeze();
            unfreeze();
        }).not.toThrow();
    });

    it("supports nested freeze/unfreeze pairs", () => {
        expect(() => {
            freeze();
            freeze();
            unfreeze();
            unfreeze();
        }).not.toThrow();
    });
});

describe("registerClass", () => {
    it("registers a new GType derived from GObject", () => {
        const name = uniqueName("GtkxNativeBare");
        const gobjectGtype = typeFromName("GObject");

        const newGtype = registerClass(name, gobjectGtype);

        expect(newGtype).toBeGreaterThan(0);
        expect(newGtype).toBe(typeFromName(name));
    });

    it("registers properties using the options builder", () => {
        const name = uniqueName("GtkxNativeProp");
        const gobjectGtype = typeFromName("GObject");
        const pspec = paramSpecString("native-prop", "Native Prop", "blurb", "default", PARAM_READWRITE);

        const newGtype = registerClass(name, gobjectGtype, {
            properties: [{ pspec }],
            vfuncs: NOOP_PROPERTY_VFUNCS,
        });

        expect(newGtype).toBeGreaterThan(0);
        expect(newGtype).toBe(typeFromName(name));
    });

    it("registers signals without a default handler (defaultHandler defaults to null)", () => {
        const name = uniqueName("GtkxNativeSignalNoHandler");
        const gobjectGtype = typeFromName("GObject");
        const gtypeNone = typeFromName("void");

        const newGtype = registerClass(name, gobjectGtype, {
            signals: [
                {
                    name: "ping",
                    flags: 0,
                    returnGType: gtypeNone,
                    paramGTypes: [],
                },
            ],
        });

        expect(newGtype).toBeGreaterThan(0);

        const signalId = call(
            GOBJECT_LIB,
            "g_signal_lookup",
            [
                { type: STRING, value: "ping" },
                { type: UINT64, value: newGtype },
            ],
            INT32,
        ) as number;

        expect(signalId).toBeGreaterThan(0);
    });

    it("registers signals with a default handler", () => {
        const name = uniqueName("GtkxNativeSignalHandler");
        const gobjectGtype = typeFromName("GObject");
        const gtypeNone = typeFromName("void");

        const newGtype = registerClass(name, gobjectGtype, {
            signals: [
                {
                    name: "echo",
                    flags: G_SIGNAL_RUN_LAST,
                    returnGType: gtypeNone,
                    paramGTypes: [],
                    defaultHandler: () => undefined,
                    defaultHandlerArgTypes: [{ type: "gobject", ownership: "borrowed" }],
                    defaultHandlerReturnType: VOID,
                },
            ],
        });

        expect(newGtype).toBeGreaterThan(0);
    });

    it("rejects registering the same GType name twice", () => {
        const name = uniqueName("GtkxNativeDuplicate");
        const gobjectGtype = typeFromName("GObject");

        expect(registerClass(name, gobjectGtype)).toBeGreaterThan(0);
        expect(() => registerClass(name, gobjectGtype)).toThrow();
    });

    it("returns zero for a GType name that has not been registered", () => {
        expect(typeFromName(G_TYPE_INVALID_NAME)).toBe(0);
    });

    it("forwards interface entries through the options builder", () => {
        const name = uniqueName("GtkxNativeInterfaceImpl");
        const gobjectGtype = typeFromName("GObject");
        const giconGtype = typeFromName("GIcon");
        expect(giconGtype).toBeGreaterThan(0);

        const newGtype = registerClass(name, gobjectGtype, {
            interfaces: [
                {
                    gtype: giconGtype,
                    vfuncs: [],
                },
            ],
        });

        expect(newGtype).toBeGreaterThan(0);

        const implementsIcon = call(
            GOBJECT_LIB,
            "g_type_is_a",
            [
                { type: UINT64, value: newGtype },
                { type: UINT64, value: giconGtype },
            ],
            { type: "boolean" },
        );
        expect(implementsIcon).toBe(true);
    });
});

describe("call argument unwrapping", () => {
    it("forwards a NativeHandle argument to a function expecting an object pointer", () => {
        const label = createLabel("Test") as NativeHandle;

        call(
            "libgtk-4.so.1",
            "gtk_label_set_text",
            [
                { type: GOBJECT_BORROWED, value: label },
                { type: STRING, value: "Updated" },
            ],
            VOID,
        );

        const text = call("libgtk-4.so.1", "gtk_label_get_text", [{ type: GOBJECT_BORROWED, value: label }], {
            type: "string",
            ownership: "borrowed",
        });

        expect(text).toBe("Updated");
    });
});
