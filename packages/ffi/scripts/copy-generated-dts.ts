#!/usr/bin/env node
/**
 * Copies every `src/generated/<ns>/<ns>.d.ts` source declaration file into
 * `dist/generated/<ns>/<ns>.d.ts`, overwriting the weak auto-generated
 * declaration tsc emits from the corresponding `<ns>.js` input.
 *
 * The codegen pipeline writes the authoritative type contract as a hand-
 * crafted `.d.ts` next to the generated `.js`, but tsc with `allowJs` only
 * understands the JS input and synthesises a permissive declaration from
 * its inferred shape. Copying the source `.d.ts` ensures consumer projects
 * see the contract rather than the inferred one.
 */

import { copyFile, mkdir, readdir, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = dirname(__dirname);
const generatedSrc = join(packageRoot, "src", "generated");
const generatedDist = join(packageRoot, "dist", "generated");

async function exists(path: string): Promise<boolean> {
    try {
        await stat(path);
        return true;
    } catch {
        return false;
    }
}

async function copyNamespaceDts(): Promise<void> {
    if (!(await exists(generatedSrc))) return;
    const namespaces = await readdir(generatedSrc);
    for (const ns of namespaces) {
        const srcFile = join(generatedSrc, ns, `${ns}.d.ts`);
        if (!(await exists(srcFile))) continue;
        const destDir = join(generatedDist, ns);
        await mkdir(destDir, { recursive: true });
        const destFile = join(destDir, `${ns}.d.ts`);
        await copyFile(srcFile, destFile);
    }
}

await copyNamespaceDts();
