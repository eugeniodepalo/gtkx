import * as Gtk from "@gtkx/ffi/gtk";
import type { TextPaintableProps } from "../jsx.js";
import { VirtualNode } from "./virtual.js";

const PLACEHOLDER = "\uFFFC";

export class TextPaintableNode extends VirtualNode<TextPaintableProps> {
    private buffer: Gtk.TextBuffer | null = null;
    public bufferOffset = 0;

    public getLength(): number {
        return 1;
    }

    public getText(): string {
        return PLACEHOLDER;
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
