import type { Builder, Writable } from "../types.js";
import { writeWritable } from "../types.js";
import type { Writer } from "../writer.js";

/** Configuration options for a function or method parameter. */
export type ParameterOptions = {
    type: Writable;
    optional?: boolean;
    rest?: boolean;
    defaultValue?: string;
};

/** Builder that emits a typed parameter declaration (e.g. `name: Type`, `...rest: Type[]`). */
export class ParameterBuilder implements Builder {
    constructor(
        readonly name: string,
        private readonly opts: ParameterOptions,
    ) {}

    /** @inheritdoc */
    write(writer: Writer): void {
        if (this.opts.rest) writer.write("...");
        writer.write(this.name);
        if (this.opts.optional && !this.opts.defaultValue) writer.write("?");
        writer.write(": ");
        writeWritable(writer, this.opts.type);
        if (this.opts.defaultValue) {
            writer.write(` = ${this.opts.defaultValue}`);
        }
    }
}

/** Create a {@link ParameterBuilder} with the given name, type, and options. */
export function param(name: string, type: Writable, opts?: Omit<ParameterOptions, "type">): ParameterBuilder {
    return new ParameterBuilder(name, { type, ...opts });
}
