import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GirLoader } from "../../src/internal/loader.js";

const minimalGir = (name: string, version: string, deps: Array<{ name: string; version: string }> = []) => {
    const includes = deps.map((d) => `    <include name="${d.name}" version="${d.version}"/>`).join("\n");
    return `<?xml version="1.0"?>
<repository version="1.2" xmlns="http://www.gtk.org/introspection/core/1.0"
    xmlns:c="http://www.gtk.org/introspection/c/1.0"
    xmlns:glib="http://www.gtk.org/introspection/glib/1.0">
${includes}
    <namespace name="${name}" version="${version}" shared-library="lib${name.toLowerCase()}.so"
        c:identifier-prefixes="${name}" c:symbol-prefixes="${name.toLowerCase()}">
    </namespace>
</repository>`;
};

describe("GirLoader", () => {
    let dir: string;

    beforeEach(() => {
        dir = mkdtempSync(join(tmpdir(), "gir-loader-test-"));
    });

    afterEach(() => {
        rmSync(dir, { recursive: true, force: true });
    });

    describe("findGirFile", () => {
        it("throws a helpful error when the GIR file is not found in any search path", async () => {
            const loader = new GirLoader([dir]);
            await expect(loader.discoverDependencies(["Nonexistent-1.0"])).rejects.toThrow(
                /GIR file not found for "Nonexistent-1.0"/,
            );
        });

        it("includes all configured search paths in the not-found error message", async () => {
            const loader = new GirLoader(["/path/a", "/path/b"]);
            await expect(loader.discoverDependencies(["Missing-1.0"])).rejects.toThrow(/\/path\/a, \/path\/b/);
        });
    });

    describe("discoverDependencies", () => {
        it("returns an empty graph for an empty roots list", async () => {
            const loader = new GirLoader([dir]);
            const graph = await loader.discoverDependencies([]);
            expect(graph.size).toBe(0);
        });

        it("loads a single root with no dependencies", async () => {
            writeFileSync(join(dir, "Foo-1.0.gir"), minimalGir("Foo", "1.0"));
            const loader = new GirLoader([dir]);

            const graph = await loader.discoverDependencies(["Foo-1.0"]);

            expect(graph.size).toBe(1);
            expect(graph.get("Foo-1.0")?.dependencies).toEqual([]);
        });

        it("walks the dependency graph transitively via include tags", async () => {
            writeFileSync(join(dir, "Gtk-4.0.gir"), minimalGir("Gtk", "4.0", [{ name: "Gio", version: "2.0" }]));
            writeFileSync(join(dir, "Gio-2.0.gir"), minimalGir("Gio", "2.0", [{ name: "GObject", version: "2.0" }]));
            writeFileSync(join(dir, "GObject-2.0.gir"), minimalGir("GObject", "2.0"));
            const loader = new GirLoader([dir]);

            const graph = await loader.discoverDependencies(["Gtk-4.0"]);

            expect(new Set(graph.keys())).toEqual(new Set(["Gio-2.0", "GObject-2.0", "Gtk-4.0"]));
            expect(graph.get("Gtk-4.0")?.dependencies).toEqual(["Gio-2.0"]);
            expect(graph.get("Gio-2.0")?.dependencies).toEqual(["GObject-2.0"]);
        });

        it("only enqueues each dependency once when multiple roots share a dependency", async () => {
            writeFileSync(join(dir, "Gtk-4.0.gir"), minimalGir("Gtk", "4.0", [{ name: "GObject", version: "2.0" }]));
            writeFileSync(join(dir, "Adw-1.gir"), minimalGir("Adw", "1", [{ name: "GObject", version: "2.0" }]));
            writeFileSync(join(dir, "GObject-2.0.gir"), minimalGir("GObject", "2.0"));
            const loader = new GirLoader([dir]);

            const graph = await loader.discoverDependencies(["Gtk-4.0", "Adw-1"]);

            expect(graph.size).toBe(3);
            expect(graph.get("GObject-2.0")?.filePath).toBe(join(dir, "GObject-2.0.gir"));
        });

        it("searches multiple GIR paths in order, returning the first match", async () => {
            const dirA = mkdtempSync(join(tmpdir(), "gir-a-"));
            const dirB = mkdtempSync(join(tmpdir(), "gir-b-"));
            try {
                writeFileSync(join(dirB, "Foo-1.0.gir"), minimalGir("Foo", "1.0"));
                const loader = new GirLoader([dirA, dirB]);

                const graph = await loader.discoverDependencies(["Foo-1.0"]);

                expect(graph.get("Foo-1.0")?.filePath).toBe(join(dirB, "Foo-1.0.gir"));
            } finally {
                rmSync(dirA, { recursive: true, force: true });
                rmSync(dirB, { recursive: true, force: true });
            }
        });
    });

    describe("loadAll", () => {
        it("returns parsed namespaces in topological order", async () => {
            writeFileSync(join(dir, "Gtk-4.0.gir"), minimalGir("Gtk", "4.0", [{ name: "Gio", version: "2.0" }]));
            writeFileSync(join(dir, "Gio-2.0.gir"), minimalGir("Gio", "2.0", [{ name: "GObject", version: "2.0" }]));
            writeFileSync(join(dir, "GObject-2.0.gir"), minimalGir("GObject", "2.0"));
            const loader = new GirLoader([dir]);

            const result = await loader.loadAll(["Gtk-4.0"]);

            const order = [...result.keys()];
            expect(order.indexOf("GObject")).toBeLessThan(order.indexOf("Gio"));
            expect(order.indexOf("Gio")).toBeLessThan(order.indexOf("Gtk"));
        });

        it("attaches both the parsed namespace and the original XML to each entry", async () => {
            writeFileSync(join(dir, "Foo-1.0.gir"), minimalGir("Foo", "1.0"));
            const loader = new GirLoader([dir]);

            const result = await loader.loadAll(["Foo-1.0"]);

            const entry = result.get("Foo");
            expect(entry?.raw.name).toBe("Foo");
            expect(entry?.xml).toContain("<namespace");
        });

        it("throws when the dependency graph contains a cycle", async () => {
            writeFileSync(join(dir, "A-1.gir"), minimalGir("A", "1", [{ name: "B", version: "1" }]));
            writeFileSync(join(dir, "B-1.gir"), minimalGir("B", "1", [{ name: "A", version: "1" }]));
            const loader = new GirLoader([dir]);

            await expect(loader.loadAll(["A-1"])).rejects.toThrow(/Circular GIR dependency/);
        });
    });
});
