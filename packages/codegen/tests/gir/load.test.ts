import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadGir } from "../../src/gir/load.js";

const minimalGir = (name: string, version: string, deps: Array<{ name: string; version: string }> = []) => {
    const includes = deps.map((dep) => `    <include name="${dep.name}" version="${dep.version}"/>`).join("\n");
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

describe("loadGir", () => {
    let dir: string;

    beforeEach(() => {
        dir = mkdtempSync(join(tmpdir(), "gtkx-load-gir-test-"));
    });

    afterEach(() => {
        rmSync(dir, { recursive: true, force: true });
    });

    it("throws a config-pointing error when a requested library is not found", async () => {
        await expect(loadGir(["Nonexistent-1.0"], [dir])).rejects.toThrow(
            /Library "Nonexistent-1.0" was requested for code generation/,
        );
    });

    it("throws when a transitive dependency is not found", async () => {
        writeFileSync(join(dir, "Foo-1.0.gir"), minimalGir("Foo", "1.0", [{ name: "Bar", version: "2.0" }]));
        writeFileSync(join(dir, "GObject-2.0.gir"), minimalGir("GObject", "2.0"));

        await expect(loadGir(["Foo-1.0"], [dir])).rejects.toThrow(/GIR file not found for "Bar-2.0"/);
    });

    it("resolves a library and its transitive dependencies into a repository", async () => {
        writeFileSync(join(dir, "Foo-1.0.gir"), minimalGir("Foo", "1.0"));
        writeFileSync(join(dir, "GObject-2.0.gir"), minimalGir("GObject", "2.0"));

        const loaded = await loadGir(["Foo-1.0"], [dir]);

        expect(loaded.repository.getNamespaceNames()).toContain("Foo");
        expect(loaded.girModules.length).toBeGreaterThan(0);
    });
});
