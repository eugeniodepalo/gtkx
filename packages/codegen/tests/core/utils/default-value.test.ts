import { describe, expect, it } from "vitest";
import { collectPropertiesWithDefaults } from "../../../src/core/utils/default-value.js";
import type { DefaultValue, GirClass, GirProperty, GirRepository } from "../../../src/gir/index.js";

type FakeNamespace = {
    name: string;
    enumerations: Map<string, { name: string; members: Array<{ name: string; cIdentifier: string }> }>;
    bitfields: Map<string, { name: string; members: Array<{ name: string; cIdentifier: string }> }>;
};

function makeRepo(namespaces: FakeNamespace[]): GirRepository {
    const map = new Map<string, FakeNamespace>(namespaces.map((ns) => [ns.name, ns]));
    return {
        getAllNamespaces: () => map,
        resolveInterface: () => null,
    } as unknown as GirRepository;
}

function makeProperty(name: string, defaultValue: DefaultValue | null): GirProperty {
    return { name, defaultValue } as unknown as GirProperty;
}

function makeClass(properties: GirProperty[], implemented: string[] = []): GirClass {
    return {
        getAllProperties: () => properties,
        getAllImplementedInterfaces: () => implemented,
    } as unknown as GirClass;
}

describe("collectPropertiesWithDefaults", () => {
    const emptyRepo = makeRepo([]);

    it("returns an empty map when the class has no properties with defaults", () => {
        const cls = makeClass([makeProperty("name", null)]);
        expect(collectPropertiesWithDefaults(cls, emptyRepo).size).toBe(0);
    });

    it("includes only properties that carry a default value", () => {
        const withDefault = makeProperty("orientation", { kind: "enum", cIdentifier: "GTK_ORIENTATION_HORIZONTAL" });
        const withoutDefault = makeProperty("name", null);
        const cls = makeClass([withDefault, withoutDefault]);

        const result = collectPropertiesWithDefaults(cls, emptyRepo);

        expect(result.size).toBe(1);
        expect(result.get("orientation")).toBe(withDefault);
    });

    it("merges defaults from implemented interfaces without overwriting class defaults", () => {
        const classProp = makeProperty("orientation", { kind: "boolean", value: true });
        const ifaceProp = makeProperty("orientation", { kind: "boolean", value: false });
        const interfaceOnlyProp = makeProperty("hexpand", { kind: "boolean", value: true });
        const cls = makeClass([classProp], ["Gtk.Orientable"]);

        const repo = {
            getAllNamespaces: () => new Map(),
            resolveInterface: (qn: string) =>
                qn === "Gtk.Orientable" ? ({ properties: [ifaceProp, interfaceOnlyProp] } as unknown) : null,
        } as unknown as GirRepository;

        const result = collectPropertiesWithDefaults(cls, repo);

        expect(result.get("orientation")).toBe(classProp);
        expect(result.get("hexpand")).toBe(interfaceOnlyProp);
    });

    it("ignores interface properties that lack a default value", () => {
        const ifaceProp = makeProperty("hexpand", null);
        const cls = makeClass([], ["Gtk.Orientable"]);

        const repo = {
            getAllNamespaces: () => new Map(),
            resolveInterface: () => ({ properties: [ifaceProp] }) as unknown,
        } as unknown as GirRepository;

        expect(collectPropertiesWithDefaults(cls, repo).size).toBe(0);
    });

    it("skips interfaces that the repository cannot resolve", () => {
        const cls = makeClass([], ["Missing.Interface"]);
        const repo = {
            getAllNamespaces: () => new Map(),
            resolveInterface: () => null,
        } as unknown as GirRepository;

        expect(collectPropertiesWithDefaults(cls, repo).size).toBe(0);
    });
});
