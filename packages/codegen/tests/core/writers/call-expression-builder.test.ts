import { describe, expect, it } from "vitest";
import { Writer } from "../../../src/builders/writer.js";
import type { MappedType } from "../../../src/core/type-system/ffi-types.js";
import {
    CallExpressionBuilder,
    type CallExpressionOptions,
} from "../../../src/core/writers/call-expression-builder.js";
import { FfiDescriptorRegistry } from "../../../src/core/writers/descriptor-registry.js";

function getCallExpressionOutput(builder: CallExpressionBuilder, options: CallExpressionOptions): string {
    const writer = new Writer();
    builder.toWriter(options)(writer);
    return writer.toString();
}

function getWriterOutput(fn: (writer: Writer) => void): string {
    const writer = new Writer();
    fn(writer);
    return writer.toString();
}

type RecordedImport = { specifier: string; names: readonly string[] };
function makeImports(): { calls: RecordedImport[]; sink: { addImport(s: string, n: string[]): void } } {
    const calls: RecordedImport[] = [];
    return {
        calls,
        sink: {
            addImport(specifier, names) {
                calls.push({ specifier, names: [...names] });
            },
        },
    };
}

describe("CallExpressionBuilder", () => {
    describe("constructor", () => {
        it("creates builder with no arguments", () => {
            const builder = new CallExpressionBuilder();
            expect(builder).toBeInstanceOf(CallExpressionBuilder);
        });

        it("accepts registry and imports", () => {
            const builder = new CallExpressionBuilder(new FfiDescriptorRegistry(), makeImports().sink);
            expect(builder).toBeInstanceOf(CallExpressionBuilder);
        });
    });

    describe("toWriter", () => {
        it("builds basic call expression", () => {
            const builder = new CallExpressionBuilder();
            const output = getCallExpressionOutput(builder, {
                sharedLibrary: "libgtk-4.so.1",
                cIdentifier: "gtk_button_new",
                args: [],
                returnType: { type: "gobject", ownership: "full" },
            });

            expect(output).toContain("call(");
            expect(output).toContain('"libgtk-4.so.1"');
            expect(output).toContain('"gtk_button_new"');
            expect(output).toContain('t.object("full")');
        });

        it("builds call expression with arguments", () => {
            const builder = new CallExpressionBuilder();
            const output = getCallExpressionOutput(builder, {
                sharedLibrary: "libgtk-4.so.1",
                cIdentifier: "gtk_label_new",
                args: [{ type: { type: "string", ownership: "borrowed" }, value: "label" }],
                returnType: { type: "gobject", ownership: "full" },
            });

            expect(output).toContain('t.string("borrowed")');
            expect(output).toContain("value: label");
        });

        it("builds call expression with multiple arguments", () => {
            const builder = new CallExpressionBuilder();
            const output = getCallExpressionOutput(builder, {
                sharedLibrary: "libgtk-4.so.1",
                cIdentifier: "gtk_box_new",
                args: [
                    { type: { type: "int32" }, value: "orientation" },
                    { type: { type: "int32" }, value: "spacing" },
                ],
                returnType: { type: "gobject", ownership: "full" },
            });

            expect(output).toContain("value: orientation");
            expect(output).toContain("value: spacing");
        });

        it("builds call expression with self argument", () => {
            const builder = new CallExpressionBuilder();
            const output = getCallExpressionOutput(builder, {
                sharedLibrary: "libgtk-4.so.1",
                cIdentifier: "gtk_button_set_label",
                args: [{ type: { type: "string", ownership: "borrowed" }, value: "label" }],
                returnType: { type: "void" },
                selfArg: {
                    type: { type: "gobject", ownership: "borrowed" },
                    value: "this.handle",
                },
            });

            expect(output).toContain("value: this.handle");
            expect(output).toContain("value: label");
        });

        it("places self argument before other arguments", () => {
            const builder = new CallExpressionBuilder();
            const output = getCallExpressionOutput(builder, {
                sharedLibrary: "libgtk-4.so.1",
                cIdentifier: "some_method",
                args: [{ type: { type: "int32" }, value: "arg1" }],
                returnType: { type: "void" },
                selfArg: {
                    type: { type: "gobject", ownership: "borrowed" },
                    value: "self",
                },
            });

            const selfIndex = output.indexOf("value: self");
            const arg1Index = output.indexOf("value: arg1");
            expect(selfIndex).toBeLessThan(arg1Index);
        });

        it("builds call expression with optional argument", () => {
            const builder = new CallExpressionBuilder();
            const output = getCallExpressionOutput(builder, {
                sharedLibrary: "libgtk-4.so.1",
                cIdentifier: "gtk_widget_set_name",
                args: [{ type: { type: "string", ownership: "borrowed" }, value: "name", optional: true }],
                returnType: { type: "void" },
                selfArg: {
                    type: { type: "gobject", ownership: "borrowed" },
                    value: "this.handle",
                },
            });

            expect(output).toContain("optional: true");
        });

        it("builds call expression with void return", () => {
            const builder = new CallExpressionBuilder();
            const output = getCallExpressionOutput(builder, {
                sharedLibrary: "libgtk-4.so.1",
                cIdentifier: "gtk_widget_show",
                args: [],
                returnType: { type: "void" },
                selfArg: {
                    type: { type: "gobject", ownership: "borrowed" },
                    value: "this.handle",
                },
            });

            expect(output).toContain("t.void");
        });

        it("builds call expression with boxed return type", () => {
            const builder = new CallExpressionBuilder();
            const output = getCallExpressionOutput(builder, {
                sharedLibrary: "libgtk-4.so.1",
                cIdentifier: "gdk_rgba_parse",
                args: [{ type: { type: "string", ownership: "borrowed" }, value: "spec" }],
                returnType: {
                    type: "boxed",
                    ownership: "full",
                    innerType: "GdkRGBA",
                },
            });

            expect(output).toContain('t.boxed("GdkRGBA", "full")');
        });

        it("builds call expression with array return type", () => {
            const builder = new CallExpressionBuilder();
            const output = getCallExpressionOutput(builder, {
                sharedLibrary: "libgtk-4.so.1",
                cIdentifier: "some_function",
                args: [],
                returnType: {
                    type: "array",
                    itemType: { type: "string", ownership: "full" },
                    ownership: "full",
                },
            });

            expect(output).toContain("t.array(");
        });

        it("handles empty args array", () => {
            const builder = new CallExpressionBuilder();
            const output = getCallExpressionOutput(builder, {
                sharedLibrary: "libgtk-4.so.1",
                cIdentifier: "gtk_init",
                args: [],
                returnType: { type: "void" },
            });

            expect(output).toMatch(/\[\s*\]/);
        });

        it("uses custom ffiTypeWriter for argument types", () => {
            const builder = new CallExpressionBuilder();
            const output = getCallExpressionOutput(builder, {
                sharedLibrary: "libgtk-4.so.1",
                cIdentifier: "some_function",
                args: [
                    {
                        type: { type: "boxed", ownership: "borrowed", innerType: "GdkRGBA" },
                        value: "color",
                    },
                ],
                returnType: { type: "void" },
            });

            expect(output).toContain('"libgtk-4.so.1"');
            expect(output).toContain('t.boxed("GdkRGBA", "borrowed")');
        });
    });

    describe("buildValueExpression", () => {
        it("returns simple value for primitive types", () => {
            const builder = new CallExpressionBuilder();
            const mappedType: MappedType = {
                ts: "number",
                ffi: { type: "int32" },
            };

            const result = builder.buildValueExpression("count", mappedType);

            expect(result).toBe("count");
        });

        it("returns simple value for string type", () => {
            const builder = new CallExpressionBuilder();
            const mappedType: MappedType = {
                ts: "string",
                ffi: { type: "string", ownership: "borrowed" },
            };

            const result = builder.buildValueExpression("label", mappedType);

            expect(result).toBe("label");
        });

        it("returns simple value for boolean type", () => {
            const builder = new CallExpressionBuilder();
            const mappedType: MappedType = {
                ts: "boolean",
                ffi: { type: "boolean" },
            };

            const result = builder.buildValueExpression("visible", mappedType);

            expect(result).toBe("visible");
        });

        it("returns ID extraction expression for gobject type", () => {
            const builder = new CallExpressionBuilder();
            const mappedType: MappedType = {
                ts: "Widget",
                ffi: { type: "gobject", ownership: "borrowed" },
            };

            const result = builder.buildValueExpression("widget", mappedType);

            expect(result).toBe("widget.handle");
        });

        it("returns ID extraction expression for boxed type", () => {
            const builder = new CallExpressionBuilder();
            const mappedType: MappedType = {
                ts: "GdkRGBA",
                ffi: { type: "boxed", ownership: "borrowed", innerType: "GdkRGBA" },
            };

            const result = builder.buildValueExpression("color", mappedType);

            expect(result).toBe("color.handle");
        });

        it("returns ID extraction expression for struct type", () => {
            const builder = new CallExpressionBuilder();
            const mappedType: MappedType = {
                ts: "Allocation",
                ffi: { type: "struct", ownership: "borrowed", innerType: "GtkAllocation" },
            };

            const result = builder.buildValueExpression("allocation", mappedType);

            expect(result).toBe("allocation.handle");
        });

        it("handles complex value names", () => {
            const builder = new CallExpressionBuilder();
            const mappedType: MappedType = {
                ts: "Widget",
                ffi: { type: "gobject", ownership: "borrowed" },
            };

            const result = builder.buildValueExpression("this.child", mappedType);

            expect(result).toBe("this.child.handle");
        });

        it("handles array value names", () => {
            const builder = new CallExpressionBuilder();
            const mappedType: MappedType = {
                ts: "Widget",
                ffi: { type: "gobject", ownership: "borrowed" },
            };

            const result = builder.buildValueExpression("widgets[0]", mappedType);

            expect(result).toBe("widgets[0].handle");
        });
    });

    describe("errorCheckWriter", () => {
        it("builds error check code with default GLib.GError reference", () => {
            const builder = new CallExpressionBuilder();
            const output = getWriterOutput(builder.errorCheckWriter());

            expect(output).toContain("if (error.value !== null)");
            expect(output).toContain(
                "throw new NativeError(getNativeObject(error.value as NativeHandle, GLib.GError))",
            );
        });

        it("builds error check code with custom GError reference", () => {
            const builder = new CallExpressionBuilder();
            const output = getWriterOutput(builder.errorCheckWriter("GError"));

            expect(output).toContain("if (error.value !== null)");
            expect(output).toContain("throw new NativeError(getNativeObject(error.value as NativeHandle, GError))");
        });
    });

    describe("descriptor type rendering", () => {
        it("renders boxed type descriptor with library info from the descriptor", () => {
            const builder = new CallExpressionBuilder();

            const output = getCallExpressionOutput(builder, {
                sharedLibrary: "libgtk-4.so.1",
                cIdentifier: "test_fn",
                args: [
                    {
                        type: { type: "boxed", ownership: "borrowed", innerType: "GdkRGBA" },
                        value: "color",
                    },
                ],
                returnType: { type: "void" },
            });

            expect(output).toContain('t.boxed("GdkRGBA", "borrowed")');
        });
    });

    describe("registry-driven hoisting", () => {
        it("emits a curried call site referencing the binding name", () => {
            const registry = new FfiDescriptorRegistry();
            const { sink } = makeImports();
            const builder = new CallExpressionBuilder(registry, sink);
            const output = getCallExpressionOutput(builder, {
                sharedLibrary: "libgtk-4.so.1",
                cIdentifier: "gtk_label_get_label",
                args: [],
                returnType: { type: "string", ownership: "borrowed" },
                selfArg: { type: { type: "gobject", ownership: "borrowed" }, value: "this.handle" },
            });

            expect(output).toBe("gtk_label_get_label(this.handle)");
            expect(registry.isEmpty).toBe(false);
        });

        it("imports t (not call) for hoisted bindings", () => {
            const registry = new FfiDescriptorRegistry();
            const { calls, sink } = makeImports();
            const builder = new CallExpressionBuilder(registry, sink);
            getCallExpressionOutput(builder, {
                sharedLibrary: "libgtk-4.so.1",
                cIdentifier: "gtk_widget_show",
                args: [],
                returnType: { type: "void" },
                selfArg: { type: { type: "gobject", ownership: "borrowed" }, value: "this.handle" },
            });

            expect(calls).toEqual([{ specifier: "../../native.js", names: ["t"] }]);
        });

        it("falls back to inline call() for variadic callables", () => {
            const registry = new FfiDescriptorRegistry();
            const { calls, sink } = makeImports();
            const builder = new CallExpressionBuilder(registry, sink);
            const output = getCallExpressionOutput(builder, {
                sharedLibrary: "libgtk-4.so.1",
                cIdentifier: "g_object_new",
                args: [{ type: { type: "uint64" }, value: "gtype" }],
                returnType: { type: "gobject", ownership: "full" },
                hasVarargs: true,
            });

            expect(output).toContain("call(");
            expect(output).toContain('"g_object_new"');
            expect(output).toContain("...args");
            expect(registry.isEmpty).toBe(true);
            expect(calls).toEqual([{ specifier: "../../native.js", names: ["call", "t"] }]);
        });

        it("dedupes identical descriptors to one binding", () => {
            const registry = new FfiDescriptorRegistry();
            const { sink } = makeImports();
            const builder = new CallExpressionBuilder(registry, sink);
            const opts: CallExpressionOptions = {
                sharedLibrary: "libgobject-2.0.so.0",
                cIdentifier: "g_object_get_property",
                args: [
                    { type: { type: "string", ownership: "borrowed" }, value: '"height-request"' },
                    { type: { type: "uint64" }, value: "gvalue.handle" },
                ],
                returnType: { type: "void" },
                selfArg: { type: { type: "gobject", ownership: "borrowed" }, value: "this.handle" },
            };
            const out1 = getCallExpressionOutput(builder, opts);
            const out2 = getCallExpressionOutput(builder, {
                ...opts,
                args: [
                    { type: { type: "string", ownership: "borrowed" }, value: '"width-request"' },
                    { type: { type: "uint64" }, value: "gvalue.handle" },
                ],
            });

            expect(out1).toContain("g_object_get_property(");
            expect(out2).toContain("g_object_get_property(");
            expect(out1).not.toContain("g_object_get_property_2");
            expect(out2).not.toContain("g_object_get_property_2");
        });

        it("disambiguates same cIdentifier with different descriptors via numeric suffix", () => {
            const registry = new FfiDescriptorRegistry();
            const builder = new CallExpressionBuilder(registry, makeImports().sink);
            const out1 = getCallExpressionOutput(builder, {
                sharedLibrary: "libgobject-2.0.so.0",
                cIdentifier: "g_signal_connect_data",
                args: [
                    {
                        type: {
                            type: "trampoline",
                            argTypes: [{ type: "gobject", ownership: "borrowed" }, { type: "void" }],
                            returnType: { type: "void" },
                            hasDestroy: true,
                            userDataIndex: 1,
                        },
                        value: "wrappedHandler",
                    },
                ],
                returnType: { type: "uint64" },
            });
            const out2 = getCallExpressionOutput(builder, {
                sharedLibrary: "libgobject-2.0.so.0",
                cIdentifier: "g_signal_connect_data",
                args: [
                    {
                        type: {
                            type: "trampoline",
                            argTypes: [
                                { type: "gobject", ownership: "borrowed" },
                                { type: "string", ownership: "borrowed" },
                                { type: "void" },
                            ],
                            returnType: { type: "void" },
                            hasDestroy: true,
                            userDataIndex: 2,
                        },
                        value: "wrappedHandler",
                    },
                ],
                returnType: { type: "uint64" },
            });

            expect(out1).toContain("g_signal_connect_data(");
            expect(out2).toContain("g_signal_connect_data_2(");
        });
    });

    describe("complex call expressions", () => {
        it("builds call with mixed argument types", () => {
            const builder = new CallExpressionBuilder();

            const output = getCallExpressionOutput(builder, {
                sharedLibrary: "libgtk-4.so.1",
                cIdentifier: "complex_function",
                args: [
                    { type: { type: "string", ownership: "borrowed" }, value: "name" },
                    { type: { type: "int32" }, value: "count" },
                    { type: { type: "gobject", ownership: "borrowed" }, value: "widget" },
                    { type: { type: "boolean" }, value: "enabled" },
                    {
                        type: { type: "boxed", ownership: "borrowed", innerType: "GdkRGBA" },
                        value: "color",
                    },
                ],
                returnType: { type: "gobject", ownership: "full" },
                selfArg: {
                    type: { type: "gobject", ownership: "borrowed" },
                    value: "this.handle",
                },
            });

            expect(output).toContain("value: this.handle");
            expect(output).toContain("value: name");
            expect(output).toContain("value: count");
            expect(output).toContain("value: widget");
            expect(output).toContain("value: enabled");
            expect(output).toContain("value: color");
            expect(output).toContain('t.string("borrowed")');
            expect(output).toContain("t.int32");
            expect(output).toContain('t.object("borrowed")');
            expect(output).toContain("t.boolean");
            expect(output).toContain('t.boxed("GdkRGBA", "borrowed")');
        });

        it("builds call with optional and required arguments", () => {
            const builder = new CallExpressionBuilder();
            const output = getCallExpressionOutput(builder, {
                sharedLibrary: "libgtk-4.so.1",
                cIdentifier: "test_function",
                args: [
                    { type: { type: "string", ownership: "borrowed" }, value: "required1" },
                    { type: { type: "string", ownership: "borrowed" }, value: "optional1", optional: true },
                    { type: { type: "int32" }, value: "required2" },
                    { type: { type: "int32" }, value: "optional2", optional: true },
                ],
                returnType: { type: "void" },
            });

            const optionalCount = (output.match(/optional: true/g) || []).length;
            expect(optionalCount).toBe(2);
        });

        it("builds call with nested type descriptors", () => {
            const builder = new CallExpressionBuilder();

            const output = getCallExpressionOutput(builder, {
                sharedLibrary: "libgtk-4.so.1",
                cIdentifier: "array_function",
                args: [
                    {
                        type: {
                            type: "array",
                            itemType: { type: "string", ownership: "borrowed" },
                            ownership: "borrowed",
                        },
                        value: "strings",
                    },
                ],
                returnType: {
                    type: "array",
                    itemType: { type: "gobject", ownership: "full" },
                    ownership: "full",
                },
            });

            expect(output).toContain("t.array(");
            expect(output).toContain('t.string("borrowed")');
        });
    });
});
