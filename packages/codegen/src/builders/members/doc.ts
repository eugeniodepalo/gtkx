import type { Writer } from "../writer.js";

/** Write a JSDoc comment block to the writer. Single-line docs use inline format; multi-line docs use block format. */
export function writeJsDoc(writer: Writer, doc: string | undefined): void {
    if (!doc) return;

    const lines = doc.split("\n");
    if (lines.length === 1) {
        writer.writeLine(`/** ${lines[0]} */`);
        return;
    }

    writer.writeLine("/**");
    for (const line of lines) {
        if (line.length > 0) {
            writer.writeLine(` * ${line}`);
        } else {
            writer.writeLine(" *");
        }
    }
    writer.writeLine(" */");
}
