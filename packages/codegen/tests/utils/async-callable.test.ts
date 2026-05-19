import { describe, expect, it } from "vitest";
import {
    collectAsyncCallablePairs,
    findAsyncReadyCallbackParameter,
    resolveFinishCallableName,
} from "../../src/utils/async-callable.js";
import {
    createNormalizedFunction,
    createNormalizedMethod,
    createNormalizedParameter,
    createNormalizedType,
} from "../fixtures/gir-fixtures.js";

const asyncCallbackParameter = (typeName = "AsyncReadyCallback") =>
    createNormalizedParameter({
        name: "callback",
        type: createNormalizedType({ name: typeName, nullable: true }),
        scope: "async",
        closure: 1,
        nullable: true,
    });

describe("findAsyncReadyCallbackParameter", () => {
    it("finds a Gio-local AsyncReadyCallback parameter with async scope", () => {
        const method = createNormalizedMethod({
            name: "read_async",
            parameters: [asyncCallbackParameter("AsyncReadyCallback")],
        });
        expect(findAsyncReadyCallbackParameter(method)?.name).toBe("callback");
    });

    it("finds a Gio-qualified AsyncReadyCallback parameter", () => {
        const method = createNormalizedMethod({
            name: "load_async",
            parameters: [asyncCallbackParameter("Gio.AsyncReadyCallback")],
        });
        expect(findAsyncReadyCallbackParameter(method)).not.toBeNull();
    });

    it("ignores a callback parameter that lacks the async scope", () => {
        const method = createNormalizedMethod({
            name: "read_async",
            parameters: [
                createNormalizedParameter({
                    name: "callback",
                    type: createNormalizedType({ name: "AsyncReadyCallback" }),
                    scope: "call",
                }),
            ],
        });
        expect(findAsyncReadyCallbackParameter(method)).toBeNull();
    });

    it("ignores a callable with no async callback parameter", () => {
        const method = createNormalizedMethod({ name: "read_finish", parameters: [] });
        expect(findAsyncReadyCallbackParameter(method)).toBeNull();
    });
});

describe("resolveFinishCallableName", () => {
    it("uses the glib:finish-func name when present", () => {
        const method = createNormalizedMethod({
            name: "load_contents_async",
            finishFunc: "load_contents_finish",
            parameters: [asyncCallbackParameter()],
        });
        expect(resolveFinishCallableName(method)).toBe("load_contents_finish");
    });

    it("falls back to the *_async to *_finish convention", () => {
        const method = createNormalizedMethod({
            name: "read_async",
            parameters: [asyncCallbackParameter()],
        });
        expect(resolveFinishCallableName(method)).toBe("read_finish");
    });

    it("returns null for a non-async callable", () => {
        const method = createNormalizedMethod({ name: "read_finish", parameters: [] });
        expect(resolveFinishCallableName(method)).toBeNull();
    });
});

describe("collectAsyncCallablePairs", () => {
    it("pairs an async method with its companion finish method", () => {
        const asyncMethod = createNormalizedMethod({
            name: "read_async",
            finishFunc: "read_finish",
            parameters: [asyncCallbackParameter()],
        });
        const finishMethod = createNormalizedMethod({
            name: "read_finish",
            returnType: createNormalizedType({ name: "Gio.FileInputStream" }),
            parameters: [],
        });

        const pairs = collectAsyncCallablePairs([asyncMethod], [asyncMethod, finishMethod]);
        const pair = pairs.get("read_async");
        expect(pair?.finish).toBe(finishMethod);
        expect(pair?.callbackParameter.name).toBe("callback");
    });

    it("does not pair an async callable whose finish callable is absent", () => {
        const asyncMethod = createNormalizedMethod({
            name: "read_async",
            finishFunc: "read_finish",
            parameters: [asyncCallbackParameter()],
        });
        const pairs = collectAsyncCallablePairs([asyncMethod], [asyncMethod]);
        expect(pairs.size).toBe(0);
    });

    it("does not pair a callable merely named *_async without an async callback", () => {
        const fakeAsync = createNormalizedMethod({ name: "commit_async", parameters: [] });
        const finishMethod = createNormalizedMethod({ name: "commit_finish", parameters: [] });
        const pairs = collectAsyncCallablePairs([fakeAsync], [fakeAsync, finishMethod]);
        expect(pairs.size).toBe(0);
    });

    it("pairs standalone async functions with their finish functions", () => {
        const asyncFunction = createNormalizedFunction({
            name: "bus_get",
            finishFunc: "bus_get_finish",
            parameters: [asyncCallbackParameter()],
        });
        const finishFunction = createNormalizedFunction({
            name: "bus_get_finish",
            returnType: createNormalizedType({ name: "Gio.DBusConnection" }),
            parameters: [],
        });
        const pairs = collectAsyncCallablePairs([asyncFunction], [asyncFunction, finishFunction]);
        expect(pairs.get("bus_get")?.finish).toBe(finishFunction);
    });
});
