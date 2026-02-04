import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { arch, platform } from "node:os";
import { join } from "node:path";
import type { Plugin } from "vite";

const LOAD_NATIVE_BINDING_RE = /function loadNativeBinding\(\) \{[\s\S]*?\n\}/;
const NODE_OS_IMPORT_RE = /import\s*\{[^}]*\}\s*from\s*["']node:os["'];?\n?/;

/**
 * Vite plugin that embeds the native `.node` binary into the build output.
 *
 * During production builds, resolves the platform-specific `.node` binary,
 * copies it into the output directory as `gtkx.node`, and transforms the
 * `loadNativeBinding` function in `@gtkx/native` to load `./gtkx.node`
 * directly. This makes the bundle self-contained with no `node_modules`
 * dependency at runtime.
 *
 * @param root - Project root directory used to resolve native packages
 */
export function gtkxNative(root: string): Plugin {
    const projectRequire = createRequire(join(root, "package.json"));
    let nativeIndexPath: string;

    return {
        name: "gtkx:native",
        enforce: "pre",

        buildStart() {
            const currentPlatform = platform();
            const currentArch = arch();
            const packageName = `@gtkx/native-linux-${currentArch}`;

            if (currentPlatform !== "linux") {
                throw new Error(`Unsupported build platform: ${currentPlatform}. Only Linux is supported.`);
            }

            if (currentArch !== "x64" && currentArch !== "arm64") {
                throw new Error(`Unsupported build architecture: ${currentArch}. Only x64 and arm64 are supported.`);
            }

            nativeIndexPath = projectRequire.resolve("@gtkx/native");

            const nodePath = projectRequire.resolve(`${packageName}/index.node`);
            const source = readFileSync(nodePath);

            this.emitFile({
                type: "asset",
                fileName: "gtkx.node",
                source,
            });
        },

        transform(code, id) {
            if (id !== nativeIndexPath) {
                return;
            }

            return code
                .replace(NODE_OS_IMPORT_RE, "")
                .replace(LOAD_NATIVE_BINDING_RE, 'function loadNativeBinding() { return require("./gtkx.node"); }');
        },
    };
}
