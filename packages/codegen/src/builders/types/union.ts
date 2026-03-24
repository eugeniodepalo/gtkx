import type { Builder, Writable } from "../types.js";
import type { Writer } from "../writer.js";

/** Builder that emits a union type (`A | B | C`). */
export class UnionType implements Builder {
    constructor(readonly members: Writable[]) {}

    /** @inheritdoc */
    write(writer: Writer): void {
        writer.writeJoined(" | ", this.members);
    }
}

/** Create a {@link UnionType} from the given members. */
export function unionType(...members: Writable[]): UnionType {
    return new UnionType(members);
}
