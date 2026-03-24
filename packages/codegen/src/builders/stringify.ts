import type { Builder } from "./types.js";
import { Writer } from "./writer.js";

/** Render a {@link Builder} to its complete TypeScript source string. */
export function stringify(builder: Builder): string {
    const writer = new Writer();
    builder.write(writer);
    return writer.toString();
}
