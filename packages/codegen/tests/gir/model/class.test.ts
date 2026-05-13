import { describe, expect, it } from "vitest";
import { GirConstructor, GirFunction, GirMethod } from "../../../src/gir/model/callables.js";
import { GirClass } from "../../../src/gir/model/class.js";
import type { GirInterface } from "../../../src/gir/model/interface.js";
import { GirProperty } from "../../../src/gir/model/property.js";
import type { RepositoryLike } from "../../../src/gir/model/repository-like.js";
import { GirSignal } from "../../../src/gir/model/signal.js";
import { GirType } from "../../../src/gir/model/type.js";

function makeType(name = "none"): GirType {
    return new GirType({ name, isArray: false, elementType: null, nullable: false });
}

function makeMethod(name: string, cIdentifier = `gtk_${name}`): GirMethod {
    return new GirMethod({
        name,
        cIdentifier,
        returnType: makeType(),
        parameters: [],
        throws: false,
    });
}

function makeProperty(name: string): GirProperty {
    return new GirProperty({
        name,
        type: makeType("gint"),
        writable: true,
        readable: true,
        constructOnly: false,
        defaultValue: null,
    });
}

function makeSignal(name: string): GirSignal {
    return new GirSignal({
        name,
        when: "last",
        returnType: makeType(),
        parameters: [],
    });
}

type ClassData = ConstructorParameters<typeof GirClass>[0];

function makeClass(repo: RepositoryLike, overrides: Partial<ClassData> = {}): GirClass {
    const data: ClassData = {
        name: "Widget",
        qualifiedName: "Gtk.Widget",
        cType: "GtkWidget",
        parent: null,
        abstract: false,
        implements: [],
        methods: [],
        constructors: [],
        staticFunctions: [],
        properties: [],
        signals: [],
        ...overrides,
    };
    return new GirClass(data, repo);
}

function createRepo(): {
    repo: RepositoryLike;
    addClass: (cls: GirClass) => void;
    addInterface: (iface: GirInterface) => void;
} {
    const classes = new Map<string, GirClass>();
    const interfaces = new Map<string, GirInterface>();
    const repo: RepositoryLike = {
        resolveClass: (name) => classes.get(name) ?? null,
        resolveInterface: (name) => interfaces.get(name) ?? null,
        findClasses: (predicate) => [...classes.values()].filter(predicate),
    };
    return {
        repo,
        addClass: (cls) => classes.set(cls.qualifiedName, cls),
        addInterface: (iface) => interfaces.set(iface.qualifiedName, iface),
    };
}

describe("GirClass", () => {
    describe("getParent", () => {
        it("returns null for root classes", () => {
            const { repo } = createRepo();
            const widget = makeClass(repo);
            expect(widget.getParent()).toBeNull();
        });

        it("resolves parent through the repository", () => {
            const ctx = createRepo();
            const parent = makeClass(ctx.repo, { name: "InitiallyUnowned", qualifiedName: "GObject.InitiallyUnowned" });
            ctx.addClass(parent);
            const widget = makeClass(ctx.repo, { parent: "GObject.InitiallyUnowned" });
            expect(widget.getParent()).toBe(parent);
        });
    });

    describe("implementsInterface", () => {
        it("returns true when the interface is directly implemented", () => {
            const { repo } = createRepo();
            const widget = makeClass(repo, { implements: ["Gtk.Buildable"] });
            expect(widget.implementsInterface("Gtk.Buildable")).toBe(true);
        });

        it("returns true when an ancestor implements the interface", () => {
            const ctx = createRepo();
            const grandparent = makeClass(ctx.repo, {
                name: "InitiallyUnowned",
                qualifiedName: "GObject.InitiallyUnowned",
                implements: ["Gtk.Buildable"],
            });
            ctx.addClass(grandparent);
            const widget = makeClass(ctx.repo, { parent: "GObject.InitiallyUnowned" });
            expect(widget.implementsInterface("Gtk.Buildable")).toBe(true);
        });

        it("returns false when neither the class nor its ancestors implement the interface", () => {
            const { repo } = createRepo();
            const widget = makeClass(repo, { implements: ["Gtk.Buildable"] });
            expect(widget.implementsInterface("Gtk.Actionable")).toBe(false);
        });
    });

    describe("getAllImplementedInterfaces", () => {
        it("returns an empty list for a root class without interfaces", () => {
            const { repo } = createRepo();
            const widget = makeClass(repo);
            expect(widget.getAllImplementedInterfaces()).toEqual([]);
        });

        it("merges interfaces from the class and its inheritance chain", () => {
            const ctx = createRepo();
            const grandparent = makeClass(ctx.repo, {
                qualifiedName: "GObject.InitiallyUnowned",
                implements: ["Gtk.Buildable"],
            });
            ctx.addClass(grandparent);
            const parent = makeClass(ctx.repo, {
                qualifiedName: "Gtk.Widget",
                parent: "GObject.InitiallyUnowned",
                implements: ["Gtk.ConstraintTarget"],
            });
            ctx.addClass(parent);
            const button = makeClass(ctx.repo, {
                qualifiedName: "Gtk.Button",
                parent: "Gtk.Widget",
                implements: ["Gtk.Actionable"],
            });
            ctx.addClass(button);
            expect(new Set(button.getAllImplementedInterfaces())).toEqual(
                new Set(["Gtk.Actionable", "Gtk.ConstraintTarget", "Gtk.Buildable"]),
            );
        });
    });

    describe("lookup helpers", () => {
        const ctx = createRepo();
        const method = makeMethod("show", "gtk_widget_show");
        const property = makeProperty("visible");
        const signal = makeSignal("clicked");
        const ctor = new GirConstructor({
            name: "new",
            cIdentifier: "gtk_widget_new",
            returnType: makeType("Gtk.Widget"),
            parameters: [],
            throws: false,
        });
        const widget = makeClass(ctx.repo, {
            methods: [method],
            properties: [property],
            signals: [signal],
            constructors: [ctor],
        });

        it("getMethod returns the matching method or null", () => {
            expect(widget.getMethod("show")).toBe(method);
            expect(widget.getMethod("hide")).toBeNull();
        });

        it("getMethodByCIdentifier finds methods by C symbol", () => {
            expect(widget.getMethodByCIdentifier("gtk_widget_show")).toBe(method);
            expect(widget.getMethodByCIdentifier("gtk_widget_hide")).toBeNull();
        });

        it("getProperty returns the matching property or null", () => {
            expect(widget.getProperty("visible")).toBe(property);
            expect(widget.getProperty("focused")).toBeNull();
        });

        it("getSignal returns the matching signal or null", () => {
            expect(widget.getSignal("clicked")).toBe(signal);
            expect(widget.getSignal("activated")).toBeNull();
        });

        it("getConstructor returns the matching constructor or null", () => {
            expect(widget.getConstructor("new")).toBe(ctor);
            expect(widget.getConstructor("with_label")).toBeNull();
        });
    });

    describe("inheritance accumulators", () => {
        function buildHierarchy() {
            const ctx = createRepo();
            const parentMethod = makeMethod("show");
            const parentProperty = makeProperty("visible");
            const parentSignal = makeSignal("realize");
            const parent = makeClass(ctx.repo, {
                qualifiedName: "Gtk.Widget",
                methods: [parentMethod],
                properties: [parentProperty],
                signals: [parentSignal],
            });
            ctx.addClass(parent);
            const childMethod = makeMethod("clicked");
            const childProperty = makeProperty("label");
            const childSignal = makeSignal("clicked");
            const child = makeClass(ctx.repo, {
                name: "Button",
                qualifiedName: "Gtk.Button",
                parent: "Gtk.Widget",
                methods: [childMethod],
                properties: [childProperty],
                signals: [childSignal],
            });
            return {
                child,
                parent,
                childMethod,
                parentMethod,
                childProperty,
                parentProperty,
                childSignal,
                parentSignal,
            };
        }

        it("getAllMethods includes own and inherited methods in declaration order", () => {
            const h = buildHierarchy();
            expect(h.child.getAllMethods()).toEqual([h.childMethod, h.parentMethod]);
        });

        it("getAllProperties includes own and inherited properties", () => {
            const h = buildHierarchy();
            expect(h.child.getAllProperties()).toEqual([h.childProperty, h.parentProperty]);
        });

        it("getAllSignals includes own and inherited signals", () => {
            const h = buildHierarchy();
            expect(h.child.getAllSignals()).toEqual([h.childSignal, h.parentSignal]);
        });
    });

    describe("find helpers walk up the inheritance chain", () => {
        function buildHierarchy() {
            const ctx = createRepo();
            const parentMethod = makeMethod("show");
            const parentProperty = makeProperty("visible");
            const parentSignal = makeSignal("realize");
            const parent = makeClass(ctx.repo, {
                qualifiedName: "Gtk.Widget",
                methods: [parentMethod],
                properties: [parentProperty],
                signals: [parentSignal],
            });
            ctx.addClass(parent);
            const child = makeClass(ctx.repo, {
                name: "Button",
                qualifiedName: "Gtk.Button",
                parent: "Gtk.Widget",
            });
            return { child, parentMethod, parentProperty, parentSignal };
        }

        it("findMethod resolves through the parent class", () => {
            const h = buildHierarchy();
            expect(h.child.findMethod("show")).toBe(h.parentMethod);
            expect(h.child.findMethod("nonexistent")).toBeNull();
        });

        it("findProperty resolves through the parent class", () => {
            const h = buildHierarchy();
            expect(h.child.findProperty("visible")).toBe(h.parentProperty);
            expect(h.child.findProperty("nonexistent")).toBeNull();
        });

        it("findSignal resolves through the parent class", () => {
            const h = buildHierarchy();
            expect(h.child.findSignal("realize")).toBe(h.parentSignal);
            expect(h.child.findSignal("nonexistent")).toBeNull();
        });
    });

    describe("classification helpers", () => {
        it("isAbstract reflects the abstract flag", () => {
            const { repo } = createRepo();
            expect(makeClass(repo, { abstract: true }).isAbstract()).toBe(true);
            expect(makeClass(repo, { abstract: false }).isAbstract()).toBe(false);
        });

        it("hasGType is true when glibTypeName is set", () => {
            const { repo } = createRepo();
            expect(makeClass(repo, { glibTypeName: "GtkWidget" }).hasGType()).toBe(true);
            expect(makeClass(repo).hasGType()).toBe(false);
        });

        it("isFundamental requires fundamental flag and ref/unref pair", () => {
            const { repo } = createRepo();
            expect(
                makeClass(repo, {
                    fundamental: true,
                    refFunc: "g_object_ref",
                    unrefFunc: "g_object_unref",
                }).isFundamental(),
            ).toBe(true);
            expect(makeClass(repo, { fundamental: true }).isFundamental()).toBe(false);
            expect(makeClass(repo, { fundamental: false }).isFundamental()).toBe(false);
        });
    });

    describe("getDirectSubclasses", () => {
        it("returns classes whose parent matches this class's qualifiedName", () => {
            const ctx = createRepo();
            const widget = makeClass(ctx.repo);
            ctx.addClass(widget);
            const button = makeClass(ctx.repo, {
                name: "Button",
                qualifiedName: "Gtk.Button",
                parent: "Gtk.Widget",
            });
            ctx.addClass(button);
            const label = makeClass(ctx.repo, {
                name: "Label",
                qualifiedName: "Gtk.Label",
                parent: "Gtk.Widget",
            });
            ctx.addClass(label);
            const window = makeClass(ctx.repo, {
                name: "Window",
                qualifiedName: "Gtk.Window",
                parent: "Gtk.Bin",
            });
            ctx.addClass(window);
            expect(new Set(widget.getDirectSubclasses())).toEqual(new Set([button, label]));
        });
    });

    describe("getInheritanceChain", () => {
        it("includes self and all ancestors in order", () => {
            const ctx = createRepo();
            const grandparent = makeClass(ctx.repo, {
                qualifiedName: "GObject.Object",
            });
            ctx.addClass(grandparent);
            const parent = makeClass(ctx.repo, {
                qualifiedName: "Gtk.Widget",
                parent: "GObject.Object",
            });
            ctx.addClass(parent);
            const child = makeClass(ctx.repo, {
                qualifiedName: "Gtk.Button",
                parent: "Gtk.Widget",
            });
            expect(child.getInheritanceChain()).toEqual(["Gtk.Button", "Gtk.Widget", "GObject.Object"]);
        });
    });

    describe("ignored field arguments", () => {
        it("retains optional callable arrays passed at construction", () => {
            const { repo } = createRepo();
            const staticFn = new GirFunction({
                name: "default",
                cIdentifier: "gtk_widget_get_default",
                returnType: makeType("Gtk.Widget"),
                parameters: [],
                throws: false,
            });
            const widget = makeClass(repo, { staticFunctions: [staticFn] });
            expect(widget.staticFunctions).toEqual([staticFn]);
        });
    });
});
