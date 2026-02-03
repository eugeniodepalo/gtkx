import { createRequire } from "node:module";
import { join } from "node:path";
import { type InlineConfig, build as viteBuild } from "vite";
import { gtkxAssets } from "./vite-plugin-gtkx-assets.js";

const NATIVE_PACKAGE_RE = /^@gtkx\/native(-linux-(x64|arm64))?$/;

/**
 * Options for building a GTKX application for production.
 */
export type BuildOptions = {
    /** Path to the entry file (e.g., "src/index.tsx") */
    entry: string;
    /** Additional Vite configuration */
    vite?: InlineConfig;
};

/**
 * Builds a GTKX application for production using Vite's SSR build mode.
 *
 * Produces a single minified ESM bundle at `dist/bundle.js` with all
 * dependencies bundled except the native module (`@gtkx/native`).
 *
 * The native module is externalized and its import path is resolved to
 * an absolute path at build time. This ensures the bundle works under
 * strict package managers (pnpm) where transitive dependencies are not
 * directly resolvable from the bundle location.
 *
 * @param options - Build configuration including entry point and Vite options
 *
 * @example
 * ```ts
 * import { build } from "@gtkx/cli";
 *
 * await build({
 *     entry: "./src/index.tsx",
 *     vite: { root: process.cwd() },
 * });
 * ```
 *
 * @see {@link BuildOptions} for configuration options
 */
export const build = async (options: BuildOptions): Promise<void> => {
    const { entry, vite: viteConfig } = options;
    const root = viteConfig?.root ?? process.cwd();
    const projectRequire = createRequire(join(root, "package.json"));

    await viteBuild({
        ...viteConfig,
        plugins: [...(viteConfig?.plugins ?? []), gtkxAssets()],
        build: {
            ...viteConfig?.build,
            ssr: entry,
            ssrEmitAssets: true,
            assetsInlineLimit: 0,
            outDir: viteConfig?.build?.outDir ?? "dist",
            minify: true,
            rollupOptions: {
                ...viteConfig?.build?.rollupOptions,
                output: {
                    ...((viteConfig?.build?.rollupOptions?.output ?? {}) as Record<string, unknown>),
                    entryFileNames: "bundle.js",
                    paths: (id) => {
                        if (NATIVE_PACKAGE_RE.test(id)) {
                            try {
                                return projectRequire.resolve(id);
                            } catch {
                                return id;
                            }
                        }
                        return id;
                    },
                },
            },
        },
        define: {
            ...viteConfig?.define,
            "process.env.NODE_ENV": JSON.stringify("production"),
        },
        ssr: {
            ...viteConfig?.ssr,
            noExternal: true,
            external: ["@gtkx/native", "@gtkx/native-linux-x64", "@gtkx/native-linux-arm64"],
        },
        experimental: {
            ...viteConfig?.experimental,
            renderBuiltUrl(filename, { type }) {
                if (type === "asset") {
                    return {
                        runtime: `new URL(${JSON.stringify(`./${filename}`)}, import.meta.url).pathname`,
                    };
                }
            },
        },
    });
};
