import * as Gtk from "@gtkx/ffi/gtk";
import type { TextAnchorProps } from "../jsx.js";
import type { Node } from "../node.js";
import { TEXT_OBJECT_REPLACEMENT } from "./text-content.js";
import { VirtualNode } from "./virtual.js";
import { WidgetNode } from "./widget.js";

export class TextAnchorNode extends VirtualNode<TextAnchorProps, Node, WidgetNode> {
    private textView: Gtk.TextView | null = null;
    private buffer: Gtk.TextBuffer | null = null;
    private anchor: Gtk.TextChildAnchor | null = null;
    private widgetChild: WidgetNode | null = null;

    private bufferOffset = 0;

    public getBufferOffset(): number {
        return this.bufferOffset;
    }

    public setBufferOffset(offset: number): void {
        this.bufferOffset = offset;
    }

    public override isValidChild(child: Node): boolean {
        return child instanceof WidgetNode;
    }

    public getLength(): number {
        return 1;
    }

    public getText(): string {
        return TEXT_OBJECT_REPLACEMENT;
    }

    public setTextViewAndBuffer(textView: Gtk.TextView, buffer: Gtk.TextBuffer): void {
        this.textView = textView;
        this.buffer = buffer;
        this.setupAnchor();
    }

    private setupAnchor(): void {
        if (!this.textView || !this.buffer) return;

        const iter = new Gtk.TextIter();
        this.buffer.getIterAtOffset(iter, this.bufferOffset);

        this.anchor = this.buffer.createChildAnchor(iter);

        if (this.widgetChild?.container && this.anchor) {
            this.textView.addChildAtAnchor(this.widgetChild.container, this.anchor);
        }
    }

    public override appendChild(child: WidgetNode): void {
        super.appendChild(child);
        this.widgetChild = child;

        if (this.textView && this.anchor && child.container) {
            this.textView.addChildAtAnchor(child.container, this.anchor);
        }
    }

    public override removeChild(child: WidgetNode): void {
        if (child === this.widgetChild) {
            this.widgetChild = null;
        }
        super.removeChild(child);
    }

    public override detachDeletedInstance(): void {
        this.anchor = null;
        this.widgetChild = null;
        this.buffer = null;
        this.textView = null;
        super.detachDeletedInstance();
    }
}
