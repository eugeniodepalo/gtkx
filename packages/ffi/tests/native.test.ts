import { describe, expect, it } from "vitest";
import { Error as GError } from "../src/generated/glib/glib.js";
import type { GType } from "../src/generated/gobject/gobject.js";
import { typeFromName } from "../src/generated/gobject/gobject.js";
import * as Gtk from "../src/generated/gtk/gtk.js";
import { getNativeInterface, instanceIsA, NativeError } from "../src/index.js";

const orientableGType = (): GType => typeFromName("GtkOrientable");

const FILE_ERROR_DOMAIN = 0xbe1;
const FILE_ERROR_NOENT = 5;

describe("NativeError", () => {
    it("extends Error", () => {
        const gerror = GError.newLiteral(FILE_ERROR_DOMAIN, FILE_ERROR_NOENT, "missing file");
        const error = new NativeError(gerror);

        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(NativeError);
    });

    it("exposes the GError instance through the `gerror` property", () => {
        const gerror = GError.newLiteral(FILE_ERROR_DOMAIN, FILE_ERROR_NOENT, "missing file");
        const error = new NativeError(gerror);

        expect(error.gerror).toBe(gerror);
    });

    it("sets the error name to NativeError", () => {
        const gerror = GError.newLiteral(FILE_ERROR_DOMAIN, FILE_ERROR_NOENT, "missing file");
        const error = new NativeError(gerror);

        expect(error.name).toBe("NativeError");
    });

    it("uses the GError message for the Error message", () => {
        const gerror = GError.newLiteral(FILE_ERROR_DOMAIN, FILE_ERROR_NOENT, "missing file");
        const error = new NativeError(gerror);

        expect(error.message).toBe("missing file");
    });

    it("falls back to 'Unknown error' when the GError has no message", () => {
        const fakeGerror = { domain: FILE_ERROR_DOMAIN, code: FILE_ERROR_NOENT, message: null } as unknown as GError;
        const error = new NativeError(fakeGerror);

        expect(error.message).toBe("Unknown error");
    });

    it("returns the GError domain from getDomain()", () => {
        const gerror = GError.newLiteral(FILE_ERROR_DOMAIN, FILE_ERROR_NOENT, "missing file");
        const error = new NativeError(gerror);

        expect(error.getDomain()).toBe(FILE_ERROR_DOMAIN);
    });

    it("returns the GError code from getCode()", () => {
        const gerror = GError.newLiteral(FILE_ERROR_DOMAIN, FILE_ERROR_NOENT, "missing file");
        const error = new NativeError(gerror);

        expect(error.getCode()).toBe(FILE_ERROR_NOENT);
    });

    it("captures a stack trace pointing past the NativeError constructor", () => {
        const gerror = GError.newLiteral(FILE_ERROR_DOMAIN, FILE_ERROR_NOENT, "missing file");
        const error = new NativeError(gerror);

        expect(typeof error.stack).toBe("string");
        expect(error.stack ?? "").not.toContain("at new NativeError");
    });
});

describe("instanceIsA", () => {
    it("returns true when the instance derives from the requested GType", () => {
        const box = new Gtk.Box();
        const widgetGtype = typeFromName("GtkWidget");

        expect(instanceIsA(box.handle, widgetGtype)).toBe(true);
    });

    it("returns true when the instance implements an interface GType", () => {
        const box = new Gtk.Box();

        expect(instanceIsA(box.handle, orientableGType())).toBe(true);
    });

    it("returns false when the instance does not derive from the requested GType", () => {
        const label = new Gtk.Label({ label: "Test" });

        expect(instanceIsA(label.handle, orientableGType())).toBe(false);
    });
});

describe("getNativeInterface", () => {
    it("returns interface instance when object implements it", () => {
        const box = new Gtk.Box();
        const orientable = getNativeInterface(box, Gtk.Orientable, orientableGType());
        expect(orientable).not.toBeNull();
    });

    it("allows calling interface methods on returned instance", () => {
        const box = new Gtk.Box();
        const orientable = getNativeInterface(box, Gtk.Orientable, orientableGType());
        expect(orientable).not.toBeNull();
        expect(typeof orientable?.setOrientation).toBe("function");
    });

    it("returns null when object does not implement the interface", () => {
        const label = new Gtk.Label({ label: "Test" });
        const orientable = getNativeInterface(label, Gtk.Orientable, orientableGType());
        expect(orientable).toBeNull();
    });

    it("returns null when the object has no associated handle", () => {
        const obj = Object.create(Gtk.Button.prototype) as Gtk.Button;
        const result = getNativeInterface(obj, Gtk.Orientable, orientableGType());
        expect(result).toBeNull();
    });

    it("returns null when ifaceGType is zero", () => {
        const box = new Gtk.Box();
        const result = getNativeInterface(box, Gtk.Orientable, 0 as unknown as GType);
        expect(result).toBeNull();
    });
});
