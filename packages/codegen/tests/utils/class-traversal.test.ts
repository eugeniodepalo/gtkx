import { describe, expect, it } from "vitest";
import {
    collectDirectMembers,
    collectParentMethodNames,
    collectParentPropertyNames,
    collectParentSignalNames,
} from "../../src/utils/class-traversal.js";
import {
    createButtonClass,
    createNormalizedClass,
    createNormalizedInterface,
    createNormalizedMethod,
    createNormalizedNamespace,
    createNormalizedProperty,
    createNormalizedSignal,
    createWidgetClass,
    NULL_REPO,
    qualifiedName,
    singleClassRepo,
} from "../fixtures/gir-fixtures.js";
import { createMockRepository } from "../fixtures/mock-repository.js";

describe("collectParentPropertyNames", () => {
    it("returns empty set for class without parent", () => {
        const cls = createNormalizedClass({ parent: null });
        const repo = createMockRepository();
        const result = collectParentPropertyNames(cls, repo);
        expect(result.size).toBe(0);
    });

    it("collects property names from parent class", () => {
        const widgetClass = createWidgetClass({}, NULL_REPO);
        const buttonClass = createButtonClass({}, singleClassRepo(widgetClass));

        const repo = createMockRepository();
        const result = collectParentPropertyNames(buttonClass, repo);
        expect(result.has("visible")).toBe(true);
        expect(result.has("sensitive")).toBe(true);
        expect(result.has("canFocus")).toBe(true);
    });

    it("converts property names to camelCase", () => {
        const parent = createNormalizedClass(
            {
                name: "Widget",
                parent: null,
                properties: [
                    createNormalizedProperty({ name: "can-focus" }),
                    createNormalizedProperty({ name: "has-default" }),
                ],
            },
            NULL_REPO,
        );

        const child = createNormalizedClass(
            {
                name: "Button",
                parent: qualifiedName("Gtk", "Widget"),
            },
            singleClassRepo(parent),
        );

        const repo = createMockRepository();
        const result = collectParentPropertyNames(child, repo);
        expect(result.has("canFocus")).toBe(true);
        expect(result.has("hasDefault")).toBe(true);
    });
});

describe("collectParentSignalNames", () => {
    it("returns empty set for class without parent", () => {
        const cls = createNormalizedClass({ parent: null });
        const repo = createMockRepository();
        const result = collectParentSignalNames(cls, repo);
        expect(result.size).toBe(0);
    });

    it("collects signal names from parent class", () => {
        const parent = createNormalizedClass(
            {
                name: "Widget",
                parent: null,
                signals: [createNormalizedSignal({ name: "destroy" }), createNormalizedSignal({ name: "show" })],
            },
            NULL_REPO,
        );

        const child = createNormalizedClass(
            {
                name: "Button",
                parent: qualifiedName("Gtk", "Widget"),
            },
            singleClassRepo(parent),
        );

        const repo = createMockRepository();
        const result = collectParentSignalNames(child, repo);
        expect(result.has("destroy")).toBe(true);
        expect(result.has("show")).toBe(true);
    });
});

describe("collectParentMethodNames (1)", () => {
    it("returns empty set for class without parent", () => {
        const cls = createNormalizedClass({ parent: null });
        const repo = createMockRepository();
        const result = collectParentMethodNames(cls, repo);
        expect(result.size).toBe(0);
    });

    it("collects method names from parent class", () => {
        const parent = createNormalizedClass(
            {
                name: "Widget",
                parent: null,
                methods: [createNormalizedMethod({ name: "show" }), createNormalizedMethod({ name: "hide" })],
            },
            NULL_REPO,
        );

        const child = createNormalizedClass(
            {
                name: "Button",
                parent: qualifiedName("Gtk", "Widget"),
            },
            singleClassRepo(parent),
        );

        const repo = createMockRepository();
        const result = collectParentMethodNames(child, repo);
        expect(result.has("show")).toBe(true);
        expect(result.has("hide")).toBe(true);
    });
});

describe("collectParentMethodNames (2)", () => {
    it("collects method names from parent interfaces", () => {
        const iface = createNormalizedInterface({
            name: "Orientable",
            methods: [createNormalizedMethod({ name: "get_orientation" })],
        });

        const ns = createNormalizedNamespace({
            name: "Gtk",
            interfaces: new Map([["Orientable", iface]]),
        });

        const repo = createMockRepository(new Map([["Gtk", ns]]));

        const parentRepo = {
            resolveClass: () => null,
            resolveInterface: (qn: string) => repo.resolveInterface(qn),
            findClasses: () => [] as never[],
        };
        const parent = createNormalizedClass(
            {
                name: "Widget",
                parent: null,
                implements: [qualifiedName("Gtk", "Orientable")],
            },
            parentRepo,
        );

        const childRepo = {
            resolveClass: () => parent,
            resolveInterface: (qn: string) => repo.resolveInterface(qn),
            findClasses: () => [] as never[],
        };
        const child = createNormalizedClass(
            {
                name: "Box",
                parent: qualifiedName("Gtk", "Widget"),
            },
            childRepo,
        );

        const result = collectParentMethodNames(child, repo);
        expect(result.has("get_orientation")).toBe(true);
    });
});

describe("collectDirectMembers (1)", () => {
    it("returns direct properties only", () => {
        const parent = createNormalizedClass(
            {
                name: "Widget",
                parent: null,
                properties: [createNormalizedProperty({ name: "visible" })],
            },
            NULL_REPO,
        );

        const child = createNormalizedClass(
            {
                name: "Button",
                parent: qualifiedName("Gtk", "Widget"),
                properties: [
                    createNormalizedProperty({ name: "label" }),
                    createNormalizedProperty({ name: "icon-name" }),
                ],
            },
            singleClassRepo(parent),
        );

        const repo = createMockRepository();

        const result = collectDirectMembers({
            cls: child,
            repo,
            getClassMembers: (c) => c.properties,
            getInterfaceMembers: (i) => i.properties,
            getParentNames: collectParentPropertyNames,
        });

        expect(result).toHaveLength(2);
        expect(result.map((p) => p.name)).toContain("label");
        expect(result.map((p) => p.name)).toContain("icon-name");
        expect(result.map((p) => p.name)).not.toContain("visible");
    });
});

describe("collectDirectMembers (2)", () => {
    it("excludes hidden members", () => {
        const cls = createNormalizedClass({
            parent: null,
            properties: [
                createNormalizedProperty({ name: "visible" }),
                createNormalizedProperty({ name: "hidden-prop" }),
            ],
        });

        const repo = createMockRepository();

        const result = collectDirectMembers({
            cls,
            repo,
            getClassMembers: (c) => c.properties,
            getInterfaceMembers: (i) => i.properties,
            getParentNames: () => new Set<string>(),
            isHidden: (name) => name === "hiddenProp",
            transformName: (name) => {
                const parts = name.split("-");
                return (
                    parts[0] +
                    parts
                        .slice(1)
                        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
                        .join("")
                );
            },
        });

        expect(result).toHaveLength(1);
        expect(result[0]?.name).toBe("visible");
    });
});

describe("collectDirectMembers (3)", () => {
    it("includes members from directly implemented interfaces", () => {
        const iface = createNormalizedInterface({
            name: "Actionable",
            qualifiedName: qualifiedName("Gtk", "Actionable"),
            properties: [createNormalizedProperty({ name: "action-name" })],
        });

        const cls = createNormalizedClass({
            name: "Button",
            parent: null,
            implements: [qualifiedName("Gtk", "Actionable")],
            properties: [createNormalizedProperty({ name: "label" })],
        });

        const ns = createNormalizedNamespace({
            name: "Gtk",
            interfaces: new Map([["Actionable", iface]]),
        });

        const repo = createMockRepository(new Map([["Gtk", ns]]));

        const result = collectDirectMembers({
            cls,
            repo,
            getClassMembers: (c) => c.properties,
            getInterfaceMembers: (i) => i.properties,
            getParentNames: () => new Set<string>(),
        });

        expect(result).toHaveLength(2);
        expect(result.map((p) => p.name)).toContain("label");
        expect(result.map((p) => p.name)).toContain("action-name");
    });
});

describe("collectDirectMembers (4)", () => {
    it("excludes members from parent-implemented interfaces", () => {
        const iface = createNormalizedInterface({
            name: "Orientable",
            qualifiedName: qualifiedName("Gtk", "Orientable"),
            properties: [createNormalizedProperty({ name: "orientation" })],
        });

        const parentRepo = {
            resolveClass: () => null,
            resolveInterface: () => iface,
            findClasses: () => [] as never[],
        };
        const parent = createNormalizedClass(
            {
                name: "Widget",
                parent: null,
                implements: [qualifiedName("Gtk", "Orientable")],
            },
            parentRepo,
        );

        const childRepo = {
            resolveClass: () => parent,
            resolveInterface: () => iface,
            findClasses: () => [] as never[],
        };
        const child = createNormalizedClass(
            {
                name: "Box",
                parent: qualifiedName("Gtk", "Widget"),
                implements: [qualifiedName("Gtk", "Orientable")],
                properties: [createNormalizedProperty({ name: "spacing" })],
            },
            childRepo,
        );

        const ns = createNormalizedNamespace({
            name: "Gtk",
            classes: new Map([
                ["Widget", parent],
                ["Box", child],
            ]),
            interfaces: new Map([["Orientable", iface]]),
        });

        const repo = createMockRepository(new Map([["Gtk", ns]]));

        const result = collectDirectMembers({
            cls: child,
            repo,
            getClassMembers: (c) => c.properties,
            getInterfaceMembers: (i) => i.properties,
            getParentNames: collectParentPropertyNames,
        });

        expect(result).toHaveLength(1);
        expect(result[0]?.name).toBe("spacing");
    });
});
