import { describe, expect, it } from "vitest";
import { fileBuilder } from "../../../src/builders/file-builder.js";
import { stringify } from "../../../src/builders/stringify.js";
import { InterfaceGenerator } from "../../../src/ffi/generators/interface.js";
import { FfiMapper } from "../../../src/type-system/ffi-mapper.js";
import {
    createNormalizedClass,
    createNormalizedFunction,
    createNormalizedInterface,
    createNormalizedMethod,
    createNormalizedNamespace,
    createNormalizedParameter,
    createNormalizedProperty,
    createNormalizedType,
    qualifiedName,
} from "../../fixtures/gir-fixtures.js";
import { createMockRepository } from "../../fixtures/mock-repository.js";

function createTestSetup(
    namespaces: Map<string, ReturnType<typeof createNormalizedNamespace>> = new Map(),
    namespace = "Gtk",
) {
    if (!namespaces.has(namespace)) {
        namespaces.set(namespace, createNormalizedNamespace({ name: namespace }));
    }
    const repo = createMockRepository(namespaces);
    const ffiMapper = new FfiMapper(repo as ConstructorParameters<typeof FfiMapper>[0], namespace);
    const file = fileBuilder();
    const options = {
        namespace,
        sharedLibrary: namespace === "GObject" ? "libgobject-2.0.so.0" : "libgtk-4.so.1",
        glibLibrary: "libglib-2.0.so.0",
        gobjectLibrary: "libgobject-2.0.so.0",
    };
    const generator = new InterfaceGenerator(
        ffiMapper,
        file,
        repo as ConstructorParameters<typeof FfiMapper>[0],
        options,
    );
    return { generator, file, repo };
}

describe("InterfaceGenerator / constructor", () => {
    it("creates generator with dependencies", () => {
        const { generator } = createTestSetup();
        expect(generator).toBeInstanceOf(InterfaceGenerator);
    });
});

describe("InterfaceGenerator / generateToSourceFile (1)", () => {
    it("returns true when generating interface", () => {
        const { generator } = createTestSetup();
        const iface = createNormalizedInterface({
            name: "Buildable",
            methods: [],
        });

        const result = generator.generate(iface);

        expect(result).toBe(true);
    });

    it("generates class with PascalCase name", () => {
        const { generator, file } = createTestSetup();
        const iface = createNormalizedInterface({
            name: "Buildable",
            methods: [],
        });

        generator.generate(iface);

        const code = stringify(file);
        expect(code).toContain("export class Buildable");
    });

    it("extends NativeObject", () => {
        const { generator, file } = createTestSetup();
        const iface = createNormalizedInterface({
            name: "Buildable",
            methods: [],
        });

        generator.generate(iface);

        const code = stringify(file);
        expect(code).toContain("extends GObject.Object");
    });
});

describe("InterfaceGenerator / generateToSourceFile (2)", () => {
    it("emits exported get-type FFI binding when glibGetType is present", () => {
        const { generator, file } = createTestSetup();
        const iface = createNormalizedInterface({
            name: "Buildable",
            glibTypeName: "GtkBuildable",
            glibGetType: "gtk_buildable_get_type",
            methods: [],
        });

        generator.generate(iface);

        const code = stringify(file);
        expect(code).toContain("export const gtk_buildable_get_type");
        expect(code).toContain('"gtk_buildable_get_type"');
    });

    it("registers the interface class for runtime type resolution when glibGetType is present", () => {
        const { generator, file } = createTestSetup();
        const iface = createNormalizedInterface({
            name: "Buildable",
            glibTypeName: "GtkBuildable",
            glibGetType: "gtk_buildable_get_type",
            methods: [],
        });

        generator.generate(iface);

        const code = stringify(file);
        expect(code).toContain("registerNativeInterface(Buildable, gtk_buildable_get_type())");
    });

    it("does not register the interface class when glibGetType is absent", () => {
        const { generator, file } = createTestSetup();
        const iface = createNormalizedInterface({
            name: "Buildable",
            glibTypeName: "GtkBuildable",
            methods: [],
        });

        generator.generate(iface);

        const code = stringify(file);
        expect(code).not.toContain("registerNativeInterface");
    });
});

describe("InterfaceGenerator / generateToSourceFile (3)", () => {
    it("does not emit objectType property", () => {
        const { generator, file } = createTestSetup();
        const iface = createNormalizedInterface({
            name: "Buildable",
            glibTypeName: "GtkBuildable",
            methods: [],
        });

        generator.generate(iface);

        const code = stringify(file);
        expect(code).not.toContain("objectType");
    });

    it("generates methods for interface", () => {
        const { generator, file } = createTestSetup();
        const iface = createNormalizedInterface({
            name: "Orientable",
            methods: [
                createNormalizedMethod({
                    name: "get_orientation",
                    cIdentifier: "gtk_orientable_get_orientation",
                    returnType: createNormalizedType({ name: "gint" }),
                }),
            ],
        });

        generator.generate(iface);

        const code = stringify(file);
        expect(code).toContain("getOrientation");
    });
});

describe("InterfaceGenerator / generateToSourceFile (4)", () => {
    it("generates multiple methods", () => {
        const { generator, file } = createTestSetup();
        const iface = createNormalizedInterface({
            name: "Orientable",
            methods: [
                createNormalizedMethod({
                    name: "get_orientation",
                    cIdentifier: "gtk_orientable_get_orientation",
                    returnType: createNormalizedType({ name: "gint" }),
                }),
                createNormalizedMethod({
                    name: "set_orientation",
                    cIdentifier: "gtk_orientable_set_orientation",
                    returnType: createNormalizedType({ name: "none" }),
                    parameters: [
                        createNormalizedParameter({
                            name: "orientation",
                            type: createNormalizedType({ name: "gint" }),
                        }),
                    ],
                }),
            ],
        });

        generator.generate(iface);

        const code = stringify(file);
        expect(code).toContain("getOrientation");
        expect(code).toContain("setOrientation");
    });

    it("preserves documentation", () => {
        const { generator, file } = createTestSetup();
        const iface = createNormalizedInterface({
            name: "Buildable",
            doc: "Interface for buildable widgets",
            methods: [],
        });

        generator.generate(iface);

        const code = stringify(file);
        expect(code).toContain("Interface for buildable widgets");
    });
});

describe("InterfaceGenerator / context updates (1)", () => {
    it("sets usesGObjectNamespace flag for non-GObject namespace", () => {
        const { generator, file } = createTestSetup();
        const iface = createNormalizedInterface({
            name: "Buildable",
            methods: [],
        });

        generator.generate(iface);
        const code = stringify(file);

        expect(code).toContain("GObject");
    });

    it("adds fn import when interface has methods", () => {
        const { generator, file } = createTestSetup();
        const iface = createNormalizedInterface({
            name: "Orientable",
            methods: [
                createNormalizedMethod({
                    name: "get_value",
                    cIdentifier: "gtk_orientable_get_value",
                    returnType: createNormalizedType({ name: "gint" }),
                }),
            ],
        });

        generator.generate(iface);
        const code = stringify(file);

        expect(code).toContain("import { t }");
        expect(code).toContain("const gtk_orientable_get_value = t.fn(");
    });
});

describe("InterfaceGenerator / context updates (2)", () => {
    it("adds Ref import when method has out parameter", () => {
        const { generator, file } = createTestSetup();
        const iface = createNormalizedInterface({
            name: "Buildable",
            methods: [
                createNormalizedMethod({
                    name: "get_value",
                    cIdentifier: "gtk_buildable_get_value",
                    returnType: createNormalizedType({ name: "none" }),
                    parameters: [
                        createNormalizedParameter({
                            name: "out_value",
                            type: createNormalizedType({ name: "gint" }),
                            direction: "out",
                        }),
                    ],
                }),
            ],
        });

        generator.generate(iface);
        const code = stringify(file);

        expect(code).toContain("Ref");
    });
});

describe("InterfaceGenerator / method filtering (1)", () => {
    it("emits a throwing stub for methods whose parameters are GLib.Closure (untyped, unsafe)", () => {
        const { generator, file } = createTestSetup();
        const iface = createNormalizedInterface({
            name: "Buildable",
            methods: [
                createNormalizedMethod({
                    name: "with_closure",
                    cIdentifier: "gtk_buildable_with_closure",
                    returnType: createNormalizedType({ name: "none" }),
                    parameters: [
                        createNormalizedParameter({
                            name: "callback",
                            type: createNormalizedType({ name: "GLib.Closure" }),
                        }),
                    ],
                }),
                createNormalizedMethod({
                    name: "normal",
                    cIdentifier: "gtk_buildable_normal",
                    returnType: createNormalizedType({ name: "none" }),
                }),
            ],
        });

        generator.generate(iface);

        const code = stringify(file);
        expect(code).toContain("normal");
        expect(code).toContain("withClosure");
        expect(code).toContain("throwUnsupported");
    });
});

describe("InterfaceGenerator / method filtering (2)", () => {
    it("filters out duplicate methods with same cIdentifier", () => {
        const { generator, file } = createTestSetup();
        const iface = createNormalizedInterface({
            name: "Buildable",
            methods: [
                createNormalizedMethod({
                    name: "get_name",
                    cIdentifier: "gtk_buildable_get_name",
                    returnType: createNormalizedType({ name: "utf8" }),
                }),
                createNormalizedMethod({
                    name: "get_name",
                    cIdentifier: "gtk_buildable_get_name",
                    returnType: createNormalizedType({ name: "utf8" }),
                }),
            ],
        });

        generator.generate(iface);

        const code = stringify(file);
        const matches = code.match(/getName\(/g) ?? [];
        expect(matches.length).toBe(1);
    });
});

describe("InterfaceGenerator / method structure (1)", () => {
    it("converts method names to camelCase", () => {
        const { generator, file } = createTestSetup();
        const iface = createNormalizedInterface({
            name: "Buildable",
            methods: [
                createNormalizedMethod({
                    name: "get_build_name",
                    cIdentifier: "gtk_buildable_get_build_name",
                    returnType: createNormalizedType({ name: "utf8" }),
                }),
            ],
        });

        generator.generate(iface);

        const code = stringify(file);
        expect(code).toContain("getBuildName");
    });

    it("includes parameters in method signature", () => {
        const { generator, file } = createTestSetup();
        const iface = createNormalizedInterface({
            name: "Buildable",
            methods: [
                createNormalizedMethod({
                    name: "set_name",
                    cIdentifier: "gtk_buildable_set_name",
                    returnType: createNormalizedType({ name: "none" }),
                    parameters: [
                        createNormalizedParameter({
                            name: "name",
                            type: createNormalizedType({ name: "utf8" }),
                        }),
                    ],
                }),
            ],
        });

        generator.generate(iface);

        const code = stringify(file);
        expect(code).toContain("name: string");
    });
});

describe("InterfaceGenerator / method structure (2)", () => {
    it("includes return type for non-void methods", () => {
        const { generator, file } = createTestSetup();
        const iface = createNormalizedInterface({
            name: "Buildable",
            methods: [
                createNormalizedMethod({
                    name: "get_id",
                    cIdentifier: "gtk_buildable_get_id",
                    returnType: createNormalizedType({ name: "gint" }),
                }),
            ],
        });

        generator.generate(iface);

        const code = stringify(file);
        expect(code).toContain(": number");
    });
});

describe("InterfaceGenerator / property accessors (1)", () => {
    it("emits ES6 get/set accessors in the interface body", () => {
        const { generator, file } = createTestSetup();
        const iface = createNormalizedInterface({
            name: "Buildable",
            methods: [],
            properties: [
                createNormalizedProperty({
                    name: "build-name",
                    type: createNormalizedType({ name: "utf8" }),
                    getter: undefined,
                    setter: undefined,
                }),
            ],
        });

        generator.generate(iface);

        const code = stringify(file);
        expect(code).toContain("get buildName(): string {");
        expect(code).toContain('return this.getProperty("build-name");');
        expect(code).toContain("set buildName(value: string) {");
        expect(code).toContain('this.setProperty("build-name", value);');
    });

    it("does not emit Object.defineProperty for interface properties", () => {
        const { generator, file } = createTestSetup();
        const iface = createNormalizedInterface({
            name: "Buildable",
            methods: [],
            properties: [
                createNormalizedProperty({
                    name: "build-name",
                    type: createNormalizedType({ name: "utf8" }),
                    getter: undefined,
                    setter: undefined,
                }),
            ],
        });

        generator.generate(iface);

        const code = stringify(file);
        expect(code).not.toContain("Object.defineProperty");
    });
});

describe("InterfaceGenerator / property accessors (2)", () => {
    it("emits a getter-only accessor for construct-only properties", () => {
        const { generator, file } = createTestSetup();
        const iface = createNormalizedInterface({
            name: "Buildable",
            methods: [],
            properties: [
                createNormalizedProperty({
                    name: "build-id",
                    type: createNormalizedType({ name: "utf8" }),
                    constructOnly: true,
                    getter: undefined,
                    setter: undefined,
                }),
            ],
        });

        generator.generate(iface);

        const code = stringify(file);
        expect(code).toContain("get buildId(): string {");
        expect(code).not.toContain("set buildId(");
    });
});

describe("InterfaceGenerator / integration", () => {
    it("generates complete interface class", () => {
        const { generator, file } = createTestSetup();
        const iface = createNormalizedInterface({
            name: "Orientable",
            glibTypeName: "GtkOrientable",
            doc: "Interface for orientable widgets",
            methods: [
                createNormalizedMethod({
                    name: "get_orientation",
                    cIdentifier: "gtk_orientable_get_orientation",
                    returnType: createNormalizedType({ name: "gint" }),
                    doc: "Gets the orientation",
                }),
                createNormalizedMethod({
                    name: "set_orientation",
                    cIdentifier: "gtk_orientable_set_orientation",
                    returnType: createNormalizedType({ name: "none" }),
                    parameters: [
                        createNormalizedParameter({
                            name: "orientation",
                            type: createNormalizedType({ name: "gint" }),
                        }),
                    ],
                }),
            ],
        });

        generator.generate(iface);

        const code = stringify(file);
        expect(code).toContain("export class Orientable extends GObject.Object");
        expect(code).toContain("getOrientation");
        expect(code).toContain("setOrientation");
    });
});

describe("InterfaceGenerator - GObject namespace", () => {
    it("extends the local Object class within the GObject namespace", () => {
        const { generator, file } = createTestSetup(new Map(), "GObject");
        const iface = createNormalizedInterface({
            name: "TypePlugin",
            qualifiedName: qualifiedName("GObject", "TypePlugin"),
            methods: [],
        });

        generator.generate(iface);

        const code = stringify(file);
        expect(code).toContain("export class TypePlugin extends Object");
    });

    it("extends the local Object ConstructorProperties within the GObject namespace", () => {
        const { generator, file } = createTestSetup(new Map(), "GObject");
        const iface = createNormalizedInterface({
            name: "TypePlugin",
            qualifiedName: qualifiedName("GObject", "TypePlugin"),
            methods: [],
        });

        generator.generate(iface);

        const code = stringify(file);
        expect(code).toContain("Object.ConstructorProperties");
    });
});

describe("InterfaceGenerator - constructor properties namespace", () => {
    it("extends the ConstructorProperties of a same-namespace prerequisite interface", () => {
        const ns = createNormalizedNamespace({ name: "Gtk" });
        const buildable = createNormalizedInterface({
            name: "Buildable",
            qualifiedName: qualifiedName("Gtk", "Buildable"),
            methods: [],
        });
        ns.interfaces.set("Buildable", buildable);
        const { generator, file } = createTestSetup(new Map([["Gtk", ns]]));

        const iface = createNormalizedInterface({
            name: "Orientable",
            qualifiedName: qualifiedName("Gtk", "Orientable"),
            prerequisites: [qualifiedName("Gtk", "Buildable")],
            methods: [],
        });

        generator.generate(iface);

        const code = stringify(file);
        expect(code).toContain("Buildable.ConstructorProperties");
    });
});

describe("InterfaceGenerator - prerequisite methods (1)", () => {
    it("emits methods inherited from a prerequisite interface", () => {
        const ns = createNormalizedNamespace({ name: "Gtk" });
        const buildable = createNormalizedInterface({
            name: "Buildable",
            qualifiedName: qualifiedName("Gtk", "Buildable"),
            methods: [
                createNormalizedMethod({
                    name: "get_buildable_id",
                    cIdentifier: "gtk_buildable_get_buildable_id",
                    returnType: createNormalizedType({ name: "utf8" }),
                }),
            ],
        });
        ns.interfaces.set("Buildable", buildable);
        const { generator, file } = createTestSetup(new Map([["Gtk", ns]]));

        const iface = createNormalizedInterface({
            name: "Orientable",
            qualifiedName: qualifiedName("Gtk", "Orientable"),
            prerequisites: [qualifiedName("Gtk", "Buildable")],
            methods: [
                createNormalizedMethod({
                    name: "get_orientation",
                    cIdentifier: "gtk_orientable_get_orientation",
                    returnType: createNormalizedType({ name: "gint" }),
                }),
            ],
        });

        generator.generate(iface);

        const code = stringify(file);
        expect(code).toContain("getBuildableId");
        expect(code).toContain("getOrientation");
    });
});

describe("InterfaceGenerator - prerequisite methods (2)", () => {
    it("emits methods inherited from a prerequisite class hierarchy", () => {
        const ns = createNormalizedNamespace({ name: "Gtk" });
        const widget = createNormalizedClass(
            {
                name: "Widget",
                qualifiedName: qualifiedName("Gtk", "Widget"),
                parent: null,
                methods: [
                    createNormalizedMethod({
                        name: "show",
                        cIdentifier: "gtk_widget_show",
                        returnType: createNormalizedType({ name: "none" }),
                    }),
                ],
            },
            createMockRepository(new Map([["Gtk", ns]])),
        );
        ns.classes.set("Widget", widget);
        const { generator, file } = createTestSetup(new Map([["Gtk", ns]]));

        const iface = createNormalizedInterface({
            name: "Native",
            qualifiedName: qualifiedName("Gtk", "Native"),
            prerequisites: [qualifiedName("Gtk", "Widget")],
            methods: [],
        });

        generator.generate(iface);

        const code = stringify(file);
        expect(code).toContain("show");
    });
});

describe("InterfaceGenerator - prerequisite methods (3)", () => {
    it("emits properties inherited from a prerequisite interface", () => {
        const ns = createNormalizedNamespace({ name: "Gtk" });
        const buildable = createNormalizedInterface({
            name: "Buildable",
            qualifiedName: qualifiedName("Gtk", "Buildable"),
            methods: [],
            properties: [
                createNormalizedProperty({
                    name: "build-name",
                    type: createNormalizedType({ name: "utf8" }),
                    getter: undefined,
                    setter: undefined,
                }),
            ],
        });
        ns.interfaces.set("Buildable", buildable);
        const { generator, file } = createTestSetup(new Map([["Gtk", ns]]));

        const iface = createNormalizedInterface({
            name: "Orientable",
            qualifiedName: qualifiedName("Gtk", "Orientable"),
            prerequisites: [qualifiedName("Gtk", "Buildable")],
            methods: [],
        });

        generator.generate(iface);

        const code = stringify(file);
        expect(code).toContain("get buildName()");
    });
});

describe("InterfaceGenerator - static functions", () => {
    it("emits a static function declared on the interface", () => {
        const { generator, file } = createTestSetup();
        const iface = createNormalizedInterface({
            name: "Buildable",
            methods: [],
            staticFunctions: [
                createNormalizedFunction({
                    name: "get_default",
                    cIdentifier: "gtk_buildable_get_default",
                    returnType: createNormalizedType({ name: "gint" }),
                }),
            ],
        });

        generator.generate(iface);

        const code = stringify(file);
        expect(code).toContain("getDefault");
    });

    it("emits a throwing stub for an unsafe static function", () => {
        const { generator, file } = createTestSetup();
        const iface = createNormalizedInterface({
            name: "Buildable",
            methods: [],
            staticFunctions: [
                createNormalizedFunction({
                    name: "with_closure",
                    cIdentifier: "gtk_buildable_with_closure",
                    returnType: createNormalizedType({ name: "none" }),
                    parameters: [
                        createNormalizedParameter({
                            name: "closure",
                            type: createNormalizedType({ name: "GLib.Closure" }),
                        }),
                    ],
                }),
            ],
        });

        generator.generate(iface);

        const code = stringify(file);
        expect(code).toContain("withClosure");
        expect(code).toContain("throwUnsupported");
    });
});

describe("InterfaceGenerator - method name collisions", () => {
    it("renames an interface method that collides with a GObject method name", () => {
        const gobjectNs = createNormalizedNamespace({ name: "GObject" });
        const gobject = createNormalizedClass(
            {
                name: "Object",
                qualifiedName: qualifiedName("GObject", "Object"),
                parent: null,
                methods: [
                    createNormalizedMethod({
                        name: "connect",
                        cIdentifier: "g_object_connect",
                        returnType: createNormalizedType({ name: "none" }),
                    }),
                ],
            },
            createMockRepository(new Map([["GObject", gobjectNs]])),
        );
        gobjectNs.classes.set("Object", gobject);

        const gtkNs = createNormalizedNamespace({ name: "Gtk" });
        const { generator, file } = createTestSetup(
            new Map([
                ["Gtk", gtkNs],
                ["GObject", gobjectNs],
            ]),
        );

        const iface = createNormalizedInterface({
            name: "Buildable",
            qualifiedName: qualifiedName("Gtk", "Buildable"),
            methods: [
                createNormalizedMethod({
                    name: "connect",
                    cIdentifier: "gtk_buildable_connect",
                    returnType: createNormalizedType({ name: "none" }),
                }),
            ],
        });

        const result = generator.generate(iface);

        expect(result).toBe(true);
        expect(stringify(file)).toContain("class Buildable");
    });
});
