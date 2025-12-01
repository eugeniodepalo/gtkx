import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import { type GirNamespace, GirParser } from "../src/index.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const workspaceRoot = resolve(__dirname, "../../..");
const girsDir = join(workspaceRoot, "girs");

const loadGirFile = (filename: string): GirNamespace => {
    const content = readFileSync(join(girsDir, filename), "utf-8");
    const parser = new GirParser();
    return parser.parse(content);
};

describe("GirParser", () => {
    let gtkNamespace: GirNamespace;
    let gobjectNamespace: GirNamespace;
    let glibNamespace: GirNamespace;
    let gdkNamespace: GirNamespace;
    let gioNamespace: GirNamespace;

    beforeAll(() => {
        gtkNamespace = loadGirFile("Gtk-4.0.gir");
        gobjectNamespace = loadGirFile("GObject-2.0.gir");
        glibNamespace = loadGirFile("GLib-2.0.gir");
        gdkNamespace = loadGirFile("Gdk-4.0.gir");
        gioNamespace = loadGirFile("Gio-2.0.gir");
    });

    describe("namespace metadata", () => {
        it("parses namespace name", () => {
            expect(gtkNamespace.name).toBe("Gtk");
            expect(gobjectNamespace.name).toBe("GObject");
            expect(glibNamespace.name).toBe("GLib");
        });

        it("parses namespace version", () => {
            expect(gtkNamespace.version).toBe("4.0");
            expect(gobjectNamespace.version).toBe("2.0");
        });

        it("parses shared library", () => {
            expect(gtkNamespace.sharedLibrary).toContain("gtk");
            expect(gobjectNamespace.sharedLibrary).toContain("gobject");
        });
    });

    describe("class metadata", () => {
        it("parses class name", () => {
            const button = gtkNamespace.classes.find((c) => c.name === "Button");
            expect(button).toBeDefined();
            expect(button?.name).toBe("Button");
        });

        it("parses parent class", () => {
            const button = gtkNamespace.classes.find((c) => c.name === "Button");
            expect(button?.parent).toBe("Widget");
        });

        it("parses cross-namespace parent", () => {
            const widget = gtkNamespace.classes.find((c) => c.name === "Widget");
            expect(widget?.parent).toBe("GObject.InitiallyUnowned");
        });

        it("parses abstract attribute", () => {
            const widget = gtkNamespace.classes.find((c) => c.name === "Widget");
            expect(widget?.abstract).toBe(true);

            const button = gtkNamespace.classes.find((c) => c.name === "Button");
            expect(button?.abstract).toBe(false);
        });

        it("parses cType", () => {
            const button = gtkNamespace.classes.find((c) => c.name === "Button");
            expect(button?.cType).toBe("GtkButton");
        });

        it("parses interface implementations", () => {
            const button = gtkNamespace.classes.find((c) => c.name === "Button");
            expect(button?.implements).toContain("Actionable");
        });

        it("parses glib:type-name", () => {
            const button = gtkNamespace.classes.find((c) => c.name === "Button");
            expect(button?.glibTypeName).toBe("GtkButton");
        });

        it("parses glib:get-type", () => {
            const button = gtkNamespace.classes.find((c) => c.name === "Button");
            expect(button?.glibGetType).toBe("gtk_button_get_type");
        });

        it("parses c:symbol-prefix", () => {
            const button = gtkNamespace.classes.find((c) => c.name === "Button");
            expect(button?.cSymbolPrefix).toBe("button");
        });
    });

    describe("constructor metadata", () => {
        it("parses constructors", () => {
            const button = gtkNamespace.classes.find((c) => c.name === "Button");
            expect(button?.constructors.length).toBeGreaterThan(0);
        });

        it("parses constructor c:identifier", () => {
            const button = gtkNamespace.classes.find((c) => c.name === "Button");
            const newCtor = button?.constructors.find((c) => c.name === "new");
            expect(newCtor?.cIdentifier).toBe("gtk_button_new");
        });

        it("parses constructor with parameters", () => {
            const button = gtkNamespace.classes.find((c) => c.name === "Button");
            const withLabelCtor = button?.constructors.find((c) => c.name === "new_with_label");
            expect(withLabelCtor).toBeDefined();
            expect(withLabelCtor?.parameters.length).toBeGreaterThan(0);
            expect(withLabelCtor?.parameters[0]?.name).toBe("label");
        });

        it("parses constructor return type", () => {
            const button = gtkNamespace.classes.find((c) => c.name === "Button");
            const newCtor = button?.constructors.find((c) => c.name === "new");
            expect(newCtor?.returnType.name).toBeDefined();
            expect(["Button", "Widget"]).toContain(newCtor?.returnType.name);
        });

        it("parses constructor throws attribute", () => {
            const throwingCtors = gioNamespace.classes.flatMap((c) =>
                c.constructors.filter((ctor) => ctor.throws === true),
            );
            expect(throwingCtors.length).toBeGreaterThan(0);
        });
    });

    describe("method metadata", () => {
        it("parses methods", () => {
            const button = gtkNamespace.classes.find((c) => c.name === "Button");
            expect(button?.methods.length).toBeGreaterThan(0);
        });

        it("parses method c:identifier", () => {
            const button = gtkNamespace.classes.find((c) => c.name === "Button");
            const setLabel = button?.methods.find((m) => m.name === "set_label");
            expect(setLabel?.cIdentifier).toBe("gtk_button_set_label");
        });

        it("parses method return type", () => {
            const button = gtkNamespace.classes.find((c) => c.name === "Button");
            const getLabel = button?.methods.find((m) => m.name === "get_label");
            expect(getLabel?.returnType.name).toBe("utf8");
        });

        it("parses throws attribute", () => {
            const allMethodsWithThrows = gioNamespace.classes.flatMap((c) =>
                c.methods.filter((m) => m.throws === true),
            );
            expect(allMethodsWithThrows.length).toBeGreaterThan(0);
        });
    });

    describe("parameter metadata", () => {
        it("parses parameter name", () => {
            const button = gtkNamespace.classes.find((c) => c.name === "Button");
            const setLabel = button?.methods.find((m) => m.name === "set_label");
            expect(setLabel?.parameters[0]?.name).toBe("label");
        });

        it("parses parameter type", () => {
            const button = gtkNamespace.classes.find((c) => c.name === "Button");
            const setLabel = button?.methods.find((m) => m.name === "set_label");
            expect(setLabel?.parameters[0]?.type.name).toBe("utf8");
        });

        it("parses nullable attribute", () => {
            const button = gtkNamespace.classes.find((c) => c.name === "Button");
            const setChild = button?.methods.find((m) => m.name === "set_child");
            expect(setChild?.parameters[0]?.nullable).toBe(true);
        });

        it("parses direction attribute for out parameters", () => {
            const widget = gtkNamespace.classes.find((c) => c.name === "Widget");
            const methodsWithOutParams = widget?.methods.filter((m) =>
                m.parameters.some((p) => p.direction === "out" || p.direction === "inout"),
            );
            expect(methodsWithOutParams?.length).toBeGreaterThan(0);
        });

        it("parses scope attribute for callbacks", () => {
            const methodsWithCallbacks = gtkNamespace.classes.flatMap((c) =>
                c.methods.filter((m) => m.parameters.some((p) => p.scope !== undefined)),
            );
            expect(methodsWithCallbacks.length).toBeGreaterThan(0);
        });

        it("parses closure attribute", () => {
            const methodsWithClosure = gtkNamespace.classes.flatMap((c) =>
                c.methods.filter((m) => m.parameters.some((p) => p.closure !== undefined)),
            );
            expect(methodsWithClosure.length).toBeGreaterThan(0);
        });
    });

    describe("enumeration metadata", () => {
        it("parses enumerations", () => {
            expect(gtkNamespace.enumerations.length).toBeGreaterThan(0);
        });

        it("parses enumeration name", () => {
            const align = gtkNamespace.enumerations.find((e) => e.name === "Align");
            expect(align).toBeDefined();
        });

        it("parses enumeration members", () => {
            const align = gtkNamespace.enumerations.find((e) => e.name === "Align");
            expect(align?.members.length).toBeGreaterThan(0);
            expect(align?.members.some((m) => m.name === "center")).toBe(true);
        });

        it("parses enumeration member values", () => {
            const align = gtkNamespace.enumerations.find((e) => e.name === "Align");
            const center = align?.members.find((m) => m.name === "center");
            expect(center?.value).toBeDefined();
        });

        it("parses bitfields", () => {
            expect(gtkNamespace.bitfields.length).toBeGreaterThan(0);
        });
    });

    describe("record metadata", () => {
        it("parses records", () => {
            expect(gdkNamespace.records.length).toBeGreaterThan(0);
        });

        it("parses glib:type-name for boxed types", () => {
            const rgba = gdkNamespace.records.find((r) => r.name === "RGBA");
            expect(rgba?.glibTypeName).toBe("GdkRGBA");
        });

        it("parses glib:get-type for boxed types", () => {
            const rgba = gdkNamespace.records.find((r) => r.name === "RGBA");
            expect(rgba?.glibGetType).toBe("gdk_rgba_get_type");
        });

        it("parses disguised attribute", () => {
            const disguisedRecords = gdkNamespace.records.filter((r) => r.disguised === true);
            expect(disguisedRecords.length).toBeGreaterThan(0);
        });

        it("parses record fields", () => {
            const rgba = gdkNamespace.records.find((r) => r.name === "RGBA");
            expect(rgba?.fields.length).toBeGreaterThan(0);
            expect(rgba?.fields.some((f) => f.name === "red")).toBe(true);
        });

        it("parses record methods", () => {
            const rgba = gdkNamespace.records.find((r) => r.name === "RGBA");
            expect(rgba?.methods.length).toBeGreaterThan(0);
        });
    });

    describe("signal metadata", () => {
        it("parses signals", () => {
            const button = gtkNamespace.classes.find((c) => c.name === "Button");
            expect(button?.signals.length).toBeGreaterThan(0);
        });

        it("parses signal name", () => {
            const button = gtkNamespace.classes.find((c) => c.name === "Button");
            expect(button?.signals.some((s) => s.name === "clicked")).toBe(true);
        });

        it("parses signal when attribute", () => {
            const button = gtkNamespace.classes.find((c) => c.name === "Button");
            const clicked = button?.signals.find((s) => s.name === "clicked");
            expect(["first", "last", "cleanup"]).toContain(clicked?.when);
        });
    });

    describe("interface metadata", () => {
        it("parses interfaces", () => {
            expect(gtkNamespace.interfaces.length).toBeGreaterThan(0);
        });

        it("parses interface name", () => {
            const actionable = gtkNamespace.interfaces.find((i) => i.name === "Actionable");
            expect(actionable).toBeDefined();
        });

        it("parses interface methods", () => {
            const actionable = gtkNamespace.interfaces.find((i) => i.name === "Actionable");
            expect(actionable?.methods.length).toBeGreaterThan(0);
        });
    });

    describe("property metadata", () => {
        it("parses properties", () => {
            const button = gtkNamespace.classes.find((c) => c.name === "Button");
            expect(button?.properties.length).toBeGreaterThan(0);
        });

        it("parses property readable/writable", () => {
            const button = gtkNamespace.classes.find((c) => c.name === "Button");
            const labelProp = button?.properties.find((p) => p.name === "label");
            expect(labelProp?.readable).toBe(true);
            expect(labelProp?.writable).toBe(true);
        });

        it("parses construct-only properties", () => {
            const constructOnlyProps = gtkNamespace.classes.flatMap((c) =>
                c.properties.filter((p) => p.constructOnly === true),
            );
            expect(constructOnlyProps.length).toBeGreaterThan(0);
        });
    });

    describe("transfer ownership", () => {
        it("parses transfer-ownership attribute", () => {
            const button = gtkNamespace.classes.find((c) => c.name === "Button");
            const getLabel = button?.methods.find((m) => m.name === "get_label");
            expect(["none", "full", "container"]).toContain(getLabel?.returnType.transferOwnership);
        });
    });

    describe("array types", () => {
        it("parses array types", () => {
            const methodsWithArrays = gtkNamespace.classes.flatMap((c) =>
                c.methods.filter(
                    (m) => m.returnType.isArray === true || m.parameters.some((p) => p.type.isArray === true),
                ),
            );
            expect(methodsWithArrays.length).toBeGreaterThan(0);
        });

        it("parses array element type", () => {
            const methodsWithArrays = gtkNamespace.classes.flatMap((c) =>
                c.methods.filter((m) => m.returnType.isArray === true && m.returnType.elementType),
            );
            if (methodsWithArrays.length > 0) {
                expect(methodsWithArrays[0]?.returnType.elementType).toBeDefined();
            }
        });
    });

    describe("callback metadata", () => {
        it("parses callbacks", () => {
            expect(gtkNamespace.callbacks.length).toBeGreaterThan(0);
        });

        it("parses callback name and cType", () => {
            const tickCallback = gtkNamespace.callbacks.find((c) => c.name === "TickCallback");
            expect(tickCallback).toBeDefined();
            expect(tickCallback?.cType).toBe("GtkTickCallback");
        });

        it("parses callback parameters", () => {
            const tickCallback = gtkNamespace.callbacks.find((c) => c.name === "TickCallback");
            expect(tickCallback?.parameters.length).toBeGreaterThan(0);
        });

        it("parses callback return type", () => {
            const tickCallback = gtkNamespace.callbacks.find((c) => c.name === "TickCallback");
            expect(tickCallback?.returnType).toBeDefined();
        });
    });

    describe("inheritance handling", () => {
        describe("same-namespace inheritance", () => {
            it("Button inherits from Widget", () => {
                const button = gtkNamespace.classes.find((c) => c.name === "Button");
                expect(button?.parent).toBe("Widget");
            });

            it("Entry inherits from Widget", () => {
                const entry = gtkNamespace.classes.find((c) => c.name === "Entry");
                expect(entry?.parent).toBe("Widget");
            });

            it("Window inherits from Widget", () => {
                const window = gtkNamespace.classes.find((c) => c.name === "Window");
                expect(window?.parent).toBe("Widget");
            });

            it("ApplicationWindow inherits from Window", () => {
                const appWindow = gtkNamespace.classes.find((c) => c.name === "ApplicationWindow");
                expect(appWindow?.parent).toBe("Window");
            });
        });

        describe("cross-namespace inheritance", () => {
            it("Gtk.Widget inherits from GObject.InitiallyUnowned", () => {
                const widget = gtkNamespace.classes.find((c) => c.name === "Widget");
                expect(widget?.parent).toBe("GObject.InitiallyUnowned");
            });

            it("Gtk.Application inherits from Gio.Application", () => {
                const app = gtkNamespace.classes.find((c) => c.name === "Application");
                expect(app?.parent).toBe("Gio.Application");
            });

            it("GObject.InitiallyUnowned inherits from GObject.Object", () => {
                const initiallyUnowned = gobjectNamespace.classes.find((c) => c.name === "InitiallyUnowned");
                expect(initiallyUnowned?.parent).toBe("Object");
            });
        });

        describe("inheritance chain resolution", () => {
            it("resolves full inheritance chain for Button", () => {
                const getParentClass = (
                    className: string,
                    namespace: string,
                ): { name: string; namespace: string } | undefined => {
                    const ns = namespace === "Gtk" ? gtkNamespace : gobjectNamespace;
                    const cls = ns.classes.find((c) => c.name === className);
                    if (!cls?.parent) return undefined;

                    if (cls.parent.includes(".")) {
                        const [parentNs = "", parentName = ""] = cls.parent.split(".");
                        return { name: parentName, namespace: parentNs };
                    }
                    return { name: cls.parent, namespace };
                };

                const chain: string[] = ["Gtk.Button"];
                let current = getParentClass("Button", "Gtk");

                while (current) {
                    chain.push(`${current.namespace}.${current.name}`);
                    current = getParentClass(current.name, current.namespace);
                }

                expect(chain).toContain("Gtk.Button");
                expect(chain).toContain("Gtk.Widget");
                expect(chain).toContain("GObject.InitiallyUnowned");
                expect(chain).toContain("GObject.Object");
            });
        });

        describe("interface implementation", () => {
            it("Button implements Actionable", () => {
                const button = gtkNamespace.classes.find((c) => c.name === "Button");
                expect(button?.implements).toContain("Actionable");
            });

            it("Widget implements Accessible and Buildable", () => {
                const widget = gtkNamespace.classes.find((c) => c.name === "Widget");
                expect(widget?.implements).toContain("Accessible");
                expect(widget?.implements).toContain("Buildable");
            });

            it("Application implements ActionGroup and ActionMap", () => {
                const app = gtkNamespace.classes.find((c) => c.name === "Application");
                expect(app?.implements).toContain("Gio.ActionGroup");
                expect(app?.implements).toContain("Gio.ActionMap");
            });
        });
    });

    describe("nullable and optional parameters", () => {
        it("identifies nullable parameters", () => {
            const button = gtkNamespace.classes.find((c) => c.name === "Button");
            const setChild = button?.methods.find((m) => m.name === "set_child");
            const childParam = setChild?.parameters.find((p) => p.name === "child");
            expect(childParam?.nullable).toBe(true);
        });

        it("finds methods with nullable parameters", () => {
            const nullableParams = gtkNamespace.classes.flatMap((c) =>
                c.methods.flatMap((m) =>
                    m.parameters
                        .filter((p) => p.nullable === true)
                        .map((p) => ({
                            class: c.name,
                            method: m.name,
                            param: p.name,
                        })),
                ),
            );
            expect(nullableParams.length).toBeGreaterThan(0);
        });

        it("identifies optional parameters from allow-none attribute", () => {
            const optionalParams = gtkNamespace.classes.flatMap((c) =>
                c.methods.flatMap((m) =>
                    m.parameters
                        .filter((p) => p.optional === true)
                        .map((p) => ({
                            class: c.name,
                            method: m.name,
                            param: p.name,
                        })),
                ),
            );
            expect(optionalParams.length).toBeGreaterThan(0);
        });

        it("identifies parameters with closure attribute", () => {
            const paramsWithClosure = gtkNamespace.classes.flatMap((c) =>
                c.methods.flatMap((m) => m.parameters.filter((p) => p.closure !== undefined)),
            );
            expect(paramsWithClosure.length).toBeGreaterThan(0);
        });
    });

    describe("standalone functions", () => {
        it("parses namespace-level functions", () => {
            expect(gtkNamespace.functions.length).toBeGreaterThan(0);
        });

        it("parses function c:identifier", () => {
            const showUri = gtkNamespace.functions.find((f) => f.name === "show_uri");
            expect(showUri?.cIdentifier).toBeDefined();
        });

        it("parses function parameters and return type", () => {
            const showUri = gtkNamespace.functions.find((f) => f.name === "show_uri");
            expect(showUri?.parameters).toBeDefined();
            expect(showUri?.returnType).toBeDefined();
        });
    });

    describe("error handling", () => {
        it("parses methods that throw GError", () => {
            const throwingMethods = gioNamespace.classes.flatMap((c) => c.methods.filter((m) => m.throws === true));
            expect(throwingMethods.length).toBeGreaterThan(0);
        });

        it("parses functions that throw GError", () => {
            const throwingFuncs = gioNamespace.functions.filter((f) => f.throws === true);
            expect(throwingFuncs.length).toBeGreaterThan(0);
        });
    });

    describe("static functions on classes", () => {
        it("parses static functions", () => {
            const classesWithFunctions = gtkNamespace.classes.filter((c) => c.functions.length > 0);
            expect(classesWithFunctions.length).toBeGreaterThan(0);
        });

        it("parses static function c:identifier", () => {
            const classWithFunctions = gtkNamespace.classes.find((c) => c.functions.length > 0);
            const func = classWithFunctions?.functions[0];
            expect(func?.cIdentifier).toBeDefined();
        });
    });

    describe("destroy and scope attributes", () => {
        it("parses destroy attribute for callback parameters", () => {
            const paramsWithDestroy = gtkNamespace.classes.flatMap((c) =>
                c.methods.flatMap((m) => m.parameters.filter((p) => p.destroy !== undefined)),
            );
            expect(paramsWithDestroy.length).toBeGreaterThan(0);
        });

        it("parses scope attribute (call, notified, async)", () => {
            const scopeValues = new Set<string>();
            for (const cls of gtkNamespace.classes) {
                for (const method of cls.methods) {
                    for (const param of method.parameters) {
                        if (param.scope) {
                            scopeValues.add(param.scope);
                        }
                    }
                }
            }
            expect(scopeValues.size).toBeGreaterThan(0);
        });
    });

    describe("glib annotations", () => {
        it("parses glib:type-name for records", () => {
            const rgba = gdkNamespace.records.find((r) => r.name === "RGBA");
            expect(rgba?.glibTypeName).toBe("GdkRGBA");
        });
    });
});
