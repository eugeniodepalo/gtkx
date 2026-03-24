/**
 * Biome-based code formatter for generated files.
 *
 * Formats TypeScript source strings using the project's Biome configuration.
 * Initializes the Biome instance lazily on first use and reuses it across calls.
 */

import type { GeneratedFile } from "./generated-file-set.js";
import { getBiome } from "./utils/format.js";

/**
 * Formats a single TypeScript source string using Biome.
 *
 * @param content - Raw TypeScript source
 * @param filePath - Virtual file path for Biome (affects formatting rules)
 * @returns Formatted source string
 */
export async function formatCode(content: string, filePath: string): Promise<string> {
    const { biome, projectKey } = await getBiome();
    try {
        const result = biome.formatContent(projectKey, content, { filePath });
        return result.content;
    } catch {
        return content;
    }
}

/**
 * Formats all generated files and returns a map of path to formatted content.
 *
 * @param files - Generated files to format
 * @returns Map from file path to formatted content
 */
export async function formatFiles(files: readonly GeneratedFile[]): Promise<Map<string, string>> {
    const result = new Map<string, string>();
    for (const file of files) {
        const formatted = await formatCode(file.content, file.path);
        result.set(file.path, formatted);
    }
    return result;
}
