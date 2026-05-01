import { writeJsDoc } from "../members/doc.js";
import type { ParameterBuilder } from "../members/parameter.js";
import type { Builder, Writable } from "../types.js";
import { writeWritable } from "../types.js";
import type { Writer } from "../writer.js";

/** Configuration options for a top-level function declaration. */
export type FunctionDeclarationOptions = {
    params?: ParameterBuilder[];
    returnType?: Writable;
    body?: string[] | ((writer: Writer) => void);
    exported?: boolean;
    doc?: string;
    async?: boolean;
};

/** Builder that emits a top-level function declaration with parameters, return type, and body. */
export class FunctionDeclarationBuilder implements Builder {
    constructor(
        readonly name: string,
        private readonly opts: FunctionDeclarationOptions = {},
    ) {}

    /** @inheritdoc */
    write(writer: Writer): void {
        writeJsDoc(writer, this.opts.doc);
        if (this.opts.exported) writer.write("export ");
        if (this.opts.async) writer.write("async ");
        writer.write(`function ${this.name}(`);
        if (this.opts.params && this.opts.params.length > 0) {
            writer.writeJoined(", ", this.opts.params);
        }
        writer.write(")");
        if (this.opts.returnType) {
            writer.write(": ");
            writeWritable(writer, this.opts.returnType);
        } else {
            writer.write(": void");
        }
        writer.write(" ");
        writer.writeBlock(() => {
            if (typeof this.opts.body === "function") {
                this.opts.body(writer);
            } else if (this.opts.body) {
                for (const line of this.opts.body) {
                    writer.writeLine(line);
                }
            }
        });
        writer.newLine();
    }
}

/** Create a {@link FunctionDeclarationBuilder} with the given name and options. */
export function functionDecl(name: string, opts?: FunctionDeclarationOptions): FunctionDeclarationBuilder {
    return new FunctionDeclarationBuilder(name, opts);
}
