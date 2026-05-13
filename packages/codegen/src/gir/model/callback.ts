import type { GirParameter } from "./parameter.js";
import type { GirType } from "./type.js";

/**
 * Callback type definition (function pointer type).
 *
 * Used for both namespace-level callback declarations and inline callback
 * fields embedded inside record/class structs. The `introspectable` flag
 * mirrors the GIR `introspectable` XML attribute and lets downstream
 * consumers skip slots whose signature cannot be safely marshalled.
 */
export class GirCallback {
    readonly name: string;
    readonly qualifiedName: string;
    readonly cType: string;
    readonly returnType: GirType;
    readonly parameters: GirParameter[];
    readonly introspectable: boolean;
    readonly doc?: string;

    constructor(data: {
        name: string;
        qualifiedName: string;
        cType: string;
        returnType: GirType;
        parameters: GirParameter[];
        introspectable?: boolean;
        doc?: string;
    }) {
        this.name = data.name;
        this.qualifiedName = data.qualifiedName;
        this.cType = data.cType;
        this.returnType = data.returnType;
        this.parameters = data.parameters;
        this.introspectable = data.introspectable ?? true;
        this.doc = data.doc;
    }
}
