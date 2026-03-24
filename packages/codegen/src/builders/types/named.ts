import type { Builder, Writable } from "../types.js";
import type { Writer } from "../writer.js";

/** Builder that emits a named type reference, optionally with generic type arguments. */
export class NamedType implements Builder {
    private readonly typeArgs: Writable[];

    constructor(
        readonly name: string,
        typeArgs?: Writable[],
    ) {
        this.typeArgs = typeArgs ?? [];
    }

    /** @inheritdoc */
    write(writer: Writer): void {
        writer.write(this.name);
        if (this.typeArgs.length > 0) {
            writer.write("<");
            writer.writeJoined(", ", this.typeArgs);
            writer.write(">");
        }
    }
}

/** Create a {@link NamedType} with optional type arguments. */
export function namedType(name: string, ...typeArgs: Writable[]): NamedType {
    return new NamedType(name, typeArgs);
}
