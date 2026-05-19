#!/usr/bin/env node
/**
 * Copies the repository-root `README.md` into every published workspace
 * package so it ships alongside the package on npm.
 *
 * This is the single source of truth for the rule "every published package
 * ships the root README". A package counts as published when its
 * `package.json` does not set `private: true`; private packages are skipped.
 * The per-package `README.md` files are gitignored build artifacts, so this
 * script must run before `pnpm -r publish` to materialise them.
 */

import { copyFile, readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(scriptDir);
const packagesDir = join(repoRoot, "packages");
const readmeSource = join(repoRoot, "README.md");

/**
 * Resolves the absolute paths of every published package directory under
 * `packages/`, excluding any package whose manifest sets `private: true`.
 *
 * @returns The absolute directory paths of all published packages.
 */
async function findPublishedPackageDirs(): Promise<string[]> {
    const entries = await readdir(packagesDir, { withFileTypes: true });
    const published: string[] = [];

    for (const entry of entries) {
        if (!entry.isDirectory()) {
            continue;
        }

        const packageDir = join(packagesDir, entry.name);
        const manifest = JSON.parse(await readFile(join(packageDir, "package.json"), "utf8")) as {
            private?: boolean;
        };

        if (manifest.private !== true) {
            published.push(packageDir);
        }
    }

    return published;
}

/**
 * Copies the root `README.md` into every published package directory.
 *
 * @returns A promise that resolves once all copies complete.
 */
async function copyReadme(): Promise<void> {
    const publishedDirs = await findPublishedPackageDirs();

    await Promise.all(publishedDirs.map((packageDir) => copyFile(readmeSource, join(packageDir, "README.md"))));
}

await copyReadme();
