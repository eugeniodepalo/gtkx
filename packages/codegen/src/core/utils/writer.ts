import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

/**
 * Wipes the target directory and writes every file from the given map into it.
 *
 * Intermediate directories are created automatically. The destination is
 * cleared first so removed namespaces from a previous run are not left behind.
 *
 * @param outputDir - Absolute target directory to wipe and populate
 * @param files - Map of paths (relative to `outputDir`) to file contents
 */
export const writeGeneratedDir = (outputDir: string, files: Map<string, string>): void => {
    if (existsSync(outputDir)) {
        rmSync(outputDir, { recursive: true, force: true });
    }
    mkdirSync(outputDir, { recursive: true });

    for (const [relativePath, content] of files) {
        const fullPath = join(outputDir, relativePath);
        const parent = dirname(fullPath);
        if (!existsSync(parent)) {
            mkdirSync(parent, { recursive: true });
        }
        writeFileSync(fullPath, content);
    }
};
