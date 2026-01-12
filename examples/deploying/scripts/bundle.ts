import { join, resolve } from "node:path";
import * as esbuild from "esbuild";

const projectRoot = resolve(import.meta.dirname, "..");

const nativeShim = `
const { createRequire } = require("node:module");
const { dirname, join } = require("node:path");

const execDir = dirname(process.execPath);
const require2 = createRequire(join(execDir, "package.json"));
module.exports = require2("./index.node");
`;

async function bundle() {
    console.log("Bundling application...");

    await esbuild.build({
        entryPoints: [join(projectRoot, "src/index.tsx")],
        bundle: true,
        platform: "node",
        target: "node22",
        format: "cjs",
        outfile: join(projectRoot, "dist/bundle.cjs"),
        jsx: "automatic",
        minify: true,
        sourcemap: false,
        define: {
            "process.env.NODE_ENV": '"production"',
        },
        plugins: [
            {
                name: "native-shim",
                setup(build) {
                    build.onResolve({ filter: /^@gtkx\/native(-linux-(x64|arm64))?$/ }, (args) => {
                        return { path: args.path, namespace: "native-shim" };
                    });
                    build.onLoad({ filter: /.*/, namespace: "native-shim" }, () => {
                        return { contents: nativeShim, loader: "js" };
                    });
                },
            },
        ],
    });

    console.log("Bundle created: dist/bundle.cjs");
}

bundle().catch((err) => {
    console.error("Bundle failed:", err);
    process.exit(1);
});
