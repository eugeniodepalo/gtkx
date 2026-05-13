import { describe, expect, it } from "vitest";
import { GirSignal } from "../../../src/gir/model/signal.js";
import { GirType } from "../../../src/gir/model/type.js";

function makeType(name: string, isArray = false): GirType {
    return new GirType({ name, isArray, elementType: null, nullable: false });
}

describe("GirSignal", () => {
    it("exposes constructor data on read-only fields", () => {
        const returnType = makeType("gboolean");
        const signal = new GirSignal({
            name: "delete-event",
            when: "first",
            returnType,
            parameters: [],
            doc: "Emitted when the window is closed.",
        });
        expect(signal.name).toBe("delete-event");
        expect(signal.when).toBe("first");
        expect(signal.returnType).toBe(returnType);
        expect(signal.parameters).toEqual([]);
        expect(signal.doc).toBe("Emitted when the window is closed.");
    });

    describe("hasReturnValue", () => {
        it("returns true for a non-void return type", () => {
            const signal = new GirSignal({
                name: "delete-event",
                when: "first",
                returnType: makeType("gboolean"),
                parameters: [],
            });
            expect(signal.hasReturnValue()).toBe(true);
        });

        it("returns false when the return type is null", () => {
            const signal = new GirSignal({
                name: "clicked",
                when: "last",
                returnType: null,
                parameters: [],
            });
            expect(signal.hasReturnValue()).toBe(false);
        });

        it("returns false when the return type is void", () => {
            const signal = new GirSignal({
                name: "destroy",
                when: "cleanup",
                returnType: makeType("none"),
                parameters: [],
            });
            expect(signal.hasReturnValue()).toBe(false);
        });
    });
});
