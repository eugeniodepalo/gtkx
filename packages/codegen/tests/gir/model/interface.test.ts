import { describe, expect, it } from "vitest";
import { GirMethod } from "../../../src/gir/model/callables.js";
import { GirInterface } from "../../../src/gir/model/interface.js";
import { GirProperty } from "../../../src/gir/model/property.js";
import type { RepositoryLike } from "../../../src/gir/model/repository-like.js";
import { GirSignal } from "../../../src/gir/model/signal.js";
import { GirType } from "../../../src/gir/model/type.js";

function makeType(name = "none"): GirType {
    return new GirType({ name, isArray: false, elementType: null, nullable: false });
}

type InterfaceData = ConstructorParameters<typeof GirInterface>[0];

function makeInterface(repo: RepositoryLike, overrides: Partial<InterfaceData> = {}): GirInterface {
    const data: InterfaceData = {
        name: "Buildable",
        qualifiedName: "Gtk.Buildable",
        cType: "GtkBuildable",
        prerequisites: [],
        methods: [],
        staticFunctions: [],
        properties: [],
        signals: [],
        fieldNames: [],
        virtualMethodNames: [],
        ...overrides,
    };
    return new GirInterface(data, repo);
}

function createRepo(): { repo: RepositoryLike; addInterface: (iface: GirInterface) => void } {
    const interfaces = new Map<string, GirInterface>();
    const repo: RepositoryLike = {
        resolveClass: () => null,
        resolveInterface: (name) => interfaces.get(name) ?? null,
        findClasses: () => [],
    };
    return { repo, addInterface: (iface) => interfaces.set(iface.qualifiedName, iface) };
}

describe("GirInterface", () => {
    describe("hasPrerequisite", () => {
        it("returns true for a directly-listed prerequisite", () => {
            const { repo } = createRepo();
            const buildable = makeInterface(repo, { prerequisites: ["GObject.Object"] });
            expect(buildable.hasPrerequisite("GObject.Object")).toBe(true);
        });

        it("walks through transitive prerequisites", () => {
            const ctx = createRepo();
            const inner = makeInterface(ctx.repo, {
                qualifiedName: "Gtk.Inner",
                prerequisites: ["GObject.Object"],
            });
            ctx.addInterface(inner);
            const outer = makeInterface(ctx.repo, {
                qualifiedName: "Gtk.Outer",
                prerequisites: ["Gtk.Inner"],
            });
            expect(outer.hasPrerequisite("GObject.Object")).toBe(true);
        });

        it("returns false when no chain reaches the target prerequisite", () => {
            const ctx = createRepo();
            const other = makeInterface(ctx.repo, {
                qualifiedName: "Gtk.Other",
                prerequisites: ["Gtk.Something"],
            });
            ctx.addInterface(other);
            const buildable = makeInterface(ctx.repo, { prerequisites: ["Gtk.Other"] });
            expect(buildable.hasPrerequisite("GObject.Missing")).toBe(false);
        });
    });

    describe("getAllPrerequisites", () => {
        it("returns own prerequisites when none have transitive deps", () => {
            const { repo } = createRepo();
            const buildable = makeInterface(repo, { prerequisites: ["GObject.Object"] });
            expect(buildable.getAllPrerequisites()).toEqual(["GObject.Object"]);
        });

        it("flattens transitive prerequisites and dedupes", () => {
            const ctx = createRepo();
            const base = makeInterface(ctx.repo, {
                qualifiedName: "Gtk.Base",
                prerequisites: ["GObject.Object"],
            });
            ctx.addInterface(base);
            const middle = makeInterface(ctx.repo, {
                qualifiedName: "Gtk.Middle",
                prerequisites: ["Gtk.Base", "GObject.Object"],
            });
            ctx.addInterface(middle);
            const outer = makeInterface(ctx.repo, {
                qualifiedName: "Gtk.Outer",
                prerequisites: ["Gtk.Middle", "Gtk.Base"],
            });
            expect(new Set(outer.getAllPrerequisites())).toEqual(new Set(["Gtk.Middle", "Gtk.Base", "GObject.Object"]));
        });
    });

    describe("lookup helpers", () => {
        const { repo } = createRepo();
        const method = new GirMethod({
            name: "get_id",
            cIdentifier: "gtk_buildable_get_id",
            returnType: makeType("utf8"),
            parameters: [],
            throws: false,
        });
        const property = new GirProperty({
            name: "id",
            type: makeType("utf8"),
            writable: true,
            readable: true,
            constructOnly: false,
            defaultValue: null,
        });
        const signal = new GirSignal({
            name: "changed",
            when: "last",
            returnType: makeType(),
            parameters: [],
        });
        const buildable = makeInterface(repo, {
            methods: [method],
            properties: [property],
            signals: [signal],
        });

        it("getMethod returns the matching method or null", () => {
            expect(buildable.getMethod("get_id")).toBe(method);
            expect(buildable.getMethod("missing")).toBeNull();
        });

        it("getProperty returns the matching property or null", () => {
            expect(buildable.getProperty("id")).toBe(property);
            expect(buildable.getProperty("missing")).toBeNull();
        });

        it("getSignal returns the matching signal or null", () => {
            expect(buildable.getSignal("changed")).toBe(signal);
            expect(buildable.getSignal("missing")).toBeNull();
        });
    });
});
