import { describe, expect, it } from "vitest";
import { buildCallableShape } from "../../src/ffi-emitters/callable-shape.js";
import { GirParameter, GirType } from "../../src/gir/index.js";
import type { FfiMapper } from "../../src/type-system/ffi-mapper.js";
import type { MappedType } from "../../src/type-system/ffi-types.js";

const VOID_RETURN: MappedType = { ts: "void", ffi: { type: "void" }, imports: [] };

const makeType = (name: string): GirType => new GirType({ name, isArray: false, elementType: null, nullable: false });

type ParamInit = {
    name: string;
    direction?: "in" | "out" | "inout";
    callerAllocates?: boolean;
    nullable?: boolean;
    optional?: boolean;
    typeName?: string;
};

const makeParam = (init: ParamInit): GirParameter =>
    new GirParameter({
        name: init.name,
        type: makeType(init.typeName ?? init.name),
        direction: init.direction ?? "in",
        callerAllocates: init.callerAllocates ?? false,
        nullable: init.nullable ?? false,
        optional: init.optional ?? false,
    });

class FakeFfiMapper {
    private readonly mappings = new Map<GirParameter, MappedType>();
    private readonly closureTargets = new Set<GirParameter>();
    private readonly locallyAllocatable = new Set<string>();

    setMapping(param: GirParameter, mapped: MappedType): this {
        this.mappings.set(param, mapped);
        return this;
    }

    markClosureTarget(param: GirParameter): this {
        this.closureTargets.add(param);
        return this;
    }

    allowLocalAllocation(typeName: string): this {
        this.locallyAllocatable.add(typeName);
        return this;
    }

    mapParameter(param: GirParameter): MappedType {
        const mapped = this.mappings.get(param);
        if (!mapped) {
            throw new Error(`No mapping for parameter ${param.name}`);
        }
        return mapped;
    }

    isClosureTarget(param: GirParameter): boolean {
        return this.closureTargets.has(param);
    }

    canAllocateLocally(typeName: string): boolean {
        return this.locallyAllocatable.has(typeName);
    }

    findFactoryCIdentifier(): string | null {
        return null;
    }

    asMapper(): FfiMapper {
        return this as unknown as FfiMapper;
    }
}

describe("buildCallableShape — input parameters (1)", () => {
    it("emits a signature param and a wire arg for a plain primitive input", () => {
        const param = makeParam({ name: "value", typeName: "gint" });
        const mapper = new FakeFfiMapper().setMapping(param, {
            ts: "number",
            ffi: { type: "int32" },
            imports: [],
        });

        const shape = buildCallableShape({
            parameters: [param],
            returnTypeMapping: VOID_RETURN,
            returnNullable: false,
            sizeParamOffset: 0,
            ffiMapper: mapper.asMapper(),
        });

        expect(shape.signatureParams).toEqual([{ name: "value", tsType: "number", optional: false }]);
        expect(shape.callArgs).toEqual([
            {
                ffi: { type: "int32" },
                value: "value",
                optional: false,
                sourceParamIndex: 0,
            },
        ]);
        expect(shape.hiddenOuts).toEqual([]);
        expect(shape.returnTupleEntries).toEqual([]);
    });
});

describe("buildCallableShape — input parameters (2)", () => {
    it("passes getHandle for gobject inputs and tryGetHandle when nullable", () => {
        const required = makeParam({ name: "widget", typeName: "Gtk.Widget" });
        const nullable = makeParam({ name: "parent", typeName: "Gtk.Widget", nullable: true });
        const mapper = new FakeFfiMapper()
            .setMapping(required, {
                ts: "Gtk.Widget",
                ffi: { type: "gobject", ownership: "borrowed" },
                imports: [],
            })
            .setMapping(nullable, {
                ts: "Gtk.Widget",
                ffi: { type: "gobject", ownership: "borrowed" },
                imports: [],
            });

        const shape = buildCallableShape({
            parameters: [required, nullable],
            returnTypeMapping: VOID_RETURN,
            returnNullable: false,
            sizeParamOffset: 0,
            ffiMapper: mapper.asMapper(),
        });

        expect(shape.callArgs[0]?.value).toBe("getHandle(widget)");
        expect(shape.callArgs[1]?.value).toBe("tryGetHandle(parent)");
    });

    it("calls getHandle without a cast when the mapped TS type is unknown", () => {
        const param = makeParam({ name: "anything" });
        const mapper = new FakeFfiMapper().setMapping(param, {
            ts: "unknown",
            ffi: { type: "boxed", ownership: "borrowed", innerType: "Foo" },
            imports: [],
        });

        const shape = buildCallableShape({
            parameters: [param],
            returnTypeMapping: VOID_RETURN,
            returnNullable: false,
            sizeParamOffset: 0,
            ffiMapper: mapper.asMapper(),
        });

        expect(shape.callArgs[0]?.value).toBe("getHandle(anything)");
    });
});

describe("buildCallableShape — input parameters (3)", () => {
    it("maps array-of-handle inputs to .map(item => getHandle(item))", () => {
        const param = makeParam({ name: "widgets", typeName: "Gtk.Widget" });
        const mapper = new FakeFfiMapper().setMapping(param, {
            ts: "Gtk.Widget[]",
            ffi: { type: "array", kind: "array", itemType: { type: "gobject", ownership: "borrowed" } },
            imports: [],
        });

        const shape = buildCallableShape({
            parameters: [param],
            returnTypeMapping: VOID_RETURN,
            returnNullable: false,
            sizeParamOffset: 0,
            ffiMapper: mapper.asMapper(),
        });

        expect(shape.callArgs[0]?.value).toBe("widgets.map(item => getHandle(item))");
    });

    it("converts hashtable inputs of handle-backed values to entry arrays", () => {
        const param = makeParam({ name: "lookup" });
        const mapper = new FakeFfiMapper().setMapping(param, {
            ts: "Map<string, Gtk.Widget>",
            ffi: {
                type: "hashtable",
                keyType: { type: "string", ownership: "borrowed" },
                valueType: { type: "gobject", ownership: "borrowed" },
            },
            imports: [],
        });

        const shape = buildCallableShape({
            parameters: [param],
            returnTypeMapping: VOID_RETURN,
            returnNullable: false,
            sizeParamOffset: 0,
            ffiMapper: mapper.asMapper(),
        });

        expect(shape.callArgs[0]?.value).toBe(
            "lookup ? globalThis.Array.from(lookup).map(([k, v]) => [k, tryGetHandle(v)]) : null",
        );
    });
});

describe("buildCallableShape — input parameters (4)", () => {
    it("converts hashtable inputs of primitives to a plain entry array", () => {
        const param = makeParam({ name: "dict" });
        const mapper = new FakeFfiMapper().setMapping(param, {
            ts: "Map<string, string>",
            ffi: {
                type: "hashtable",
                keyType: { type: "string", ownership: "borrowed" },
                valueType: { type: "string", ownership: "borrowed" },
            },
            imports: [],
        });

        const shape = buildCallableShape({
            parameters: [param],
            returnTypeMapping: VOID_RETURN,
            returnNullable: false,
            sizeParamOffset: 0,
            ffiMapper: mapper.asMapper(),
        });

        expect(shape.callArgs[0]?.value).toBe("dict ? globalThis.Array.from(dict) : null");
    });
});

describe("buildCallableShape — length parameters (1)", () => {
    function buildArrayWithLength(opts: { dataNullable?: boolean }): { array: GirParameter; len: GirParameter } {
        const array = new GirParameter({
            name: "items",
            type: new GirType({
                name: "gint",
                isArray: true,
                elementType: makeType("gint"),
                nullable: false,
                sizeParamIndex: 1,
            }),
            direction: "in",
            callerAllocates: false,
            nullable: opts.dataNullable ?? false,
            optional: false,
        });
        const len = makeParam({ name: "n_items", typeName: "gint" });
        return { array, len };
    }

    it("hides a length parameter and synthesizes its value from the data array length", () => {
        const { array, len } = buildArrayWithLength({});
        const mapper = new FakeFfiMapper()
            .setMapping(array, {
                ts: "number[]",
                ffi: {
                    type: "array",
                    kind: "array",
                    itemType: { type: "int32" },
                    sizeParamIndex: 1,
                },
                imports: [],
            })
            .setMapping(len, { ts: "number", ffi: { type: "int32" }, imports: [] });

        const shape = buildCallableShape({
            parameters: [array, len],
            returnTypeMapping: VOID_RETURN,
            returnNullable: false,
            sizeParamOffset: 0,
            ffiMapper: mapper.asMapper(),
        });

        expect(shape.signatureParams.map((p) => p.name)).toEqual(["items"]);
        expect(shape.callArgs[1]?.value).toBe("items.length");
    });
});

describe("buildCallableShape — length parameters (2)", () => {
    function buildArrayWithLength(opts: { dataNullable?: boolean }): { array: GirParameter; len: GirParameter } {
        const array = new GirParameter({
            name: "items",
            type: new GirType({
                name: "gint",
                isArray: true,
                elementType: makeType("gint"),
                nullable: false,
                sizeParamIndex: 1,
            }),
            direction: "in",
            callerAllocates: false,
            nullable: opts.dataNullable ?? false,
            optional: false,
        });
        const len = makeParam({ name: "n_items", typeName: "gint" });
        return { array, len };
    }

    it("guards length expressions when the data array is nullable", () => {
        const { array, len } = buildArrayWithLength({ dataNullable: true });
        const mapper = new FakeFfiMapper()
            .setMapping(array, {
                ts: "number[]",
                ffi: {
                    type: "array",
                    kind: "array",
                    itemType: { type: "int32" },
                    sizeParamIndex: 1,
                },
                imports: [],
            })
            .setMapping(len, { ts: "number", ffi: { type: "int32" }, imports: [] });

        const shape = buildCallableShape({
            parameters: [array, len],
            returnTypeMapping: VOID_RETURN,
            returnNullable: false,
            sizeParamOffset: 0,
            ffiMapper: mapper.asMapper(),
        });

        expect(shape.callArgs[1]?.value).toBe("(items?.length ?? 0)");
    });
});

describe("buildCallableShape — length parameters (3)", () => {
    it("falls back to length-with-optional-chain for non-array, non-string data mappings", () => {
        const data = new GirParameter({
            name: "buf",
            type: new GirType({
                name: "GBytes",
                isArray: false,
                elementType: null,
                nullable: false,
                sizeParamIndex: 1,
            }),
            direction: "in",
            callerAllocates: false,
            nullable: false,
            optional: false,
        });
        const len = makeParam({ name: "len", typeName: "gsize" });

        const mapper = new FakeFfiMapper()
            .setMapping(data, {
                ts: "GBytes",
                ffi: {
                    type: "array",
                    kind: "array",
                    itemType: { type: "uint8" },
                    sizeParamIndex: 1,
                },
                imports: [],
            })
            .setMapping(len, { ts: "number", ffi: { type: "int32" }, imports: [] });

        const shape = buildCallableShape({
            parameters: [data, len],
            returnTypeMapping: VOID_RETURN,
            returnNullable: false,
            sizeParamOffset: 0,
            ffiMapper: mapper.asMapper(),
        });

        expect(shape.callArgs[1]?.value).toBe("buf.length");
    });
});

describe("buildCallableShape — out parameters (1)", () => {
    it("hides a primitive out param and surfaces it as a return-tuple entry", () => {
        const out = makeParam({ name: "result", direction: "out", typeName: "gint" });
        const mapper = new FakeFfiMapper().setMapping(out, {
            ts: "number",
            ffi: { type: "ref", innerType: { type: "int32" } },
            innerTsType: "number",
            imports: [],
        });

        const shape = buildCallableShape({
            parameters: [out],
            returnTypeMapping: VOID_RETURN,
            returnNullable: false,
            sizeParamOffset: 0,
            ffiMapper: mapper.asMapper(),
        });

        expect(shape.signatureParams).toEqual([]);
        expect(shape.hiddenOuts).toHaveLength(1);
        expect(shape.hiddenOuts[0]?.kind).toBe("ref-primitive");
        expect(shape.hiddenOuts[0]?.initialValue).toBe("0");
        expect(shape.returnTupleEntries).toEqual([{ kind: "out-param", tsType: "number", nullable: false }]);
    });

    it("surfaces an inout primitive in the public signature and seeds the ref with the caller value", () => {
        const inout = makeParam({ name: "value", direction: "inout", typeName: "gint" });
        const mapper = new FakeFfiMapper().setMapping(inout, {
            ts: "number",
            ffi: { type: "ref", innerType: { type: "int32" } },
            innerTsType: "number",
            imports: [],
        });

        const shape = buildCallableShape({
            parameters: [inout],
            returnTypeMapping: VOID_RETURN,
            returnNullable: false,
            sizeParamOffset: 0,
            ffiMapper: mapper.asMapper(),
        });

        expect(shape.signatureParams).toEqual([{ name: "value", tsType: "number", optional: false }]);
        expect(shape.hiddenOuts[0]?.kind).toBe("ref-primitive-inout");
        expect(shape.hiddenOuts[0]?.initialValue).toBe("value");
        expect(shape.returnTupleEntries).toEqual([{ kind: "inout-param", tsType: "number", nullable: false }]);
    });
});

describe("buildCallableShape — out parameters (2)", () => {
    it("uses a fallback default when the inout primitive caller value may be omitted", () => {
        const inout = makeParam({
            name: "value",
            direction: "inout",
            typeName: "gint",
            nullable: true,
        });
        const mapper = new FakeFfiMapper().setMapping(inout, {
            ts: "number",
            ffi: { type: "ref", innerType: { type: "int32" } },
            innerTsType: "number",
            imports: [],
        });

        const shape = buildCallableShape({
            parameters: [inout],
            returnTypeMapping: VOID_RETURN,
            returnNullable: false,
            sizeParamOffset: 0,
            ffiMapper: mapper.asMapper(),
        });

        expect(shape.hiddenOuts[0]?.initialValue).toBe("value ?? 0");
    });
});

describe("buildCallableShape — out parameters (3)", () => {
    it("treats inout non-ref params as plain inputs that surface in the signature", () => {
        const inout = makeParam({
            name: "widget",
            direction: "inout",
            typeName: "Gtk.Widget",
        });
        const mapper = new FakeFfiMapper().setMapping(inout, {
            ts: "Gtk.Widget",
            ffi: { type: "gobject", ownership: "borrowed" },
            imports: [],
        });

        const shape = buildCallableShape({
            parameters: [inout],
            returnTypeMapping: VOID_RETURN,
            returnNullable: false,
            sizeParamOffset: 0,
            ffiMapper: mapper.asMapper(),
        });

        expect(shape.signatureParams).toEqual([{ name: "widget", tsType: "Gtk.Widget", optional: false }]);
        expect(shape.hiddenOuts).toEqual([]);
        expect(shape.callArgs[0]?.value).toBe("getHandle(widget)");
    });
});

describe("buildCallableShape — out parameters (4)", () => {
    it("allocates an opaque caller-allocates out param via the public signature", () => {
        const out = makeParam({
            name: "ev",
            direction: "out",
            callerAllocates: true,
            typeName: "GdkEvent",
        });
        const mapper = new FakeFfiMapper().setMapping(out, {
            ts: "Gdk.Event",
            ffi: { type: "boxed", ownership: "borrowed", innerType: "GdkEvent" },
            imports: [],
        });

        const shape = buildCallableShape({
            parameters: [out],
            returnTypeMapping: VOID_RETURN,
            returnNullable: false,
            sizeParamOffset: 0,
            ffiMapper: mapper.asMapper(),
        });

        expect(shape.signatureParams).toEqual([{ name: "ev", tsType: "Gdk.Event", optional: false }]);
        expect(shape.hiddenOuts).toEqual([]);
        expect(shape.callArgs[0]?.value).toBe("getHandle(ev)");
        expect(shape.returnTupleEntries).toEqual([]);
    });
});

describe("buildCallableShape — out parameters (5)", () => {
    it("uses a ref-handle hidden allocation when the out param targets a gobject", () => {
        const out = makeParam({
            name: "result",
            direction: "out",
            typeName: "Gtk.Widget",
        });
        const mapper = new FakeFfiMapper().setMapping(out, {
            ts: "Gtk.Widget",
            ffi: { type: "ref", innerType: { type: "gobject", ownership: "full" } },
            innerTsType: "Gtk.Widget",
            imports: [],
        });

        const shape = buildCallableShape({
            parameters: [out],
            returnTypeMapping: VOID_RETURN,
            returnNullable: false,
            sizeParamOffset: 0,
            ffiMapper: mapper.asMapper(),
        });

        expect(shape.hiddenOuts).toHaveLength(1);
        expect(shape.hiddenOuts[0]?.kind).toBe("ref-handle");
        expect(shape.hiddenOuts[0]?.initialValue).toBe("null");
        expect(shape.hiddenOuts[0]?.varName).toBe("resultRef");
    });
});

describe("buildCallableShape — out parameters (6)", () => {
    it("widens the ref-handle TS type to a nullable union when the out param is nullable", () => {
        const out = makeParam({
            name: "maybe",
            direction: "out",
            typeName: "Gtk.Widget",
            nullable: true,
        });
        const mapper = new FakeFfiMapper().setMapping(out, {
            ts: "Gtk.Widget",
            ffi: { type: "ref", innerType: { type: "gobject", ownership: "full" } },
            innerTsType: "Gtk.Widget",
            imports: [],
        });

        const shape = buildCallableShape({
            parameters: [out],
            returnTypeMapping: VOID_RETURN,
            returnNullable: false,
            sizeParamOffset: 0,
            ffiMapper: mapper.asMapper(),
        });

        expect(shape.hiddenOuts[0]?.tsType).toBe("Gtk.Widget | null");
        expect(shape.returnTupleEntries[0]?.nullable).toBe(true);
    });
});

describe("buildCallableShape — out parameters (7)", () => {
    it("uses an alloc-struct hidden allocation for caller-allocates structs the mapper can locally allocate", () => {
        const out = makeParam({
            name: "rect",
            direction: "out",
            callerAllocates: true,
            typeName: "Graphene.Rect",
        });
        const mapper = new FakeFfiMapper()
            .setMapping(out, {
                ts: "Graphene.Rect",
                ffi: { type: "boxed", ownership: "borrowed", innerType: "GrapheneRect" },
                imports: [],
            })
            .allowLocalAllocation("Graphene.Rect");

        const shape = buildCallableShape({
            parameters: [out],
            returnTypeMapping: VOID_RETURN,
            returnNullable: false,
            sizeParamOffset: 0,
            ffiMapper: mapper.asMapper(),
        });

        expect(shape.hiddenOuts).toHaveLength(1);
        expect(shape.hiddenOuts[0]?.kind).toBe("alloc-struct");
        expect(shape.hiddenOuts[0]?.varName).toBe("rectRef");
        expect(shape.callArgs[0]?.value).toBe("getHandle(rectRef)");
    });
});

describe("buildCallableShape — return tuple", () => {
    it("places the original return value first when there are also out params", () => {
        const out = makeParam({ name: "extra", direction: "out", typeName: "gint" });
        const mapper = new FakeFfiMapper().setMapping(out, {
            ts: "number",
            ffi: { type: "ref", innerType: { type: "int32" } },
            innerTsType: "number",
            imports: [],
        });

        const shape = buildCallableShape({
            parameters: [out],
            returnTypeMapping: { ts: "boolean", ffi: { type: "boolean" }, imports: [] },
            returnNullable: false,
            sizeParamOffset: 0,
            ffiMapper: mapper.asMapper(),
        });

        expect(shape.returnTupleEntries).toEqual([
            { kind: "original-return", tsType: "boolean", nullable: false },
            { kind: "out-param", tsType: "number", nullable: false },
        ]);
    });

    it("preserves GIR parameter order in the signature without reordering", () => {
        const required = makeParam({ name: "first", typeName: "gint" });
        const opt = makeParam({ name: "second", typeName: "gint", optional: true });
        const mapper = new FakeFfiMapper()
            .setMapping(required, { ts: "number", ffi: { type: "int32" }, imports: [] })
            .setMapping(opt, { ts: "number", ffi: { type: "int32" }, imports: [] });

        const shape = buildCallableShape({
            parameters: [opt, required],
            returnTypeMapping: VOID_RETURN,
            returnNullable: false,
            sizeParamOffset: 0,
            ffiMapper: mapper.asMapper(),
        });

        expect(shape.signatureParams.map((p) => p.name)).toEqual(["second", "first"]);
        expect(shape.signatureParams.find((p) => p.name === "second")?.optional).toBeFalsy();
    });
});

describe("buildCallableShape — filtering", () => {
    it("filters out closure target parameters (user_data) from the public surface", () => {
        const callback = makeParam({ name: "handler" });
        const userData = makeParam({ name: "userData" });
        const mapper = new FakeFfiMapper()
            .setMapping(callback, {
                ts: "() => void",
                ffi: { type: "callback", argTypes: [], returnType: { type: "void" } },
                imports: [],
            })
            .setMapping(userData, { ts: "number", ffi: { type: "uint64" }, imports: [] })
            .markClosureTarget(userData);

        const shape = buildCallableShape({
            parameters: [callback, userData],
            returnTypeMapping: VOID_RETURN,
            returnNullable: false,
            sizeParamOffset: 0,
            ffiMapper: mapper.asMapper(),
        });

        expect(shape.signatureParams.map((p) => p.name)).toEqual(["handler"]);
        expect(shape.callArgs).toHaveLength(1);
    });
});
