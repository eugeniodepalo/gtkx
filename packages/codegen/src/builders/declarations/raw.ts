import type { Builder } from "../types.js";
import type { Writer } from "../writer.js";

/** Builder that emits a raw text string verbatim without any transformation. */
export class RawStatement implements Builder {
    constructor(private readonly text: string) {}

    /** @inheritdoc */
    write(writer: Writer): void {
        writer.write(this.text);
    }
}

/** Create a {@link RawStatement} that emits the given text verbatim. */
export function raw(text: string): RawStatement {
    return new RawStatement(text);
}
