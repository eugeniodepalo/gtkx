import { describe, expect, it, vi } from "vitest";

type BuildStartHook = (this: {
    emitFile: (asset: { type: string; fileName: string; source: Buffer }) => void;
}) => void;
type TransformHook = (code: string, id: string) => string | null | undefined;
type ResolveIdHook = (id: string) => { id: string; external: boolean } | null;

describe("gtkxNative", () => {
    it("returns a plugin with the expected name and pre-enforce", async () => {
        const { gtkxNative } = await import("../../src/vite-plugins/native.js");
        const plugin = gtkxNative("/tmp");
        expect(plugin.name).toBe("gtkx:native");
        expect(plugin.enforce).toBe("pre");
    });

    it("transform returns null for ids other than the native binding", async () => {
        const { gtkxNative } = await import("../../src/vite-plugins/native.js");
        const plugin = gtkxNative("/tmp");
        const result = (plugin.transform as TransformHook)("export const x = 1;", "/some/other/file.js");
        expect(result).toBeNull();
    });

    it("resolveId marks the emitted binary as external", async () => {
        const { gtkxNative } = await import("../../src/vite-plugins/native.js");
        const plugin = gtkxNative("/tmp");
        expect((plugin.resolveId as ResolveIdHook)("./gtkx.node")).toEqual({
            id: "./gtkx.node",
            external: true,
        });
        expect((plugin.resolveId as ResolveIdHook)("./other.js")).toBeNull();
    });

    it("buildStart throws on unsupported platform", async () => {
        vi.resetModules();
        vi.doMock("node:os", () => ({
            platform: () => "darwin",
            arch: () => "x64",
        }));
        const { gtkxNative } = await import("../../src/vite-plugins/native.js");
        const plugin = gtkxNative("/tmp");

        expect(() =>
            (plugin.buildStart as BuildStartHook).call({
                emitFile: () => undefined,
            }),
        ).toThrow(/Unsupported build platform/);

        vi.doUnmock("node:os");
        vi.resetModules();
    });

    it("buildStart throws on unsupported architecture", async () => {
        vi.resetModules();
        vi.doMock("node:os", () => ({
            platform: () => "linux",
            arch: () => "ia32",
        }));
        const { gtkxNative } = await import("../../src/vite-plugins/native.js");
        const plugin = gtkxNative("/tmp");

        expect(() =>
            (plugin.buildStart as BuildStartHook).call({
                emitFile: () => undefined,
            }),
        ).toThrow(/Unsupported build architecture/);

        vi.doUnmock("node:os");
        vi.resetModules();
    });

    it("buildStart emits the platform binary and transform rewrites the binding", async () => {
        vi.resetModules();
        vi.doMock("node:os", () => ({
            platform: () => "linux",
            arch: () => "x64",
        }));
        vi.doMock("node:module", () => ({
            createRequire: () => {
                const fn = (id: string) => id;
                fn.resolve = (id: string) => `/fake/path/${id}.node`;
                return fn;
            },
        }));
        vi.doMock("node:fs", async () => {
            const real = await vi.importActual<typeof import("node:fs")>("node:fs");
            return { ...real, readFileSync: () => Buffer.from("native-bytes") };
        });

        const { gtkxNative } = await import("../../src/vite-plugins/native.js");
        const plugin = gtkxNative("/tmp");

        const emitFile = vi.fn();
        (plugin.buildStart as BuildStartHook).call({ emitFile });
        expect(emitFile).toHaveBeenCalledWith({
            type: "asset",
            fileName: "gtkx.node",
            source: Buffer.from("native-bytes"),
        });

        const transformed = (plugin.transform as TransformHook)(
            "function requireNative() {}",
            "/fake/native-binding.cjs",
        );
        expect(transformed).toBe('module.exports = require("./gtkx.node");');

        vi.doUnmock("node:os");
        vi.doUnmock("node:module");
        vi.doUnmock("node:fs");
        vi.resetModules();
    });
});
