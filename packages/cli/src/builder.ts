import { build as viteBuild, type InlineConfig } from "vite";

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

    await viteBuild({
        ...viteConfig,
        build: {
            ...viteConfig?.build,
            ssr: entry,
            outDir: viteConfig?.build?.outDir ?? "dist",
            minify: true,
            rollupOptions: {
                ...viteConfig?.build?.rollupOptions,
                output: {
                    ...((viteConfig?.build?.rollupOptions?.output ?? {}) as Record<string, unknown>),
                    entryFileNames: "bundle.js",
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
    });
};
