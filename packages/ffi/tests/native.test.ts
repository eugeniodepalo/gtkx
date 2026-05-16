import { describe, expect, it } from "vitest";
import { FileError, Error as GError, quarkFromString } from "../src/generated/glib/glib.js";
import type { GType } from "../src/generated/gobject/gobject.js";
import { typeFromName } from "../src/generated/gobject/gobject.js";
import * as Gtk from "../src/generated/gtk/gtk.js";
import { getHandle } from "../src/handles.js";
import { getNativeInterface, instanceIsA, makeErrorDomain, NativeError } from "../src/native.js";

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

    it("exposes the GError domain and code as properties", () => {
        const gerror = GError.newLiteral(FILE_ERROR_DOMAIN, FILE_ERROR_NOENT, "missing file");
        const error = new NativeError(gerror);

        expect(error.domain).toBe(FILE_ERROR_DOMAIN);
        expect(error.code).toBe(FILE_ERROR_NOENT);
    });

    it("captures a stack trace pointing past the NativeError constructor", () => {
        const gerror = GError.newLiteral(FILE_ERROR_DOMAIN, FILE_ERROR_NOENT, "missing file");
        const error = new NativeError(gerror);

        expect(typeof error.stack).toBe("string");
        expect(error.stack ?? "").not.toContain("at new NativeError");
    });
});

describe("makeErrorDomain", () => {
    const nativeErrorIn = (domain: number): NativeError =>
        new NativeError(GError.newLiteral(domain, FILE_ERROR_NOENT, "missing file"));

    it("exposes the enum members", () => {
        const domain = makeErrorDomain(() => FILE_ERROR_DOMAIN, { NOENT: FILE_ERROR_NOENT });

        expect(domain.NOENT).toBe(FILE_ERROR_NOENT);
    });

    it("matches a NativeError thrown from the same domain via instanceof", () => {
        const domain = makeErrorDomain(() => FILE_ERROR_DOMAIN, { NOENT: FILE_ERROR_NOENT });

        expect(nativeErrorIn(FILE_ERROR_DOMAIN) instanceof domain).toBe(true);
    });

    it("rejects a NativeError from a different domain", () => {
        const domain = makeErrorDomain(() => FILE_ERROR_DOMAIN, { NOENT: FILE_ERROR_NOENT });

        expect(nativeErrorIn(FILE_ERROR_DOMAIN + 1) instanceof domain).toBe(false);
    });

    it("rejects values that are not a NativeError", () => {
        const domain = makeErrorDomain(() => FILE_ERROR_DOMAIN, { NOENT: FILE_ERROR_NOENT });

        expect(new Error("plain") instanceof domain).toBe(false);
    });

    it("matches a generated error-domain enum by its GLib quark", () => {
        const gerror = GError.newLiteral(quarkFromString("g-file-error-quark"), FileError.NOENT, "missing file");
        const error = new NativeError(gerror);

        expect(error instanceof FileError).toBe(true);
    });
});

describe("instanceIsA", () => {
    it("returns true when the instance derives from the requested GType", () => {
        const box = new Gtk.Box();
        const widgetGtype = typeFromName("GtkWidget");

        expect(instanceIsA(getHandle(box), widgetGtype)).toBe(true);
    });

    it("returns true when the instance implements an interface GType", () => {
        const box = new Gtk.Box();

        expect(instanceIsA(getHandle(box), orientableGType())).toBe(true);
    });

    it("returns false when the instance does not derive from the requested GType", () => {
        const label = new Gtk.Label({ label: "Test" });

        expect(instanceIsA(getHandle(label), orientableGType())).toBe(false);
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
