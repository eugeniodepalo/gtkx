import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { viteBuildMock } = vi.hoisted(() => ({ viteBuildMock: vi.fn(async () => undefined) }));

vi.mock("vite", () => ({ build: viteBuildMock }));

import { build } from "../src/builder.js";

describe("build", () => {
    beforeEach(() => {
        viteBuildMock.mockClear();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("invokes vite with the entry as the SSR target and bundle.js as the entry filename", async () => {
        await build({ entry: "src/index.tsx" });

        const config = viteBuildMock.mock.calls[0]![0];
        expect(config.build.ssr).toBe("src/index.tsx");
        expect(config.build.rollupOptions.output.entryFileNames).toBe("bundle.js");
        expect(config.build.outDir).toBe("dist");
        expect(config.build.minify).toBe(true);
        expect(config.build.cssMinify).toBe(false);
        expect(config.build.assetsInlineLimit).toBe(0);
        expect(config.build.ssrEmitAssets).toBe(true);
        expect(config.ssr.noExternal).toBe(true);
        expect(config.define["process.env.NODE_ENV"]).toBe(JSON.stringify("production"));
    });

    it("registers all four gtkx vite plugins in order", async () => {
        await build({ entry: "src/index.tsx" });

        const config = viteBuildMock.mock.calls[0]![0];
        const pluginNames = config.plugins.map((p: { name?: string } | null) => p?.name);
        expect(pluginNames).toEqual([
            "gtkx:gsettings",
            "gtkx:assets",
            "gtkx:built-url",
            "gtkx:native",
        ]);
    });

    it("appends gtkx plugins after user-supplied plugins", async () => {
        const userPlugin = { name: "user-plugin" };
        await build({ entry: "src/index.tsx", vite: { plugins: [userPlugin] } });

        const config = viteBuildMock.mock.calls[0]![0];
        const pluginNames = config.plugins.map((p: { name?: string } | null) => p?.name);
        expect(pluginNames[0]).toBe("user-plugin");
        expect(pluginNames.slice(1)).toEqual([
            "gtkx:gsettings",
            "gtkx:assets",
            "gtkx:built-url",
            "gtkx:native",
        ]);
    });

    it("respects a custom outDir from user vite config", async () => {
        await build({ entry: "src/index.tsx", vite: { build: { outDir: "build" } } });

        const config = viteBuildMock.mock.calls[0]![0];
        expect(config.build.outDir).toBe("build");
    });

    it("falls back to process.cwd() for the gtkx-native plugin when no vite root is given", async () => {
        const cwdSpy = vi.spyOn(process, "cwd").mockReturnValue("/fake/project");
        await build({ entry: "src/index.tsx" });
        cwdSpy.mockRestore();
    });
});
