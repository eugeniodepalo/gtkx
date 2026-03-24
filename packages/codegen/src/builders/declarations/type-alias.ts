import { writeJsDoc } from "../members/doc.js";
import type { Builder, Writable } from "../types.js";
import { writeWritable } from "../types.js";
import type { Writer } from "../writer.js";

/** Configuration options for a type alias declaration. */
export type TypeAliasOptions = {
    exported?: boolean;
    doc?: string;
};

/** Builder that emits a `type Name = ...` type alias declaration. */
export class TypeDeclarationBuilder implements Builder {
    private exported: boolean;

    constructor(
        readonly name: string,
        private readonly type: Writable,
        private readonly opts: TypeAliasOptions = {},
    ) {
        this.exported = opts.exported ?? false;
    }

    /** Mark this type alias as exported. */
    export(): this {
        this.exported = true;
        return this;
    }

    /** @inheritdoc */
    write(writer: Writer): void {
        writeJsDoc(writer, this.opts.doc);
        if (this.exported) writer.write("export ");
        writer.write(`type ${this.name} = `);
        writeWritable(writer, this.type);
        writer.writeLine(";");
    }
}

/** Create a {@link TypeDeclarationBuilder} with the given name, underlying type, and options. */
export function typeAlias(name: string, type: Writable, opts?: TypeAliasOptions): TypeDeclarationBuilder {
    return new TypeDeclarationBuilder(name, type, opts);
}
