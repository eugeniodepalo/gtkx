import { describe, expect, it } from "vitest";
import { FfiMapper } from "../../../../src/core/type-system/ffi-mapper.js";
import { classifyVfunc } from "../../../../src/ffi/generators/class-struct/vfunc-filter.js";
import {
    createNormalizedCallback,
    createNormalizedField,
    createNormalizedNamespace,
    createNormalizedParameter,
    createNormalizedType,
} from "../../../fixtures/gir-fixtures.js";
import { createMockRepository } from "../../../fixtures/mock-repository.js";

function createMapper() {
    const ns = createNormalizedNamespace({ name: "GObject" });
    const repo = createMockRepository(new Map([["GObject", ns]]));
    return new FfiMapper(repo as ConstructorParameters<typeof FfiMapper>[0], "GObject");
}

describe("classifyVfunc", () => {
    it("rejects fields with no callback", () => {
        const field = createNormalizedField({ name: "padding", type: createNormalizedType({ name: "gpointer" }) });
        expect(classifyVfunc(field, createMapper())).toEqual({ eligible: false, reason: "no-callback" });
    });

    it('rejects callbacks marked introspectable="0"', () => {
        const field = createNormalizedField({
            name: "constructor",
            type: createNormalizedType({ name: "gpointer" }),
            callback: createNormalizedCallback({
                name: "constructor",
                returnType: createNormalizedType({ name: "none" }),
                parameters: [],
                introspectable: false,
            }),
        });
        expect(classifyVfunc(field, createMapper())).toEqual({ eligible: false, reason: "not-introspectable" });
    });

    it("rejects callbacks with out parameters that are not caller-allocated", () => {
        const field = createNormalizedField({
            name: "get_size",
            type: createNormalizedType({ name: "gpointer" }),
            callback: createNormalizedCallback({
                name: "get_size",
                returnType: createNormalizedType({ name: "none" }),
                parameters: [
                    createNormalizedParameter({
                        name: "out_size",
                        direction: "out",
                        callerAllocates: false,
                        type: createNormalizedType({ name: "gint" }),
                    }),
                ],
            }),
        });
        expect(classifyVfunc(field, createMapper())).toEqual({
            eligible: false,
            reason: "out-param-no-caller-allocates",
        });
    });

    it("accepts callbacks whose every parameter and return type maps cleanly", () => {
        const field = createNormalizedField({
            name: "finalize",
            type: createNormalizedType({ name: "gpointer" }),
            callback: createNormalizedCallback({
                name: "finalize",
                returnType: createNormalizedType({ name: "none" }),
                parameters: [],
            }),
        });
        const result = classifyVfunc(field, createMapper());
        expect(result.eligible).toBe(true);
    });
});
