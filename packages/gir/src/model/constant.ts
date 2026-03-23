import type { GirType } from "./type.js";

/**
 * Constant value defined in a GIR namespace.
 */
export class GirConstant {
    readonly name: string;
    readonly qualifiedName: string;
    readonly cType: string;
    readonly value: string;
    readonly type: GirType;
    readonly doc?: string;

    constructor(data: {
        name: string;
        qualifiedName: string;
        cType: string;
        value: string;
        type: GirType;
        doc?: string;
    }) {
        this.name = data.name;
        this.qualifiedName = data.qualifiedName;
        this.cType = data.cType;
        this.value = data.value;
        this.type = data.type;
        this.doc = data.doc;
    }
}
