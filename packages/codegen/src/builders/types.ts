import type { Writer } from "./text-writer.js";

/**
 * Core interface for all code generation builders. Implementors emit
 * their TypeScript representation into the provided {@link Writer}.
 */
export interface Builder {
    /** Serialize this builder's output into the given writer. */
    write(writer: Writer): void;
}

/** A value that can be written to a {@link Writer} -- either a raw string or a {@link Builder}. */
export type Writable = string | Builder;

/** Write a {@link Writable} value to the given writer, dispatching between string and builder. */
export function writeWritable(writer: Writer, value: Writable): void {
    if (typeof value === "string") {
        writer.write(value);
    } else {
        value.write(writer);
    }
}

/**
 * Base for builders that emit different output in TypeScript (`.d.ts`) and
 * JavaScript modes. Subclasses implement {@link writeJs} and {@link writeTs};
 * the dispatch in {@link write} routes by {@link Writer.getMode}.
 */
export abstract class DualModeBuilder implements Builder {
    /** @inheritdoc */
    write(writer: Writer): void {
        if (writer.getMode() === "js") {
            this.writeJs(writer);
            return;
        }
        this.writeTs(writer);
    }

    /** Emits the JavaScript-mode output. */
    protected abstract writeJs(writer: Writer): void;

    /** Emits the TypeScript-mode output. */
    protected abstract writeTs(writer: Writer): void;
}
