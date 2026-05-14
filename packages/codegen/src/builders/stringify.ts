import type { Builder } from "./types.js";
import { Writer } from "./writer.js";

/**
 * Render a {@link Builder} to its complete source string.
 *
 * Defaults to TypeScript emission. Pass `"js"` for runtime-only JavaScript
 * output (no type annotations, interfaces, or type aliases).
 */
export function stringify(builder: Builder, mode: "ts" | "js" = "ts"): string {
    const writer = new Writer().setMode(mode);
    builder.write(writer);
    return writer.toString();
}
