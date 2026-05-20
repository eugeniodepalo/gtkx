import { describe, expect, it } from "vitest";
import { GirConstructor, GirFunction, GirMethod } from "../../../src/gir/model/callables.js";
import { createNormalizedParameter, createNormalizedType } from "../../fixtures/gir-fixtures.js";

const makeType = (name: string) => createNormalizedType({ name });
const makeParam = createNormalizedParameter;

describe("GirCallable (via GirMethod) / getRequiredParameters", () => {
    it("returns only non-optional, non-nullable input params", () => {
        const required = makeParam({ name: "width" });
        const optional = makeParam({ name: "label", optional: true });
        const nullable = makeParam({ name: "child", nullable: true });
        const out = makeParam({ name: "result", direction: "out" });
        const method = new GirMethod({
            name: "configure",
            cIdentifier: "gtk_widget_configure",
            returnType: makeType("none"),
            parameters: [required, optional, nullable, out],
            throws: false,
        });
        expect(method.getRequiredParameters()).toEqual([required]);
    });
});

describe("GirCallable (via GirMethod) / isAsync", () => {
    it("returns true when the method name ends in _async", () => {
        const method = new GirMethod({
            name: "load_async",
            cIdentifier: "gtk_loader_load_async",
            returnType: makeType("none"),
            parameters: [],
            throws: false,
        });
        expect(method.isAsync()).toBe(true);
    });

    it("returns true when any parameter has scope=async", () => {
        const callback = makeParam({ name: "cb", scope: "async" });
        const method = new GirMethod({
            name: "load_with_callback",
            cIdentifier: "gtk_loader_load_with_callback",
            returnType: makeType("none"),
            parameters: [callback],
            throws: false,
        });
        expect(method.isAsync()).toBe(true);
    });

    it("returns false for plain synchronous methods", () => {
        const method = new GirMethod({
            name: "get_size",
            cIdentifier: "gtk_widget_get_size",
            returnType: makeType("none"),
            parameters: [],
            throws: false,
        });
        expect(method.isAsync()).toBe(false);
    });
});

describe("GirMethod (1)", () => {
    it("retains optional instanceParameter and finishFunc fields", () => {
        const instance = makeParam({ name: "self", type: makeType("Gtk.Widget") });
        const method = new GirMethod({
            name: "show",
            cIdentifier: "gtk_widget_show",
            returnType: makeType("none"),
            parameters: [],
            throws: false,
            instanceParameter: instance,
            finishFunc: "gtk_widget_show_finish",
        });
        expect(method.instanceParameter).toBe(instance);
        expect(method.finishFunc).toBe("gtk_widget_show_finish");
    });

    describe("isAsyncFinish", () => {
        it("returns true for names ending in _finish", () => {
            const method = new GirMethod({
                name: "load_finish",
                cIdentifier: "gtk_loader_load_finish",
                returnType: makeType("gboolean"),
                parameters: [],
                throws: false,
            });
            expect(method.isAsyncFinish()).toBe(true);
        });

        it("returns false for names without the _finish suffix", () => {
            const method = new GirMethod({
                name: "finalize",
                cIdentifier: "gtk_widget_finalize",
                returnType: makeType("none"),
                parameters: [],
                throws: false,
            });
            expect(method.isAsyncFinish()).toBe(false);
        });
    });
});

describe("GirMethod (2)", () => {
    describe("getFinishMethodName", () => {
        it("returns the _finish counterpart for _async methods", () => {
            const method = new GirMethod({
                name: "load_async",
                cIdentifier: "gtk_loader_load_async",
                returnType: makeType("none"),
                parameters: [],
                throws: false,
            });
            expect(method.getFinishMethodName()).toBe("load_finish");
        });

        it("returns null for non-async methods", () => {
            const method = new GirMethod({
                name: "get_size",
                cIdentifier: "gtk_widget_get_size",
                returnType: makeType("none"),
                parameters: [],
                throws: false,
            });
            expect(method.getFinishMethodName()).toBeNull();
        });
    });

    describe("getOptionalParameters", () => {
        it("returns params that are either optional or nullable", () => {
            const required = makeParam({ name: "width" });
            const optional = makeParam({ name: "label", optional: true });
            const nullable = makeParam({ name: "child", nullable: true });
            const method = new GirMethod({
                name: "configure",
                cIdentifier: "gtk_widget_configure",
                returnType: makeType("none"),
                parameters: [required, optional, nullable],
                throws: false,
            });
            expect(method.getOptionalParameters()).toEqual([optional, nullable]);
        });
    });
});

describe("GirMethod (3)", () => {
    describe("out parameter helpers", () => {
        it("hasOutParameters and getOutParameters cover both out and inout", () => {
            const inParam = makeParam({ name: "input" });
            const outParam = makeParam({ name: "out_val", direction: "out" });
            const inoutParam = makeParam({ name: "inout_val", direction: "inout" });
            const method = new GirMethod({
                name: "compute",
                cIdentifier: "gtk_widget_compute",
                returnType: makeType("none"),
                parameters: [inParam, outParam, inoutParam],
                throws: false,
            });
            expect(method.hasOutParameters()).toBe(true);
            expect(method.getOutParameters()).toEqual([outParam, inoutParam]);
        });

        it("hasOutParameters returns false when there are no out/inout params", () => {
            const method = new GirMethod({
                name: "simple",
                cIdentifier: "gtk_simple",
                returnType: makeType("none"),
                parameters: [makeParam({ name: "in_val" })],
                throws: false,
            });
            expect(method.hasOutParameters()).toBe(false);
            expect(method.getOutParameters()).toEqual([]);
        });
    });
});

describe("GirConstructor and GirFunction", () => {
    it("are constructible with shared callable data", () => {
        const ctor = new GirConstructor({
            name: "new",
            cIdentifier: "gtk_widget_new",
            returnType: makeType("Gtk.Widget"),
            parameters: [],
            throws: false,
        });
        const fn = new GirFunction({
            name: "default",
            cIdentifier: "gtk_widget_get_default",
            returnType: makeType("Gtk.Widget"),
            parameters: [],
            throws: false,
        });
        expect(ctor.name).toBe("new");
        expect(fn.name).toBe("default");
    });
});
