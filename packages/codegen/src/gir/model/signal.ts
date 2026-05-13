import type { GirParameter } from "./parameter.js";
import type { GirType } from "./type.js";

/**
 * GObject signal with helper methods.
 */
export class GirSignal {
    readonly name: string;
    readonly when: "first" | "last" | "cleanup";
    readonly returnType: GirType | null;
    readonly parameters: GirParameter[];
    readonly doc?: string;

    constructor(data: {
        name: string;
        when: "first" | "last" | "cleanup";
        returnType: GirType | null;
        parameters: GirParameter[];
        doc?: string;
    }) {
        this.name = data.name;
        this.when = data.when;
        this.returnType = data.returnType;
        this.parameters = data.parameters;
        this.doc = data.doc;
    }

    /** True if the signal returns a value. */
    hasReturnValue(): boolean {
        return this.returnType !== null && !this.returnType.isVoid();
    }
}
