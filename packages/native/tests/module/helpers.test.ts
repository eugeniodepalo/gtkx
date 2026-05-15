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
import { createLabel, GOBJECT_BORROWED, GOBJECT_LIB, STRING, UINT64, VOID } from "./utils.js";

const G_TYPE_INVALID_NAME = "ThisGTypeDefinitelyDoesNotExist";

const typeFromName = (name: string): number =>
    Number(
        call(
            GOBJECT_LIB,
            "g_type_from_name",
            [{ type: { type: "string", ownership: "borrowed" }, value: name }],
            UINT64,
        ),
    );

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

    it("rejects registering the same GType name twice", () => {
        const name = uniqueName("GtkxNativeDuplicate");
        const gobjectGtype = typeFromName("GObject");

        expect(registerClass(name, gobjectGtype)).toBeGreaterThan(0);
        expect(() => registerClass(name, gobjectGtype)).toThrow();
    });

    it("returns zero for a GType name that has not been registered", () => {
        expect(typeFromName(G_TYPE_INVALID_NAME)).toBe(0);
    });

    it("accepts inherited-interface entries through the options builder", () => {
        createLabel("Init");
        const name = uniqueName("GtkxNativeInterfaceVfuncs");
        const widgetGtype = typeFromName("GtkWidget");
        const buildableGtype = typeFromName("GtkBuildable");
        expect(widgetGtype).toBeGreaterThan(0);
        expect(buildableGtype).toBeGreaterThan(0);

        const newGtype = registerClass(name, widgetGtype, {
            interfaceVfuncs: [{ gtype: buildableGtype, vfuncs: [] }],
        });

        expect(newGtype).toBeGreaterThan(0);

        const stillImplementsBuildable = call(
            GOBJECT_LIB,
            "g_type_is_a",
            [
                { type: UINT64, value: newGtype },
                { type: UINT64, value: buildableGtype },
            ],
            { type: "boolean" },
        );
        expect(stillImplementsBuildable).toBe(true);
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
