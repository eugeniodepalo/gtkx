/**
 * Represents a single generated file with its relative path and content.
 */
export type GeneratedFile = {
    /** Relative path within the output group (e.g., `"gtk/button.ts"`). */
    path: string;
    /** Raw TypeScript source content (unformatted). */
    content: string;
};
