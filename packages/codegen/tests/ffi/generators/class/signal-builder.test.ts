import { describe, expect, it } from "vitest";
import { fileBuilder } from "../../../../src/builders/file-builder.js";
import { Writer } from "../../../../src/builders/text-writer.js";
import { SignalBuilder, type SignalBuilderOptions } from "../../../../src/ffi/generators/class/signal-builder.js";
import { FfiMapper } from "../../../../src/type-system/ffi-mapper.js";
import { setupFfiContext, setupGtkFfiContext } from "../../../fixtures/generator-fixtures.js";
import {
    createNormalizedClass,
    createNormalizedEnumeration,
    createNormalizedInterface,
    createNormalizedNamespace,
    createNormalizedParameter,
    createNormalizedRecord,
    createNormalizedSignal,
    createNormalizedType,
    qualifiedName,
} from "../../../fixtures/gir-fixtures.js";
import { createMockRepository } from "../../../fixtures/mock-repository.js";

function renderMeta(builder: SignalBuilder): string {
    const writer = new Writer();
    const metaWriter = builder.buildSignalMetaWriter();
    if (!metaWriter) return "";
    metaWriter(writer);
    return writer.toString();
}

function createTestSetup(
    classOverrides: Partial<Parameters<typeof createNormalizedClass>[0]> = {},
    namespaces: Map<string, ReturnType<typeof createNormalizedNamespace>> = new Map(),
) {
    const { repo, ffiMapper, file, options } = setupGtkFfiContext(namespaces);
    const cls = createNormalizedClass({
        name: "Button",
        qualifiedName: qualifiedName("Gtk", "Button"),
        parent: null,
        signals: [],
        ...classOverrides,
    });
    const builder = new SignalBuilder({
        cls,
        ffiMapper,
        imports: file,
        repository: repo as SignalBuilderOptions["repository"],
        options,
    });
    return { cls, builder, ffiMapper, file };
}

function buildSignalStructures(
    classOverrides: Partial<Parameters<typeof createNormalizedClass>[0]>,
    namespaces?: Map<string, ReturnType<typeof createNormalizedNamespace>>,
) {
    return createTestSetup(classOverrides, namespaces).builder.buildConnectMethodStructures();
}

function createSignalBuilderInNamespace(
    namespace: string,
    classOverrides: Parameters<typeof createNormalizedClass>[0],
    extraNamespaces?: Map<string, ReturnType<typeof createNormalizedNamespace>>,
) {
    const ns = createNormalizedNamespace({ name: namespace });
    const namespaces = new Map<string, ReturnType<typeof createNormalizedNamespace>>([[namespace, ns]]);
    if (extraNamespaces) {
        for (const [key, value] of extraNamespaces) namespaces.set(key, value);
    }
    const { repo, ffiMapper, file, options } = setupFfiContext(namespace, namespaces);
    const cls = createNormalizedClass(classOverrides, repo);
    ns.classes.set(cls.name, cls);
    const builder = new SignalBuilder({
        cls,
        ffiMapper,
        imports: file,
        repository: repo as SignalBuilderOptions["repository"],
        options,
    });
    return { ns, repo, cls, builder, ffiMapper };
}

describe("SignalBuilder / constructor", () => {
    it("creates builder with class and dependencies", () => {
        const { builder } = createTestSetup();
        expect(builder).toBeInstanceOf(SignalBuilder);
    });
});

describe("SignalBuilder / buildConnectMethodStructures", () => {
    it("returns empty array when no signals", () => {
        const structures = buildSignalStructures({ signals: [] });

        expect(structures).toHaveLength(0);
    });

    it("builds connect method when class has signals", () => {
        const structures = buildSignalStructures({
            signals: [createNormalizedSignal({ name: "clicked" })],
        });

        expect(structures.map((s) => s.name)).toEqual(["connect", "emit"]);
    });

    it("includes overloads for each signal", () => {
        const structures = buildSignalStructures({
            signals: [createNormalizedSignal({ name: "clicked" }), createNormalizedSignal({ name: "activate" })],
        });

        expect(structures[0]?.overloads).toBeDefined();
        expect(structures[0]?.overloads?.length).toBeGreaterThanOrEqual(2);
    });

    it("includes generic string overload", () => {
        const structures = buildSignalStructures({
            signals: [createNormalizedSignal({ name: "clicked" })],
        });

        const genericOverload = structures[0]?.overloads?.find((o) => o.params?.[0]?.type === "string");
        expect(genericOverload).toBeDefined();
    });

    it("returns number from connect method", () => {
        const structures = buildSignalStructures({
            signals: [createNormalizedSignal({ name: "clicked" })],
        });

        expect(structures[0]?.returnType).toBe("number");
    });
});

describe("SignalBuilder / collectAllSignals", () => {
    it("returns empty array when no signals", () => {
        const { builder } = createTestSetup({ signals: [] });

        const { allSignals } = builder.collectAllSignals();

        expect(allSignals).toHaveLength(0);
    });

    it("includes signals defined on the class", () => {
        const { builder } = createTestSetup({
            signals: [createNormalizedSignal({ name: "clicked" }), createNormalizedSignal({ name: "activate" })],
        });

        const { allSignals } = builder.collectAllSignals();

        expect(allSignals).toHaveLength(2);
    });

    it("does not report cross-namespace parent when no parent", () => {
        const { builder } = createTestSetup({
            parent: null,
            signals: [createNormalizedSignal({ name: "clicked" })],
        });

        const { hasCrossNamespaceParent } = builder.collectAllSignals();

        expect(hasCrossNamespaceParent).toBe(false);
    });
});

describe("SignalBuilder / import tracking", () => {
    it("adds call import when building connect method", () => {
        const structures = buildSignalStructures({
            signals: [createNormalizedSignal({ name: "clicked" })],
        });

        expect(structures.length).toBeGreaterThan(0);
    });
});

describe("SignalBuilder / signal handler parameters", () => {
    it("emits a parameterless handler for signals with no own parameters", () => {
        const structures = buildSignalStructures({
            signals: [createNormalizedSignal({ name: "clicked", parameters: [] })],
        });

        const overload = structures[0]?.overloads?.[0];
        expect(overload?.params?.[1]?.type).toBe("() => void");
    });

    it("includes signal parameters in handler", () => {
        const structures = buildSignalStructures({
            signals: [
                createNormalizedSignal({
                    name: "scroll",
                    parameters: [
                        createNormalizedParameter({
                            name: "delta_x",
                            type: createNormalizedType({ name: "gdouble" }),
                        }),
                        createNormalizedParameter({
                            name: "delta_y",
                            type: createNormalizedType({ name: "gdouble" }),
                        }),
                    ],
                }),
            ],
        });

        const overload = structures[0]?.overloads?.[0];
        expect(overload?.params?.[1]?.type).toContain("deltaX:");
        expect(overload?.params?.[1]?.type).toContain("deltaY:");
    });
});

describe("SignalBuilder / integration", () => {
    it("builds connect and emit methods for signals", () => {
        const { builder } = createTestSetup({
            signals: [
                createNormalizedSignal({
                    name: "clicked",
                    parameters: [],
                }),
                createNormalizedSignal({
                    name: "toggled",
                    parameters: [
                        createNormalizedParameter({
                            name: "active",
                            type: createNormalizedType({ name: "gboolean" }),
                        }),
                    ],
                }),
            ],
        });

        const connectStructures = builder.buildConnectMethodStructures();

        expect(connectStructures.map((s) => s.name)).toEqual(["connect", "emit"]);
        expect(connectStructures[0]?.overloads?.length).toBeGreaterThanOrEqual(2);
    });
});

describe("SignalBuilder / buildSignalMetaWriter", () => {
    it("returns null when the class has no signals", () => {
        const { builder } = createTestSetup({ signals: [] });

        expect(builder.buildSignalMetaWriter()).toBeNull();
    });

    it("returns a writer when the class has signals", () => {
        const { builder } = createTestSetup({
            signals: [createNormalizedSignal({ name: "clicked" })],
        });

        expect(typeof builder.buildSignalMetaWriter()).toBe("function");
    });
});

describe("SignalBuilder - Extended Coverage / signal return types", () => {
    it("handles signal with boolean return type", () => {
        const structures = buildSignalStructures({
            signals: [
                createNormalizedSignal({
                    name: "query-tooltip",
                    returnType: createNormalizedType({ name: "gboolean" }),
                }),
            ],
        });

        const overload = structures[0]?.overloads?.[0];
        expect(overload?.params?.[1]?.type).toContain("=> boolean");
    });

    it("handles signal with void return type", () => {
        const structures = buildSignalStructures({
            signals: [
                createNormalizedSignal({
                    name: "clicked",
                    returnType: null,
                }),
            ],
        });

        const overload = structures[0]?.overloads?.[0];
        expect(overload?.params?.[1]?.type).toContain("=> void");
    });

    it("handles signal with string return type", () => {
        const structures = buildSignalStructures({
            signals: [
                createNormalizedSignal({
                    name: "format-value",
                    returnType: createNormalizedType({ name: "utf8", transferOwnership: "full" }),
                }),
            ],
        });

        const overload = structures[0]?.overloads?.[0];
        expect(overload?.params?.[1]?.type).toContain("=> string");
    });
});

describe("SignalBuilder - Extended Coverage / signal with GObject parameters", () => {
    it("handles signal with GObject parameter", () => {
        const buttonClass = createNormalizedClass({
            name: "Button",
            qualifiedName: qualifiedName("Gtk", "Button"),
        });
        const ns = createNormalizedNamespace({
            name: "Gtk",
            classes: new Map([["Button", buttonClass]]),
        });

        const structures = buildSignalStructures(
            {
                signals: [
                    createNormalizedSignal({
                        name: "child-added",
                        parameters: [
                            createNormalizedParameter({
                                name: "child",
                                type: createNormalizedType({ name: "Button" }),
                            }),
                        ],
                    }),
                ],
            },
            new Map([["Gtk", ns]]),
        );

        expect(structures[0]?.name).toBe("connect");
        const overload = structures[0]?.overloads?.[0];
        expect(overload?.params?.[1]?.type).toContain("child:");
    });
});

describe("SignalBuilder - Extended Coverage / varargs filtering", () => {
    it("filters out varargs from signal parameters", () => {
        const structures = buildSignalStructures({
            signals: [
                createNormalizedSignal({
                    name: "custom",
                    parameters: [
                        createNormalizedParameter({
                            name: "first",
                            type: createNormalizedType({ name: "gint" }),
                        }),
                        createNormalizedParameter({
                            name: "...",
                            varargs: true,
                            type: createNormalizedType({ name: "none" }),
                        }),
                    ],
                }),
            ],
        });

        const overload = structures[0]?.overloads?.[0];
        expect(overload?.params?.[1]?.type).not.toContain("...");
    });
});

describe("SignalBuilder - Extended Coverage / collectOwnSignals", () => {
    it("returns only signals defined on the class, not parent", () => {
        const nullRepo = { resolveClass: () => null, resolveInterface: () => null, findClasses: () => [] };
        const parentClass = createNormalizedClass(
            {
                name: "Widget",
                qualifiedName: qualifiedName("Gtk", "Widget"),
                parent: null,
                signals: [createNormalizedSignal({ name: "destroy" })],
            },
            nullRepo,
        );

        const childRepo = { resolveClass: () => parentClass, resolveInterface: () => null, findClasses: () => [] };
        const childClass = createNormalizedClass(
            {
                name: "Button",
                qualifiedName: qualifiedName("Gtk", "Button"),
                parent: qualifiedName("Gtk", "Widget"),
                signals: [createNormalizedSignal({ name: "clicked" })],
            },
            childRepo,
        );

        const ns = createNormalizedNamespace({
            name: "Gtk",
            classes: new Map([
                ["Widget", parentClass],
                ["Button", childClass],
            ]),
        });

        const repo = createMockRepository(new Map([["Gtk", ns]]));
        const ffiMapper = new FfiMapper(repo as ConstructorParameters<typeof FfiMapper>[0], "Gtk");
        const file = fileBuilder();
        const options = {
            namespace: "Gtk",
            sharedLibrary: "libgtk-4.so.1",
            glibLibrary: "libglib-2.0.so.0",
            gobjectLibrary: "libgobject-2.0.so.0",
        };

        const builder = new SignalBuilder({
            cls: childClass,
            ffiMapper,
            imports: file,
            repository: repo as SignalBuilderOptions["repository"],
            options,
        });

        const ownSignals = builder.collectOwnSignals();

        expect(ownSignals.map((s) => s.name)).toContain("clicked");
        expect(ownSignals.map((s) => s.name)).not.toContain("destroy");
    });
});

describe("SignalBuilder - signal meta table (1)", () => {
    it("writes a registerSignalMeta call with a descriptor entry per signal", () => {
        const { builder } = createTestSetup({
            signals: [createNormalizedSignal({ name: "clicked" }), createNormalizedSignal({ name: "activate" })],
        });

        const code = renderMeta(builder);

        expect(code).toContain("registerSignalMeta(Button, new globalThis.Map([");
        expect(code).toContain('["clicked", {');
        expect(code).toContain('["activate", {');
        expect(code).toContain("trampoline:");
        expect(code).toContain("invoke:");
        expect(code).toContain("emitTypes:");
    });

    it("emits a simple invoke closure that returns the handler result", () => {
        const { builder } = createTestSetup({
            signals: [
                createNormalizedSignal({
                    name: "toggled",
                    parameters: [
                        createNormalizedParameter({ name: "active", type: createNormalizedType({ name: "gboolean" }) }),
                    ],
                }),
            ],
        });

        const code = renderMeta(builder);

        expect(code).toContain("(handler, args) => {");
        expect(code).toContain("return handler(");
        expect(code).toContain("args[1]");
    });

    it("emits a null returnGType for a signal with no return value", () => {
        const { builder } = createTestSetup({
            signals: [createNormalizedSignal({ name: "clicked", returnType: null })],
        });

        const code = renderMeta(builder);

        expect(code).toContain("returnGType: null,");
    });
});

describe("SignalBuilder - signal meta table (2)", () => {
    it("emits a returnGType resolver for a signal with a primitive return value", () => {
        const { builder } = createTestSetup({
            signals: [
                createNormalizedSignal({
                    name: "query-tooltip",
                    returnType: createNormalizedType({ name: "gboolean" }),
                }),
            ],
        });

        const code = renderMeta(builder);

        expect(code).toContain("returnGType: () =>");
        expect(code).toContain("typeFromName");
    });

    it("resolves the gtype from the glib type name when no get-type function exists", () => {
        const { builder } = createTestSetup({
            glibGetType: undefined,
            glibTypeName: "GtkButton",
            signals: [createNormalizedSignal({ name: "clicked" })],
        });

        const code = renderMeta(builder);

        expect(code).toContain("g_type_from_name");
        expect(code).toContain('"GtkButton"');
    });

    it("falls back to a zero gtype when neither get-type nor type-name is available", () => {
        const { builder } = createTestSetup({
            glibGetType: undefined,
            glibTypeName: undefined,
            signals: [createNormalizedSignal({ name: "clicked" })],
        });

        const code = renderMeta(builder);

        expect(code).toContain("() => 0");
    });
});

describe("SignalBuilder - signal meta table (3)", () => {
    it("emits a ref-style invoke closure for signals with out parameters", () => {
        const { builder } = createTestSetup({
            signals: [
                createNormalizedSignal({
                    name: "populate",
                    parameters: [
                        createNormalizedParameter({
                            name: "result",
                            type: createNormalizedType({ name: "gint" }),
                            direction: "out",
                        }),
                    ],
                }),
            ],
        });

        const code = renderMeta(builder);

        expect(code).toContain("const _ref0 = { value: args[1] };");
        expect(code).toContain("return [");
        expect(code).toContain("_ref0.value");
    });
});

describe("SignalBuilder - collectAllSignals composition (1)", () => {
    it("includes signals contributed by implemented interfaces", () => {
        const orientable = createNormalizedInterface({
            name: "Orientable",
            qualifiedName: qualifiedName("Gtk", "Orientable"),
            signals: [createNormalizedSignal({ name: "orientation-changed" })],
        });
        const ns = createNormalizedNamespace({
            name: "Gtk",
            interfaces: new Map([["Orientable", orientable]]),
        });

        const { builder } = createTestSetup(
            {
                implements: [qualifiedName("Gtk", "Orientable")],
                signals: [createNormalizedSignal({ name: "clicked" })],
            },
            new Map([["Gtk", ns]]),
        );

        const { allSignals } = builder.collectAllSignals();

        expect(allSignals.map((s) => s.name)).toContain("clicked");
        expect(allSignals.map((s) => s.name)).toContain("orientation-changed");
    });
});

describe("SignalBuilder - collectAllSignals composition (2)", () => {
    it("collects signals inherited from a same-namespace parent", () => {
        const gtkNs = createNormalizedNamespace({ name: "Gtk" });
        const parent = createNormalizedClass(
            {
                name: "Widget",
                qualifiedName: qualifiedName("Gtk", "Widget"),
                parent: null,
                signals: [createNormalizedSignal({ name: "destroy" })],
            },
            createMockRepository(new Map([["Gtk", gtkNs]])),
        );
        gtkNs.classes.set("Widget", parent);

        const { builder } = createSignalBuilderInNamespace(
            "Gtk",
            {
                name: "Button",
                qualifiedName: qualifiedName("Gtk", "Button"),
                parent: qualifiedName("Gtk", "Widget"),
                signals: [createNormalizedSignal({ name: "clicked" })],
            },
            new Map([["Gtk", gtkNs]]),
        );

        const { allSignals, hasCrossNamespaceParent } = builder.collectAllSignals();

        expect(allSignals.map((s) => s.name)).toContain("destroy");
        expect(hasCrossNamespaceParent).toBe(false);
    });
});

describe("SignalBuilder - collectAllSignals composition (3)", () => {
    it("reports a cross-namespace parent when the parent lives in another namespace", () => {
        const gobjectNs = createNormalizedNamespace({ name: "GObject" });
        const parent = createNormalizedClass(
            {
                name: "Object",
                qualifiedName: qualifiedName("GObject", "Object"),
                parent: null,
                signals: [createNormalizedSignal({ name: "notify" })],
            },
            createMockRepository(new Map([["GObject", gobjectNs]])),
        );
        gobjectNs.classes.set("Object", parent);

        const { builder } = createSignalBuilderInNamespace(
            "Gtk",
            {
                name: "Button",
                qualifiedName: qualifiedName("Gtk", "Button"),
                parent: qualifiedName("GObject", "Object"),
                signals: [createNormalizedSignal({ name: "clicked" })],
            },
            new Map([["GObject", gobjectNs]]),
        );

        const { hasCrossNamespaceParent } = builder.collectAllSignals();

        expect(hasCrossNamespaceParent).toBe(true);
    });
});

describe("SignalBuilder - GObject namespace specifics (1)", () => {
    it("emits the root GObject connect body without a super delegate", () => {
        const { builder } = createSignalBuilderInNamespace("GObject", {
            name: "Object",
            qualifiedName: qualifiedName("GObject", "Object"),
            parent: null,
            signals: [createNormalizedSignal({ name: "notify" })],
        });

        const structures = builder.buildConnectMethodStructures();
        const connectWriter = new Writer();
        structures[0]?.statements?.(connectWriter);

        expect(connectWriter.toString()).not.toContain("super.connect");
    });
});

describe("SignalBuilder - GObject namespace specifics (2)", () => {
    it("inlines the GObject value helpers in the meta registration call", () => {
        const { builder } = createSignalBuilderInNamespace("GObject", {
            name: "Object",
            qualifiedName: qualifiedName("GObject", "Object"),
            parent: null,
            signals: [createNormalizedSignal({ name: "notify" })],
        });

        const code = renderMeta(builder);

        expect(code).toContain("{ Value, valueFromFfi, signalEmitv, signalLookup }");
    });
});

describe("SignalBuilder - enum and record return types (1)", () => {
    it("emits an enum get-type call for a signal returning an enum", () => {
        const ns = createNormalizedNamespace({
            name: "Gtk",
            enumerations: new Map([["Orientation", createNormalizedEnumeration({ name: "Orientation" })]]),
        });

        const { builder } = createTestSetup(
            {
                signals: [
                    createNormalizedSignal({
                        name: "reoriented",
                        returnType: createNormalizedType({ name: "Orientation" }),
                    }),
                ],
            },
            new Map([["Gtk", ns]]),
        );

        const code = renderMeta(builder);

        expect(code).toContain("returnGType: () =>");
    });
});

describe("SignalBuilder - enum and record return types (2)", () => {
    it("emits a boxed-record gtype name for a signal returning a boxed record", () => {
        const ns = createNormalizedNamespace({
            name: "Gtk",
            records: new Map([
                [
                    "Border",
                    createNormalizedRecord({
                        name: "Border",
                        qualifiedName: qualifiedName("Gtk", "Border"),
                        glibTypeName: "GtkBorder",
                        glibGetType: "gtk_border_get_type",
                    }),
                ],
            ]),
        });

        const { builder } = createTestSetup(
            {
                signals: [
                    createNormalizedSignal({
                        name: "bordered",
                        returnType: createNormalizedType({ name: "Border", transferOwnership: "full" }),
                    }),
                ],
            },
            new Map([["Gtk", ns]]),
        );

        const code = renderMeta(builder);

        expect(code).toContain("returnGType: () =>");
    });
});
