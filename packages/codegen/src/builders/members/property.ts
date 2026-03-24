import type { Builder, Writable } from "../types.js";
import { writeWritable } from "../types.js";
import type { Writer } from "../writer.js";
import { writeJsDoc } from "./doc.js";

/** Configuration options for a class or interface property. */
export type PropertyOptions = {
    type?: Writable;
    optional?: boolean;
    readonly?: boolean;
    isStatic?: boolean;
    override?: boolean;
    initializer?: string;
    doc?: string;
    abstract?: boolean;
};

/** Builder that emits a class property declaration with modifiers, type, and optional initializer. */
export class PropertyBuilder implements Builder {
    constructor(
        readonly name: string,
        private readonly opts: PropertyOptions,
    ) {}

    /** @inheritdoc */
    write(writer: Writer): void {
        writeJsDoc(writer, this.opts.doc);
        if (this.opts.isStatic) writer.write("static ");
        if (this.opts.abstract) writer.write("abstract ");
        if (this.opts.override) writer.write("override ");
        if (this.opts.readonly) writer.write("readonly ");
        writer.write(this.name);
        if (this.opts.optional) writer.write("?");
        if (this.opts.type) {
            writer.write(": ");
            writeWritable(writer, this.opts.type);
        }
        if (this.opts.initializer) {
            writer.write(` = ${this.opts.initializer}`);
        }
        writer.writeLine(";");
    }
}

/** Create a {@link PropertyBuilder} with the given name and options. */
export function property(name: string, opts: PropertyOptions): PropertyBuilder {
    return new PropertyBuilder(name, opts);
}
