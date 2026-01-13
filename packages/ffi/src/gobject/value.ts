import { read } from "@gtkx/native";
import { typeName } from "../generated/gobject/functions.js";
import { Value } from "../generated/gobject/value.js";

declare module "../generated/gobject/value.js" {
    interface Value {
        /**
         * Gets the GType of the value stored in this GValue.
         * This is equivalent to the C macro G_VALUE_TYPE(value).
         * @returns The GType identifier
         */
        getType(): number;

        /**
         * Gets the name of the GType stored in this GValue.
         * This is equivalent to G_VALUE_TYPE_NAME(value).
         * @returns The type name string
         */
        getTypeName(): string;

        /**
         * Checks if this GValue holds a value of the specified GType.
         * This is equivalent to G_VALUE_HOLDS(value, type).
         * @param gtype - The GType to check against
         * @returns true if the value holds the specified type
         */
        holds(gtype: number): boolean;
    }
}

Value.prototype.getType = function (): number {
    return read(this.handle, { type: "int", size: 64, unsigned: true }, 0) as number;
};

Value.prototype.getTypeName = function (): string {
    const gtype = this.getType();
    return typeName(gtype) ?? "invalid";
};

Value.prototype.holds = function (gtype: number): boolean {
    return this.getType() === gtype;
};
