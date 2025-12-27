import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");

async function bundle() {
    console.log("Bundling application...");

    await esbuild.build({
        entryPoints: [join(projectRoot, "src/index.tsx")],
        bundle: true,
        platform: "node",
        target: "node22",
        format: "cjs",
        outfile: join(projectRoot, "dist/bundle.cjs"),
        external: ["@gtkx/native"],
        jsx: "automatic",
        minify: true,
        sourcemap: false,
        define: {
            "process.env.NODE_ENV": '"production"',
        },
    });

    console.log("Bundle created: dist/bundle.cjs");
}

bundle().catch((err) => {
    console.error("Bundle failed:", err);
    process.exit(1);
});
