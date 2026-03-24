import type { Builder } from "../types.js";
import type { Writer } from "../writer.js";

/** Builder that emits a literal type (string, number, or boolean literal). */
export class LiteralType implements Builder {
    constructor(readonly value: string | number | boolean) {}

    /** @inheritdoc */
    write(writer: Writer): void {
        if (typeof this.value === "string") {
            writer.write(JSON.stringify(this.value));
        } else {
            writer.write(String(this.value));
        }
    }
}

/** Create a {@link LiteralType} for the given value. */
export function literalType(value: string | number | boolean): LiteralType {
    return new LiteralType(value);
}
