import type { GirType } from "./type.js";

/**
 * Parameter to a function, method, or callback.
 */
export class GirParameter {
    readonly name: string;
    readonly type: GirType;
    readonly direction: "in" | "out" | "inout";
    readonly callerAllocates: boolean;
    readonly nullable: boolean;
    readonly optional: boolean;
    readonly scope?: "async" | "call" | "notified" | "forever";
    readonly closure?: number;
    readonly destroy?: number;
    readonly transferOwnership?: "none" | "full" | "container";
    readonly doc?: string;

    constructor(data: {
        name: string;
        type: GirType;
        direction: "in" | "out" | "inout";
        callerAllocates: boolean;
        nullable: boolean;
        optional: boolean;
        scope?: "async" | "call" | "notified" | "forever";
        closure?: number;
        destroy?: number;
        transferOwnership?: "none" | "full" | "container";
        doc?: string;
    }) {
        this.name = data.name;
        this.type = data.type;
        this.direction = data.direction;
        this.callerAllocates = data.callerAllocates;
        this.nullable = data.nullable;
        this.optional = data.optional;
        this.scope = data.scope;
        this.closure = data.closure;
        this.destroy = data.destroy;
        this.transferOwnership = data.transferOwnership;
        this.doc = data.doc;
    }

    /** True if this is an input parameter. */
    isIn(): boolean {
        return this.direction === "in";
    }

    /** True if this is an output parameter. */
    isOut(): boolean {
        return this.direction === "out" || this.direction === "inout";
    }

    /** True if this is a callback parameter (has scope). */
    isCallback(): boolean {
        return this.scope !== undefined;
    }

    /** True if this is the user_data for a callback. */
    isClosureData(): boolean {
        return this.closure !== undefined;
    }

    /** True if this is a destroy notify for a callback. */
    isDestroyNotify(): boolean {
        return this.destroy !== undefined;
    }

    /** True if caller must allocate memory for this out param. */
    requiresCallerAllocation(): boolean {
        return this.callerAllocates && this.isOut();
    }
}
