import * as Gtk from "@gtkx/ffi/gtk";
import type { TextPaintableProps } from "../jsx.js";
import { TEXT_OBJECT_REPLACEMENT } from "./text-content.js";
import { VirtualNode } from "./virtual.js";

export class TextPaintableNode extends VirtualNode<TextPaintableProps> {
    private buffer: Gtk.TextBuffer | null = null;
    private bufferOffset = 0;

    public getBufferOffset(): number {
        return this.bufferOffset;
    }

    public setBufferOffset(offset: number): void {
        this.bufferOffset = offset;
    }

    public getLength(): number {
        return 1;
    }

    public getText(): string {
        return TEXT_OBJECT_REPLACEMENT;
    }

    public setTextViewAndBuffer(_textView: Gtk.TextView, buffer: Gtk.TextBuffer): void {
        this.buffer = buffer;
        this.insertPaintable();
    }

    private insertPaintable(): void {
        if (!this.buffer || !this.props.paintable) return;
        const iter = new Gtk.TextIter();
        this.buffer.getIterAtOffset(iter, this.bufferOffset);
        this.buffer.insertPaintable(iter, this.props.paintable);
    }

    public override detachDeletedInstance(): void {
        this.buffer = null;
        super.detachDeletedInstance();
    }
}
