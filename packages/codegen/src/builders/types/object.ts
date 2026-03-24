import type { Builder, Writable } from "../types.js";
import { writeWritable } from "../types.js";
import type { Writer } from "../writer.js";

/** A single property entry within an object type literal. */
export type ObjectTypeEntry = {
    key: string;
    type: Writable;
    optional?: boolean;
    readonly?: boolean;
};

/** Builder that emits an inline object type literal (`{ key: Type; ... }`). */
export class ObjectType implements Builder {
    constructor(readonly entries: ObjectTypeEntry[]) {}

    /** @inheritdoc */
    write(writer: Writer): void {
        if (this.entries.length === 0) {
            writer.write("{}");
            return;
        }

        writer.writeBlock(() => {
            for (const entry of this.entries) {
                if (entry.readonly) writer.write("readonly ");
                writer.write(entry.key);
                if (entry.optional) writer.write("?");
                writer.write(": ");
                writeWritable(writer, entry.type);
                writer.writeLine(";");
            }
        });
    }
}

/** Create an {@link ObjectType} from the given property entries. */
export function objectType(entries: ObjectTypeEntry[]): ObjectType {
    return new ObjectType(entries);
}
