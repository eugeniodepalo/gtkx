import type { GirCallback } from "./callback.js";
import type { GirType } from "./type.js";

/**
 * A `<record>` or `<union>` nested directly inside a record or union.
 *
 * Inline composites are anonymous aggregates in C. They occupy memory in
 * the enclosing layout but receive no accessor; only their size feeds the
 * enclosing record's size. `fields` may itself contain further inline
 * composites.
 */
export type GirInlineComposite = {
    isUnion: boolean;
    fields: GirField[];
};

/**
 * Field within a record or class struct.
 *
 * When a GIR `<field>` contains an inline `<callback>` child (typical of
 * vtable slots inside class structs such as `GObjectClass.set_property`),
 * the parser populates `callback` with the parsed signature. The field's
 * `type` is then synthesized as `gpointer` so struct-layout calculations
 * still yield correct byte offsets while leaving the signature available
 * for vtable-aware codegen.
 *
 * `bits` is set for C bitfield members (GIR `bits` attribute); it is the
 * field's width in bits and drives bit-packed struct layout and masked
 * accessor generation.
 *
 * `inlineComposite` is set for synthetic `private` fields representing a
 * `<record>` or `<union>` nested directly inside the enclosing aggregate;
 * such fields receive no accessor and contribute only their size.
 */
export class GirField {
    readonly name: string;
    readonly type: GirType;
    readonly writable: boolean;
    readonly readable: boolean;
    readonly private: boolean;
    readonly bits?: number;
    readonly callback?: GirCallback;
    readonly inlineComposite?: GirInlineComposite;
    readonly doc?: string;

    constructor(data: {
        name: string;
        type: GirType;
        writable: boolean;
        readable: boolean;
        private: boolean;
        bits?: number;
        callback?: GirCallback;
        inlineComposite?: GirInlineComposite;
        doc?: string;
    }) {
        this.name = data.name;
        this.type = data.type;
        this.writable = data.writable;
        this.readable = data.readable;
        this.private = data.private;
        this.bits = data.bits;
        this.callback = data.callback;
        this.inlineComposite = data.inlineComposite;
        this.doc = data.doc;
    }
}
