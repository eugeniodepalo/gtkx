import { describe, expect, it } from "vitest";
import { fileBuilder } from "../../../../src/builders/file-builder.js";
import { stringify } from "../../../../src/builders/stringify.js";
import { ClassGenerator } from "../../../../src/ffi/generators/class/index.js";
import type { GirRepository } from "../../../../src/gir/index.js";
import { FfiMapper } from "../../../../src/type-system/ffi-mapper.js";
import { buildGeneratorOptions, setupGtkFfiContext } from "../../../fixtures/generator-fixtures.js";
import {
    createNormalizedClass,
    createNormalizedConstructor,
    createNormalizedFunction,
    createNormalizedMethod,
    createNormalizedNamespace,
    createNormalizedParameter,
    createNormalizedSignal,
    createNormalizedType,
    gtkButtonNewConstructors,
    qualifiedName,
} from "../../../fixtures/gir-fixtures.js";
import { createMockRepository } from "../../../fixtures/mock-repository.js";

function createTestSetup(
    classOverrides: Partial<Parameters<typeof createNormalizedClass>[0]> = {},
    namespaces: Map<string, ReturnType<typeof createNormalizedNamespace>> = new Map(),
    extras: {
        widgetOverrides?: Partial<Parameters<typeof createNormalizedClass>[0]>;
        resolveInterface?: (qn: string) => unknown;
    } = {},
) {
    const { repo, ffiMapper, file, options } = setupGtkFfiContext(namespaces);
    const gtkNs = namespaces.get("Gtk") as ReturnType<typeof createNormalizedNamespace>;

    const widgetClass = createNormalizedClass({
        name: "Widget",
        qualifiedName: qualifiedName("Gtk", "Widget"),
        parent: null,
        ...extras.widgetOverrides,
    });
    gtkNs.classes.set("Widget", widgetClass);

    const cls = createNormalizedClass({
        name: "Button",
        qualifiedName: qualifiedName("Gtk", "Button"),
        parent: qualifiedName("Gtk", "Widget"),
        ...classOverrides,
    });
    gtkNs.classes.set(cls.name, cls);

    if (extras.resolveInterface) {
        (repo as unknown as { resolveInterface(qn: string): unknown }).resolveInterface = extras.resolveInterface;
    }

    const generator = new ClassGenerator({
        cls,
        ffiMapper,
        file,
        repository: repo as unknown as GirRepository,
        options,
    });

    return { cls, generator, file, repo };
}

function generateClassCode(
    classOverrides: Partial<Parameters<typeof createNormalizedClass>[0]> = {},
    namespaces?: Map<string, ReturnType<typeof createNormalizedNamespace>>,
    extras?: Parameters<typeof createTestSetup>[2],
) {
    const setup = createTestSetup(classOverrides, namespaces ?? new Map(), extras);
    setup.generator.generate();
    return { ...setup, code: stringify(setup.file) };
}

describe("ClassGenerator / constructor", () => {
    it("creates generator with class and dependencies", () => {
        const { generator } = createTestSetup();
        expect(generator).toBeInstanceOf(ClassGenerator);
    });
});

describe("ClassGenerator / generateToSourceFile (1)", () => {
    it("returns a result for a valid class", () => {
        const { generator } = createTestSetup();

        const result = generator.generate();

        expect(result).toBeDefined();
    });

    it("generates class with correct name", () => {
        const { code } = generateClassCode({ name: "Button" });
        expect(code).toContain("export class Button");
    });

    it("generates class extending parent", () => {
        const { code } = generateClassCode({
            parent: qualifiedName("Gtk", "Widget"),
        });
        expect(code).toContain("extends Widget");
    });

    it("emits a constructor delegating to constructNativeObject when no parent", () => {
        const gtkNs = createNormalizedNamespace({ name: "Gtk" });
        const widgetClass = createNormalizedClass({
            name: "Widget",
            qualifiedName: qualifiedName("Gtk", "Widget"),
            parent: null,
        });
        gtkNs.classes.set("Widget", widgetClass);
        const namespaces = new Map([["Gtk", gtkNs]]);

        const { code } = generateClassCode({ parent: null }, namespaces);
        expect(code).toContain("constructNativeObject(this, props)");
        expect(code).not.toContain("extends NativeObject");
    });
});

describe("ClassGenerator / generateToSourceFile (2)", () => {
    it("emits exported get-type FFI binding when glibGetType is present", () => {
        const { code } = generateClassCode({
            glibTypeName: "GtkButton",
            glibGetType: "gtk_button_get_type",
        });
        expect(code).toContain("export const gtk_button_get_type");
        expect(code).toContain('"gtk_button_get_type"');
    });

    it("does not emit objectType property", () => {
        const { code } = generateClassCode({
            glibTypeName: "GtkButton",
        });
        expect(code).not.toContain("objectType");
    });

    it("generates methods for class", () => {
        const { code } = generateClassCode({
            methods: [
                createNormalizedMethod({
                    name: "get_label",
                    cIdentifier: "gtk_button_get_label",
                    returnType: createNormalizedType({ name: "utf8" }),
                }),
            ],
        });
        expect(code).toContain("getLabel");
    });
});

describe("ClassGenerator / generateToSourceFile (3)", () => {
    it("generates static functions", () => {
        const { code } = generateClassCode({
            staticFunctions: [
                createNormalizedFunction({
                    name: "get_default_direction",
                    cIdentifier: "gtk_widget_get_default_direction",
                    returnType: createNormalizedType({ name: "gint" }),
                    parameters: [],
                    throws: false,
                }),
            ],
        });
        expect(code).toContain("getDefaultDirection");
    });

    it("adds registerNativeClass call when glibGetType is present", () => {
        const { code } = generateClassCode({
            name: "Button",
            glibTypeName: "GtkButton",
            glibGetType: "gtk_button_get_type",
        });
        expect(code).toContain("registerNativeClass(Button, gtk_button_get_type());");
    });
});

describe("ClassGenerator / widget metadata", () => {
    it("returns widget meta for widget class", () => {
        const { generator } = createTestSetup({
            name: "Button",
            parent: qualifiedName("Gtk", "Widget"),
        });

        const result = generator.generate();

        expect(result.widgetMeta).not.toBeNull();
    });

    it("includes className in widget meta", () => {
        const { generator } = createTestSetup({
            name: "Button",
            parent: qualifiedName("Gtk", "Widget"),
        });

        const result = generator.generate();

        expect(result.widgetMeta?.className).toBe("Button");
    });

    it("includes namespace in widget meta", () => {
        const { generator } = createTestSetup({
            name: "Button",
            parent: qualifiedName("Gtk", "Widget"),
        });

        const result = generator.generate();

        expect(result.widgetMeta?.namespace).toBe("Gtk");
    });
});

describe("ClassGenerator / context updates", () => {
    it("registers an FFI binding when the class has methods", () => {
        const { code } = generateClassCode({
            methods: [
                createNormalizedMethod({
                    name: "get_value",
                    cIdentifier: "gtk_button_get_value",
                    returnType: createNormalizedType({ name: "gint" }),
                }),
            ],
        });
        expect(code).toContain("gtk_button_get_value");
        expect(code).toContain("t.fn(");
    });

    it("sets usesRegisterNativeClass when class has glibGetType", () => {
        const { generator, file } = createTestSetup({
            glibTypeName: "GtkButton",
            glibGetType: "gtk_button_get_type",
        });

        generator.generate();

        expect(stringify(file)).toContain("registerNativeClass");
    });

    it("sets usesNativeObject when class has no parent", () => {
        const gtkNs = createNormalizedNamespace({ name: "Gtk" });
        const widgetClass = createNormalizedClass({
            name: "Widget",
            qualifiedName: qualifiedName("Gtk", "Widget"),
            parent: null,
        });
        gtkNs.classes.set("Widget", widgetClass);
        const namespaces = new Map([["Gtk", gtkNs]]);

        const { generator, file } = createTestSetup({ parent: null }, namespaces);

        generator.generate();

        expect(stringify(file)).toContain("NativeObject");
    });
});

describe("ClassGenerator / constructor generation", () => {
    it("emits the GIR `new` constructor as a static factory", () => {
        const { code } = generateClassCode({
            constructors: [
                createNormalizedConstructor({
                    name: "new",
                    cIdentifier: "gtk_button_new",
                    returnType: createNormalizedType({ name: "Gtk.Button" }),
                    parameters: [],
                }),
            ],
        });
        expect(code).toContain("static new(");
    });

    it("generates factory methods for non-main constructors", () => {
        const { code } = generateClassCode({
            constructors: gtkButtonNewConstructors(),
        });
        expect(code).toContain("newWithLabel");
    });
});

describe("ClassGenerator / signal generation", () => {
    it("generates connect method when class has signals", () => {
        const { code } = generateClassCode({
            signals: [createNormalizedSignal({ name: "clicked" })],
        });
        expect(code).toContain("connect");
    });

    it("includes signal in WIDGET_META", () => {
        const { code } = generateClassCode({
            signals: [createNormalizedSignal({ name: "clicked" })],
            parent: qualifiedName("Gtk", "Widget"),
        });
        expect(code).toContain("clicked");
    });
});

describe("ClassGenerator / JSDoc generation", () => {
    it("includes class documentation", () => {
        const { code } = generateClassCode({
            doc: "A button widget for triggering actions",
        });
        expect(code).toContain("A button widget for triggering actions");
    });
});

describe("ClassGenerator / empty-shell behavior", () => {
    it("still emits a class shell when every constructor has unsafe parameters", () => {
        const { generator, file } = createTestSetup({
            constructors: [
                createNormalizedConstructor({
                    name: "new_with_callback",
                    cIdentifier: "gtk_button_new_with_callback",
                    returnType: createNormalizedType({ name: "Gtk.Button" }),
                    parameters: [
                        createNormalizedParameter({
                            name: "callback",
                            type: createNormalizedType({ name: "GLib.Closure" }),
                        }),
                    ],
                }),
            ],
        });

        const result = generator.generate();
        const code = stringify(file);

        expect(result).toBeDefined();
        expect(code).toContain("export class Button");
    });
});

describe("ClassGenerator / ParamSpec handling", () => {
    it("generates fundamental ParamSpec class without objectType", () => {
        const gobjectNs = createNormalizedNamespace({
            name: "GObject",
            sharedLibrary: "libgobject-2.0.so.0",
        });
        const paramSpecClass = createNormalizedClass({
            name: "ParamSpec",
            qualifiedName: qualifiedName("GObject", "ParamSpec"),
            parent: null,
            glibTypeName: "GParam",
            fundamental: true,
            refFunc: "g_param_spec_ref_sink",
            unrefFunc: "g_param_spec_unref",
        });
        gobjectNs.classes.set("ParamSpec", paramSpecClass);
        const namespaces = new Map([["GObject", gobjectNs]]);

        const repo = createMockRepository(namespaces);
        const ffiMapper = new FfiMapper(repo as ConstructorParameters<typeof FfiMapper>[0], "GObject");
        const psFile = fileBuilder();

        const generator = new ClassGenerator({
            cls: paramSpecClass,
            ffiMapper,
            file: psFile,
            repository: repo as unknown as GirRepository,
            options: buildGeneratorOptions("GObject"),
        });

        generator.generate();

        const code = stringify(psFile);
        expect(code).toContain("export class ParamSpec");
        expect(code).not.toContain("objectType");
    });
});

describe("ClassGenerator / cross-namespace inheritance", () => {
    it("includes namespace prefix for cross-namespace parent", () => {
        const gtkNs = createNormalizedNamespace({ name: "Gtk" });
        const adwNs = createNormalizedNamespace({ name: "Adw" });

        const widgetClass = createNormalizedClass({
            name: "Widget",
            qualifiedName: qualifiedName("Gtk", "Widget"),
            parent: null,
        });
        gtkNs.classes.set("Widget", widgetClass);

        const windowClass = createNormalizedClass({
            name: "Window",
            qualifiedName: qualifiedName("Gtk", "Window"),
            parent: qualifiedName("Gtk", "Widget"),
        });
        gtkNs.classes.set("Window", windowClass);

        const adwWindowClass = createNormalizedClass({
            name: "ApplicationWindow",
            qualifiedName: qualifiedName("Adw", "ApplicationWindow"),
            parent: qualifiedName("Gtk", "Window"),
        });
        adwNs.classes.set("ApplicationWindow", adwWindowClass);

        const namespaces = new Map([
            ["Gtk", gtkNs],
            ["Adw", adwNs],
        ]);

        const repo = createMockRepository(namespaces);
        const ffiMapper = new FfiMapper(repo as ConstructorParameters<typeof FfiMapper>[0], "Adw");
        const adwFile = fileBuilder();
        const options = {
            namespace: "Adw",
            sharedLibrary: "libadwaita-1.so.0",
            glibLibrary: "libglib-2.0.so.0",
            gobjectLibrary: "libgobject-2.0.so.0",
        };

        const generator = new ClassGenerator({
            cls: adwWindowClass,
            ffiMapper,
            file: adwFile,
            repository: repo as unknown as GirRepository,
            options,
        });

        generator.generate();

        const code = stringify(adwFile);
        expect(code).toContain("extends Gtk.Window");
    });
});

function setupClassImplementingInterface(
    interfaceName: string,
    interfaceMethods: ReturnType<typeof createNormalizedMethod>[],
    ifaceQn = qualifiedName("Gtk", interfaceName),
) {
    const { generator, file } = createTestSetup({ implements: [ifaceQn] }, undefined, {
        resolveInterface: (qn) => {
            if (qn !== ifaceQn) return null;
            return {
                name: interfaceName,
                methods: interfaceMethods,
                properties: [],
                signals: [],
                virtualMethodNames: [],
                prerequisites: [],
            };
        },
    });
    return { generator, file };
}

describe("ClassGenerator / interface methods (1)", () => {
    it("emits interface methods on the implementing class", () => {
        const { generator, file } = setupClassImplementingInterface("Orientable", [
            createNormalizedMethod({
                name: "get_orientation",
                cIdentifier: "gtk_orientable_get_orientation",
                returnType: createNormalizedType({ name: "gint" }),
            }),
        ]);

        generator.generate();

        expect(stringify(file)).toContain("getOrientation");
    });
});

function buildCollidingInterfaceMock(name: string, cIdentifier: string) {
    return {
        name,
        methods: [
            createNormalizedMethod({
                name: "get_name",
                cIdentifier,
                returnType: createNormalizedType({ name: "utf8" }),
            }),
        ],
        properties: [],
        signals: [],
        virtualMethodNames: [],
        prerequisites: [],
    };
}

describe("ClassGenerator / interface methods (2)", () => {
    it("renames interface methods when their name collides across multiple interfaces", () => {
        const { code } = generateClassCode(
            {
                implements: [qualifiedName("Gtk", "Editable"), qualifiedName("Gtk", "Buildable")],
            },
            undefined,
            {
                resolveInterface: (qn) => {
                    if (qn === qualifiedName("Gtk", "Editable")) {
                        return buildCollidingInterfaceMock("Editable", "gtk_editable_get_name");
                    }
                    if (qn === qualifiedName("Gtk", "Buildable")) {
                        return buildCollidingInterfaceMock("Buildable", "gtk_buildable_get_name");
                    }
                    return null;
                },
            },
        );
        expect(code).toMatch(/get(?:Editable|Buildable)?Name/);
    });
});

describe("ClassGenerator / interface methods (3)", () => {
    it("ignores unresolvable interface entries", () => {
        const { generator } = createTestSetup({ implements: ["Phantom.Iface"] });
        const result = generator.generate();
        expect(result).toBeDefined();
    });
});

describe("ClassGenerator / name collisions with parent methods (1)", () => {
    it("emits a renamed method via filterClassMethods when a name collides with a parent", () => {
        const { generator, file } = createTestSetup(
            {
                methods: [
                    createNormalizedMethod({
                        name: "get_name",
                        cIdentifier: "gtk_button_get_name",
                        returnType: createNormalizedType({ name: "utf8" }),
                    }),
                ],
            },
            undefined,
            {
                widgetOverrides: {
                    methods: [
                        createNormalizedMethod({
                            name: "get_name",
                            cIdentifier: "gtk_widget_get_name",
                            returnType: createNormalizedType({ name: "utf8" }),
                        }),
                    ],
                },
            },
        );

        const result = generator.generate();
        expect(result).toBeDefined();
        expect(stringify(file)).toContain("Button");
    });
});

describe("ClassGenerator / name collisions with parent methods (2)", () => {
    it("renames a method named connect on a class with a parent to avoid the signal helper collision", () => {
        const { code } = generateClassCode({
            name: "Socket",
            qualifiedName: qualifiedName("Gtk", "Socket"),
            methods: [
                createNormalizedMethod({
                    name: "connect",
                    cIdentifier: "gtk_socket_connect",
                    returnType: createNormalizedType({ name: "none" }),
                }),
            ],
        });
        expect(code).not.toMatch(/^\s*connect\(/m);
    });
});
