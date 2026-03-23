import type { GirParameter } from "./parameter.js";
import type { GirType } from "./type.js";

/**
 * Callback type definition (function pointer type).
 */
export class GirCallback {
    readonly name: string;
    readonly qualifiedName: string;
    readonly cType: string;
    readonly returnType: GirType;
    readonly parameters: GirParameter[];
    readonly doc?: string;

    constructor(data: {
        name: string;
        qualifiedName: string;
        cType: string;
        returnType: GirType;
        parameters: GirParameter[];
        doc?: string;
    }) {
        this.name = data.name;
        this.qualifiedName = data.qualifiedName;
        this.cType = data.cType;
        this.returnType = data.returnType;
        this.parameters = data.parameters;
        this.doc = data.doc;
    }
}
