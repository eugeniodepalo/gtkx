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
    declare?: boolean;
    initializer?: string;
    doc?: string;
    abstract?: boolean;
};

/**
 * Builder that emits a class property declaration.
 *
 * In JS mode, properties carrying `declare: true` emit nothing — the runtime
 * binding is installed via `Object.defineProperty` on the prototype
 * elsewhere, and emitting `name = undefined` would clobber that accessor.
 */
export class PropertyBuilder implements Builder {
    constructor(
        readonly name: string,
        private readonly opts: PropertyOptions,
    ) {}

    /** @inheritdoc */
    write(writer: Writer): void {
        if (writer.getMode() === "js") {
            this.writeJs(writer);
            return;
        }
        this.writeTs(writer);
    }

    private writeJs(writer: Writer): void {
        if (this.opts.declare) return;
        writeJsDoc(writer, this.opts.doc);
        if (this.opts.isStatic) writer.write("static ");
        writer.write(this.name);
        if (this.opts.initializer) {
            writer.write(` = ${this.opts.initializer}`);
        }
        writer.writeLine(";");
    }

    private writeTs(writer: Writer): void {
        writeJsDoc(writer, this.opts.doc);
        if (this.opts.isStatic) writer.write("static ");
        if (this.opts.abstract) writer.write("abstract ");
        if (this.opts.override) writer.write("override ");
        if (this.opts.declare) writer.write("declare ");
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
