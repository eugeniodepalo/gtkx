import { describe, expect, it } from "vitest";
import { GirParameter } from "../../../src/gir/model/parameter.js";
import { GirType } from "../../../src/gir/model/type.js";

function makeType(name = "gint"): GirType {
    return new GirType({ name, isArray: false, elementType: null, nullable: false });
}

function makeParam(overrides: Partial<ConstructorParameters<typeof GirParameter>[0]> = {}): GirParameter {
    return new GirParameter({
        name: overrides.name ?? "value",
        type: overrides.type ?? makeType(),
        direction: overrides.direction ?? "in",
        callerAllocates: overrides.callerAllocates ?? false,
        nullable: overrides.nullable ?? false,
        optional: overrides.optional ?? false,
        scope: overrides.scope,
        closure: overrides.closure,
        destroy: overrides.destroy,
        transferOwnership: overrides.transferOwnership,
        varargs: overrides.varargs,
        doc: overrides.doc,
    });
}

describe("GirParameter (1)", () => {
    it("defaults varargs to false when omitted", () => {
        expect(makeParam().varargs).toBe(false);
    });

    it("retains varargs=true when explicitly provided", () => {
        expect(makeParam({ varargs: true }).varargs).toBe(true);
    });

    describe("isIn", () => {
        it("is true for direction in", () => {
            expect(makeParam({ direction: "in" }).isIn()).toBe(true);
        });

        it("is false for out and inout", () => {
            expect(makeParam({ direction: "out" }).isIn()).toBe(false);
            expect(makeParam({ direction: "inout" }).isIn()).toBe(false);
        });
    });

    describe("isOut", () => {
        it("is true for out and inout", () => {
            expect(makeParam({ direction: "out" }).isOut()).toBe(true);
            expect(makeParam({ direction: "inout" }).isOut()).toBe(true);
        });

        it("is false for in", () => {
            expect(makeParam({ direction: "in" }).isOut()).toBe(false);
        });
    });

    describe("isCallback", () => {
        it("is true when scope is set", () => {
            expect(makeParam({ scope: "async" }).isCallback()).toBe(true);
            expect(makeParam({ scope: "call" }).isCallback()).toBe(true);
        });

        it("is false when scope is undefined", () => {
            expect(makeParam().isCallback()).toBe(false);
        });
    });
});

describe("GirParameter (2)", () => {
    describe("isClosureData", () => {
        it("is true when closure is set, even to 0", () => {
            expect(makeParam({ closure: 0 }).isClosureData()).toBe(true);
            expect(makeParam({ closure: 2 }).isClosureData()).toBe(true);
        });

        it("is false when closure is undefined", () => {
            expect(makeParam().isClosureData()).toBe(false);
        });
    });

    describe("isDestroyNotify", () => {
        it("is true when destroy is set", () => {
            expect(makeParam({ destroy: 1 }).isDestroyNotify()).toBe(true);
        });

        it("is false when destroy is undefined", () => {
            expect(makeParam().isDestroyNotify()).toBe(false);
        });
    });

    describe("requiresCallerAllocation", () => {
        it("is true for out params with callerAllocates=true", () => {
            expect(makeParam({ direction: "out", callerAllocates: true }).requiresCallerAllocation()).toBe(true);
        });

        it("is false for in params even when callerAllocates is true", () => {
            expect(makeParam({ direction: "in", callerAllocates: true }).requiresCallerAllocation()).toBe(false);
        });

        it("is false for out params when callerAllocates is false", () => {
            expect(makeParam({ direction: "out", callerAllocates: false }).requiresCallerAllocation()).toBe(false);
        });
    });
});
