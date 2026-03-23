import type { GirType } from "./type.js";

/**
 * Type alias definition.
 */
export class GirAlias {
    readonly name: string;
    readonly qualifiedName: string;
    readonly cType: string;
    readonly targetType: GirType;
    readonly doc?: string;

    constructor(data: {
        name: string;
        qualifiedName: string;
        cType: string;
        targetType: GirType;
        doc?: string;
    }) {
        this.name = data.name;
        this.qualifiedName = data.qualifiedName;
        this.cType = data.cType;
        this.targetType = data.targetType;
        this.doc = data.doc;
    }

    /** True if this alias points to a non-intrinsic, non-array type (likely a record). */
    isRecordAlias(): boolean {
        return !this.targetType.isIntrinsic() && !this.targetType.isArray;
    }
}
