import type { GirType } from "./type.js";

/**
 * Field within a record or class.
 */
export class GirField {
    readonly name: string;
    readonly type: GirType;
    readonly writable: boolean;
    readonly readable: boolean;
    readonly private: boolean;
    readonly doc?: string;

    constructor(data: {
        name: string;
        type: GirType;
        writable: boolean;
        readable: boolean;
        private: boolean;
        doc?: string;
    }) {
        this.name = data.name;
        this.type = data.type;
        this.writable = data.writable;
        this.readable = data.readable;
        this.private = data.private;
        this.doc = data.doc;
    }
}
