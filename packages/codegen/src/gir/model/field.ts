import type { GirCallback } from "./callback.js";
import type { GirType } from "./type.js";

/**
 * Field within a record or class struct.
 *
 * When a GIR `<field>` contains an inline `<callback>` child (typical of
 * vtable slots inside class structs such as `GObjectClass.set_property`),
 * the parser populates `callback` with the parsed signature. The field's
 * `type` is then synthesized as `gpointer` so struct-layout calculations
 * still yield correct byte offsets while leaving the signature available
 * for vtable-aware codegen.
 */
export class GirField {
    readonly name: string;
    readonly type: GirType;
    readonly writable: boolean;
    readonly readable: boolean;
    readonly private: boolean;
    readonly callback?: GirCallback;
    readonly doc?: string;

    constructor(data: {
        name: string;
        type: GirType;
        writable: boolean;
        readable: boolean;
        private: boolean;
        callback?: GirCallback;
        doc?: string;
    }) {
        this.name = data.name;
        this.type = data.type;
        this.writable = data.writable;
        this.readable = data.readable;
        this.private = data.private;
        this.callback = data.callback;
        this.doc = data.doc;
    }
}
