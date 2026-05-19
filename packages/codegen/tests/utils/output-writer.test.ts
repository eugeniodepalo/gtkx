import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { writeGeneratedDir } from "../../src/utils/output-writer.js";

describe("writeGeneratedDir", () => {
    let outputDir: string;

    beforeEach(() => {
        outputDir = mkdtempSync(join(tmpdir(), "gtkx-writer-test-"));
    });

    afterEach(() => {
        rmSync(outputDir, { recursive: true, force: true });
    });

    it("writes flat files into the output directory", () => {
        const files = new Map<string, string>([
            ["alpha.ts", "export const a = 1;"],
            ["beta.ts", "export const b = 2;"],
        ]);

        writeGeneratedDir(outputDir, files);

        expect(readFileSync(join(outputDir, "alpha.ts"), "utf8")).toBe("export const a = 1;");
        expect(readFileSync(join(outputDir, "beta.ts"), "utf8")).toBe("export const b = 2;");
    });

    it("creates nested subdirectories for namespaced paths", () => {
        const files = new Map<string, string>([
            ["gtk/widget.ts", "// widget"],
            ["gtk/box.ts", "// box"],
            ["adw/window.ts", "// window"],
        ]);

        writeGeneratedDir(outputDir, files);

        expect(readFileSync(join(outputDir, "gtk/widget.ts"), "utf8")).toBe("// widget");
        expect(readFileSync(join(outputDir, "gtk/box.ts"), "utf8")).toBe("// box");
        expect(readFileSync(join(outputDir, "adw/window.ts"), "utf8")).toBe("// window");
    });

    it("wipes prior contents so removed namespaces do not persist", () => {
        const stalePath = join(outputDir, "stale", "old.ts");
        writeFileSync(join(outputDir, "leftover.ts"), "stale");
        rmSync(stalePath, { force: true });

        const files = new Map<string, string>([["fresh.ts", "fresh"]]);
        writeGeneratedDir(outputDir, files);

        expect(existsSync(join(outputDir, "leftover.ts"))).toBe(false);
        expect(readFileSync(join(outputDir, "fresh.ts"), "utf8")).toBe("fresh");
    });

    it("creates the output directory when it does not yet exist", () => {
        const target = join(outputDir, "nested", "out");
        const files = new Map<string, string>([["index.ts", "// index"]]);

        writeGeneratedDir(target, files);

        expect(readFileSync(join(target, "index.ts"), "utf8")).toBe("// index");
    });

    it("accepts an empty file map and produces an empty directory", () => {
        writeGeneratedDir(outputDir, new Map());
        expect(existsSync(outputDir)).toBe(true);
    });

    it("releases its lock file after a successful write", () => {
        const target = join(outputDir, "release");
        writeGeneratedDir(target, new Map([["a.ts", "1"]]));
        expect(existsSync(`${target}.lock`)).toBe(false);
    });

    it("reclaims a stale lock left behind by a dead process", () => {
        const target = join(outputDir, "stale");
        const lockPath = `${target}.lock`;
        const deadPid = findUnusedPid();
        writeFileSync(lockPath, String(deadPid));

        writeGeneratedDir(target, new Map([["a.ts", "1"]]));

        expect(readFileSync(join(target, "a.ts"), "utf8")).toBe("1");
        expect(existsSync(lockPath)).toBe(false);
    });

    it("skips the rewrite when called again with the same file map", () => {
        const target = join(outputDir, "stable");
        writeGeneratedDir(target, new Map([["a.ts", "1"]]));
        const sentinel = join(target, "sentinel");
        writeFileSync(sentinel, "external");

        writeGeneratedDir(target, new Map([["a.ts", "1"]]));

        expect(readFileSync(sentinel, "utf8")).toBe("external");
    });

    it("rewrites when the file map changes", () => {
        const target = join(outputDir, "changing");
        writeGeneratedDir(target, new Map([["a.ts", "1"]]));
        const sentinel = join(target, "sentinel");
        writeFileSync(sentinel, "external");

        writeGeneratedDir(target, new Map([["a.ts", "2"]]));

        expect(existsSync(sentinel)).toBe(false);
        expect(readFileSync(join(target, "a.ts"), "utf8")).toBe("2");
    });

    it("rewrites when the output directory was removed externally", () => {
        const target = join(outputDir, "rebuild");
        writeGeneratedDir(target, new Map([["a.ts", "1"]]));
        rmSync(target, { recursive: true, force: true });

        writeGeneratedDir(target, new Map([["a.ts", "1"]]));

        expect(readFileSync(join(target, "a.ts"), "utf8")).toBe("1");
    });
});

const findUnusedPid = (): number => {
    for (let pid = 0x70000000; pid < 0x70010000; pid++) {
        try {
            process.kill(pid, 0);
        } catch (err) {
            if ((err as NodeJS.ErrnoException).code === "ESRCH") return pid;
        }
    }
    throw new Error("Could not locate an unused PID");
};
