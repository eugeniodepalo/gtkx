import type { ParameterBuilder } from "../members/parameter.js";
import type { Builder, Writable } from "../types.js";
import { writeWritable } from "../types.js";
import type { Writer } from "../writer.js";

/** Builder that emits a function type expression (`(params) => ReturnType`). */
export class FunctionType implements Builder {
    constructor(
        readonly params: ParameterBuilder[],
        readonly returnType: Writable,
    ) {}

    /** @inheritdoc */
    write(writer: Writer): void {
        writer.write("(");
        writer.writeJoined(", ", this.params);
        writer.write(") => ");
        writeWritable(writer, this.returnType);
    }
}

/** Create a {@link FunctionType} with the given parameters and return type. */
export function functionType(params: ParameterBuilder[], returnType: Writable): FunctionType {
    return new FunctionType(params, returnType);
}
