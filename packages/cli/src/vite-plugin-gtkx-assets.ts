import type { Plugin } from "vite";

const ASSET_RE = /\.(png|jpe?g|gif|svg|webp|webm|mp4|ogg|mp3|wav|flac|aac|woff2?|eot|ttf|otf|ico|avif|data)$/i;

/**
 * Vite plugin that resolves static asset imports to filesystem paths.
 *
 * In dev mode, asset imports resolve to the absolute source file path.
 * In build mode, Vite's built-in asset pipeline handles emission and
 * hashing; the `renderBuiltUrl` config in the builder converts the
 * URL to a filesystem path via `import.meta.url`.
 */
export function gtkxAssets(): Plugin {
    let isBuild = false;

    return {
        name: "gtkx:assets",
        enforce: "pre",

        config() {
            return {
                assetsInclude: [ASSET_RE],
            };
        },

        configResolved(config) {
            isBuild = config.command === "build";
        },

        load(id) {
            if (isBuild || !ASSET_RE.test(id)) {
                return;
            }

            return `export default ${JSON.stringify(id)};`;
        },
    };
}
