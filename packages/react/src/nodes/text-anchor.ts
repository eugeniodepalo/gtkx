import * as Gtk from "@gtkx/ffi/gtk";
import type { ReactNode } from "react";
import type { Node } from "../node.js";
import { registerNodeClass } from "../registry.js";
import { VirtualNode } from "./virtual.js";
import { WidgetNode } from "./widget.js";

const PLACEHOLDER = "\uFFFC";

/**
 * Props for the TextAnchor virtual element.
 *
 * Used to declaratively embed widgets within text content in a TextBuffer.
 * The anchor is placed at the current position in the text flow.
 *
 * @example
 * ```tsx
 * <GtkTextView>
 *     <x.TextBuffer>
 *         Click here: <x.TextAnchor>
 *             <GtkButton label="Click me" />
 *         </x.TextAnchor> to continue.
 *     </x.TextBuffer>
 * </GtkTextView>
 * ```
 */
export type TextAnchorProps = {
    /** The widget to embed at this anchor position */
    children?: ReactNode;
};

export class TextAnchorNode extends VirtualNode<TextAnchorProps> {
    public static override priority = 1;

    private textView?: Gtk.TextView;
    private buffer?: Gtk.TextBuffer;
    private anchor?: Gtk.TextChildAnchor;
    private widgetChild?: WidgetNode;

    public bufferOffset = 0;

    public static override matches(type: string): boolean {
        return type === "TextAnchor";
    }

    public getLength(): number {
        return 1;
    }

    public getText(): string {
        return PLACEHOLDER;
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

    public override appendChild(child: Node): void {
        if (!(child instanceof WidgetNode)) {
            throw new Error(`TextAnchor can only contain widget children, got '${child.typeName}'`);
        }

        this.widgetChild = child;

        if (this.textView && this.anchor && child.container) {
            this.textView.addChildAtAnchor(child.container, this.anchor);
        }
    }

    public override removeChild(child: Node): void {
        if (child === this.widgetChild) {
            this.widgetChild = undefined;
        }
    }

    public override unmount(): void {
        this.anchor = undefined;
        this.widgetChild = undefined;
        this.buffer = undefined;
        this.textView = undefined;
        super.unmount();
    }
}

registerNodeClass(TextAnchorNode);
