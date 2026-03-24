import type { Builder, Writable } from "../types.js";
import { writeWritable } from "../types.js";
import type { Writer } from "../writer.js";
import { UnionType } from "./union.js";

/** Builder that emits an array type (`T[]`), wrapping union element types in parentheses. */
export class ArrayType implements Builder {
    constructor(readonly elementType: Writable) {}

    /** @inheritdoc */
    write(writer: Writer): void {
        const needsParens = this.elementType instanceof UnionType;
        if (needsParens) writer.write("(");
        writeWritable(writer, this.elementType);
        if (needsParens) writer.write(")");
        writer.write("[]");
    }
}

/** Create an {@link ArrayType} for the given element type. */
export function arrayType(elementType: Writable): ArrayType {
    return new ArrayType(elementType);
}
