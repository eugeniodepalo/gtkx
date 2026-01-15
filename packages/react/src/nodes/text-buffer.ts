import { batch } from "@gtkx/ffi";
import * as Gtk from "@gtkx/ffi/gtk";
import type { ReactNode } from "react";
import type { Node } from "../node.js";
import { registerNodeClass } from "../registry.js";
import { signalStore } from "./internal/signal-store.js";
import { TextAnchorNode } from "./text-anchor.js";
import type { TextContentChild, TextContentParent } from "./text-content.js";
import { TextSegmentNode } from "./text-segment.js";
import { TextTagNode } from "./text-tag.js";
import { VirtualNode } from "./virtual.js";

/**
 * Props for the TextBuffer virtual element.
 *
 * Used to declaratively configure the text buffer for a GtkTextView.
 * Text content is provided as children, with optional TextTag elements for formatting.
 *
 * @example
 * ```tsx
 * <GtkTextView>
 *     <x.TextBuffer enableUndo onTextChanged={(text) => console.log(text)}>
 *         Hello <x.TextTag id="bold" weight={Pango.Weight.BOLD}>world</x.TextTag>!
 *     </x.TextBuffer>
 * </GtkTextView>
 * ```
 */
export type TextBufferProps = {
    /** Whether to enable undo/redo */
    enableUndo?: boolean;
    /** Callback when the text content changes */
    onTextChanged?: (text: string) => void;
    /** Callback when can-undo state changes */
    onCanUndoChanged?: (canUndo: boolean) => void;
    /** Callback when can-redo state changes */
    onCanRedoChanged?: (canRedo: boolean) => void;
    /** Text content and TextTag children */
    children?: ReactNode;
};

export class TextBufferNode extends VirtualNode<TextBufferProps> implements TextContentParent {
    public static override priority = 1;

    private textView?: Gtk.TextView;
    private buffer?: Gtk.TextBuffer;
    private children: TextContentChild[] = [];

    public static override matches(type: string): boolean {
        return type === "TextBuffer";
    }

    public setTextView(textView: Gtk.TextView): void {
        this.textView = textView;
        this.setupBuffer();
    }

    private setupBuffer(): void {
        if (!this.textView) return;

        this.buffer = new Gtk.TextBuffer();
        this.textView.setBuffer(this.buffer);

        if (this.props.enableUndo !== undefined) {
            this.buffer.setEnableUndo(this.props.enableUndo);
        }

        this.updateSignalHandlers();
        this.initializeChildren();
    }

    private initializeChildren(): void {
        if (!this.buffer) return;

        let offset = 0;
        for (const child of this.children) {
            child.bufferOffset = offset;

            if (child instanceof TextSegmentNode) {
                this.insertTextAtOffset(child.getText(), offset);
                offset += child.getLength();
            } else if (child instanceof TextTagNode) {
                const text = child.getText();
                this.insertTextAtOffset(text, offset);
                child.setBuffer(this.buffer);
                offset += text.length;
            } else if (child instanceof TextAnchorNode && this.textView) {
                child.setTextViewAndBuffer(this.textView, this.buffer);
                offset += child.getLength();
            }
        }
    }

    private insertTextAtOffset(text: string, offset: number): void {
        if (!this.buffer || text.length === 0) return;

        const iter = new Gtk.TextIter();
        batch(() => {
            this.buffer!.getIterAtOffset(iter, offset);
            this.buffer!.insert(iter, text, text.length);
        });
    }

    private deleteTextAtRange(start: number, end: number): void {
        const buffer = this.buffer;
        if (!buffer || start >= end) return;

        const startIter = new Gtk.TextIter();
        const endIter = new Gtk.TextIter();

        batch(() => {
            buffer.getIterAtOffset(startIter, start);
            buffer.getIterAtOffset(endIter, end);
            buffer.delete(startIter, endIter);
        });
    }

    private updateChildOffsets(startIndex: number): void {
        let offset = 0;

        for (let i = 0; i < startIndex; i++) {
            const child = this.children[i];
            if (child) offset += child.getLength();
        }

        for (let i = startIndex; i < this.children.length; i++) {
            const child = this.children[i];
            if (child) {
                child.bufferOffset = offset;
                offset += child.getLength();
            }
        }
    }

    private reapplyAllTagsRecursive(children: TextContentChild[]): void {
        for (const child of children) {
            if (child instanceof TextTagNode) {
                child.reapplyTag();
                this.reapplyAllTagsRecursive(child.getChildren());
            }
        }
    }

    private reapplyTagsFromOffset(fromOffset: number): void {
        for (const child of this.children) {
            if (child instanceof TextTagNode) {
                if (child.bufferOffset >= fromOffset) {
                    child.reapplyTag();
                    this.reapplyAllTagsRecursive(child.getChildren());
                } else if (child.bufferOffset + child.getLength() > fromOffset) {
                    child.reapplyTag();
                    this.reapplyAllTagsRecursive(child.getChildren());
                }
            }
        }
    }

    private findDirectChildContaining(offset: number): number {
        for (let i = 0; i < this.children.length; i++) {
            const child = this.children[i];
            if (child) {
                const start = child.bufferOffset;
                const end = start + child.getLength();
                if (offset >= start && offset <= end) {
                    return i;
                }
            }
        }
        return -1;
    }

    public onChildInserted(child: TextContentChild): void {
        if (!this.buffer) return;

        const text = child.getText();
        if (text.length > 0) {
            this.insertTextAtOffset(text, child.bufferOffset);
        }

        const containingIndex = this.findDirectChildContaining(child.bufferOffset);
        if (containingIndex !== -1) {
            this.updateChildOffsets(containingIndex + 1);
        }

        this.reapplyTagsFromOffset(child.bufferOffset);
    }

    public onChildRemoved(child: TextContentChild): void {
        if (!this.buffer) return;

        const offset = child.bufferOffset;
        const length = child.getLength();

        if (length > 0) {
            this.deleteTextAtRange(offset, offset + length);
        }

        const containingIndex = this.findDirectChildContaining(offset);
        if (containingIndex !== -1) {
            this.updateChildOffsets(containingIndex + 1);
        }

        this.reapplyTagsFromOffset(offset);
    }

    public onChildTextChanged(child: TextSegmentNode, oldLength: number, _newLength: number): void {
        if (!this.buffer) return;

        const offset = child.bufferOffset;

        this.deleteTextAtRange(offset, offset + oldLength);
        this.insertTextAtOffset(child.getText(), offset);

        const containingIndex = this.findDirectChildContaining(offset);
        if (containingIndex !== -1) {
            this.updateChildOffsets(containingIndex + 1);
        }

        this.reapplyTagsFromOffset(offset);
    }

    private getTotalLength(): number {
        let length = 0;
        for (const child of this.children) {
            length += child.getLength();
        }
        return length;
    }

    public override appendChild(child: Node): void {
        if (this.isTextContentChild(child)) {
            const wasMoved = this.children.indexOf(child as TextContentChild) !== -1;
            if (wasMoved) {
                const existingIndex = this.children.indexOf(child as TextContentChild);
                const oldOffset = (child as TextContentChild).bufferOffset;
                const oldLength = (child as TextContentChild).getLength();

                this.children.splice(existingIndex, 1);

                if (this.buffer && oldLength > 0) {
                    this.deleteTextAtRange(oldOffset, oldOffset + oldLength);
                }

                this.updateChildOffsets(existingIndex);
            }

            const offset = this.getTotalLength();

            this.children.push(child as TextContentChild);
            (child as TextContentChild).bufferOffset = offset;
            this.setChildParent(child as TextContentChild);

            if (this.buffer) {
                if (child instanceof TextSegmentNode) {
                    this.insertTextAtOffset(child.getText(), offset);
                } else if (child instanceof TextTagNode) {
                    const text = child.getText();
                    this.insertTextAtOffset(text, offset);
                    if (!child.hasBuffer()) {
                        child.setBuffer(this.buffer);
                    }
                } else if (child instanceof TextAnchorNode && this.textView) {
                    child.setTextViewAndBuffer(this.textView, this.buffer);
                }
            }

            if (wasMoved) {
                this.updateChildOffsets(0);
                this.reapplyTagsFromOffset(0);
            }
            return;
        }
        super.appendChild(child);
    }

    public override removeChild(child: Node): void {
        const index = this.children.indexOf(child as TextContentChild);
        if (index !== -1) {
            const offset = (child as TextContentChild).bufferOffset;
            const length = (child as TextContentChild).getLength();

            this.children.splice(index, 1);

            if (this.buffer && length > 0) {
                this.deleteTextAtRange(offset, offset + length);
            }

            this.updateChildOffsets(index);
            this.reapplyTagsFromOffset(offset);
            return;
        }
        if (this.isTextContentChild(child)) {
            return;
        }
        super.removeChild(child);
    }

    public override insertBefore(child: Node, before: Node): void {
        if (this.isTextContentChild(child)) {
            const existingIndex = this.children.indexOf(child as TextContentChild);
            if (existingIndex !== -1) {
                const oldOffset = (child as TextContentChild).bufferOffset;
                const oldLength = (child as TextContentChild).getLength();

                this.children.splice(existingIndex, 1);

                if (this.buffer && oldLength > 0) {
                    this.deleteTextAtRange(oldOffset, oldOffset + oldLength);
                }

                this.updateChildOffsets(existingIndex);
            }

            let beforeIndex = this.children.indexOf(before as TextContentChild);
            const insertIndex = beforeIndex !== -1 ? beforeIndex : this.children.length;

            let offset = 0;
            for (let i = 0; i < insertIndex; i++) {
                const c = this.children[i];
                if (c) offset += c.getLength();
            }

            this.children.splice(insertIndex, 0, child as TextContentChild);
            (child as TextContentChild).bufferOffset = offset;
            this.setChildParent(child as TextContentChild);

            if (this.buffer) {
                if (child instanceof TextSegmentNode) {
                    this.insertTextAtOffset(child.getText(), offset);
                } else if (child instanceof TextTagNode) {
                    const text = child.getText();
                    this.insertTextAtOffset(text, offset);
                    if (!child.hasBuffer()) {
                        child.setBuffer(this.buffer);
                    }
                } else if (child instanceof TextAnchorNode && this.textView) {
                    child.setTextViewAndBuffer(this.textView, this.buffer);
                }
            }

            this.updateChildOffsets(0);
            this.reapplyTagsFromOffset(0);
            return;
        }
        super.insertBefore(child, before);
    }

    private isTextContentChild(child: Node): child is TextContentChild {
        return child instanceof TextSegmentNode || child instanceof TextTagNode || child instanceof TextAnchorNode;
    }

    private setChildParent(child: TextContentChild): void {
        if (child instanceof TextSegmentNode || child instanceof TextTagNode) {
            child.setParent(this);
        }
    }

    private getBufferText(): string {
        const buffer = this.buffer;
        if (!buffer) return "";

        const startIter = new Gtk.TextIter();
        const endIter = new Gtk.TextIter();

        batch(() => {
            buffer.getStartIter(startIter);
            buffer.getEndIter(endIter);
        });

        return buffer.getText(startIter, endIter, true);
    }

    private updateSignalHandlers(): void {
        if (!this.buffer) return;

        const buffer = this.buffer;
        const { onTextChanged, onCanUndoChanged, onCanRedoChanged } = this.props;

        signalStore.set(this, buffer, "changed", onTextChanged ? () => onTextChanged(this.getBufferText()) : null);

        signalStore.set(
            this,
            buffer,
            "notify::can-undo",
            onCanUndoChanged ? () => onCanUndoChanged(buffer.getCanUndo()) : null,
        );

        signalStore.set(
            this,
            buffer,
            "notify::can-redo",
            onCanRedoChanged ? () => onCanRedoChanged(buffer.getCanRedo()) : null,
        );
    }

    public override updateProps(oldProps: TextBufferProps | null, newProps: TextBufferProps): void {
        super.updateProps(oldProps, newProps);

        if (!this.buffer) return;

        if (oldProps?.enableUndo !== newProps.enableUndo) {
            if (newProps.enableUndo !== undefined) {
                this.buffer.setEnableUndo(newProps.enableUndo);
            }
        }

        if (
            oldProps?.onTextChanged !== newProps.onTextChanged ||
            oldProps?.onCanUndoChanged !== newProps.onCanUndoChanged ||
            oldProps?.onCanRedoChanged !== newProps.onCanRedoChanged
        ) {
            this.updateSignalHandlers();
        }
    }

    public override unmount(): void {
        this.children = [];
        this.buffer = undefined;
        this.textView = undefined;
        super.unmount();
    }
}

registerNodeClass(TextBufferNode);
