import * as Gtk from "@gtkx/ffi/gtk";
import type { TextTagProps } from "../jsx.js";
import type { Node } from "../node.js";
import { hasChanged } from "./internal/props.js";
import { TextAnchorNode } from "./text-anchor.js";
import type { TextContentChild, TextContentParent } from "./text-content.js";
import { TextSegmentNode } from "./text-segment.js";
import { VirtualNode } from "./virtual.js";

const STYLE_PROPS: Partial<Record<keyof TextTagProps, keyof Gtk.TextTag>> = {
    background: "setBackground",
    backgroundFullHeight: "setBackgroundFullHeight",
    foreground: "setForeground",
    family: "setFamily",
    font: "setFont",
    sizePoints: "setSizePoints",
    size: "setSize",
    scale: "setScale",
    weight: "setWeight",
    style: "setStyle",
    stretch: "setStretch",
    variant: "setVariant",
    strikethrough: "setStrikethrough",
    underline: "setUnderline",
    overline: "setOverline",
    rise: "setRise",
    letterSpacing: "setLetterSpacing",
    lineHeight: "setLineHeight",
    leftMargin: "setLeftMargin",
    rightMargin: "setRightMargin",
    indent: "setIndent",
    pixelsAboveLines: "setPixelsAboveLines",
    pixelsBelowLines: "setPixelsBelowLines",
    pixelsInsideWrap: "setPixelsInsideWrap",
    justification: "setJustification",
    direction: "setDirection",
    wrapMode: "setWrapMode",
    editable: "setEditable",
    invisible: "setInvisible",
    allowBreaks: "setAllowBreaks",
    insertHyphens: "setInsertHyphens",
    fallback: "setFallback",
    accumulativeMargin: "setAccumulativeMargin",
    paragraphBackground: "setParagraphBackground",
    showSpaces: "setShowSpaces",
    textTransform: "setTextTransform",
    fontFeatures: "setFontFeatures",
    language: "setLanguage",
};

export class TextTagNode extends VirtualNode<TextTagProps, Node, TextContentChild> implements TextContentParent {
    private buffer: Gtk.TextBuffer | null = null;
    private tag: Gtk.TextTag | null = null;
    private contentChildren: TextContentChild[] = [];
    private contentParent: TextContentParent | null = null;

    private bufferOffset = 0;

    public getBufferOffset(): number {
        return this.bufferOffset;
    }

    public setBufferOffset(offset: number): void {
        this.bufferOffset = offset;
    }

    public override isValidChild(child: Node): boolean {
        return this.isTextContentChild(child);
    }

    public override appendChild(child: TextContentChild): void {
        super.appendChild(child);
        const index = this.contentChildren.length;
        this.contentChildren.push(child);
        this.setChildContentParent(child);

        if (child instanceof TextTagNode && this.buffer) {
            child.setBuffer(this.buffer);
        }

        this.updateChildOffsets(index);
        this.contentParent?.onChildInserted(child);
    }

    public override removeChild(child: TextContentChild): void {
        const index = this.contentChildren.indexOf(child);
        if (index !== -1) {
            this.contentChildren.splice(index, 1);
            this.updateChildOffsets(index);
            this.contentParent?.onChildRemoved(child);
        }
        super.removeChild(child);
    }

    public override insertBefore(child: TextContentChild, before: TextContentChild): void {
        super.insertBefore(child, before);
        const beforeIndex = this.contentChildren.indexOf(before);
        const insertIndex = beforeIndex !== -1 ? beforeIndex : this.contentChildren.length;

        this.contentChildren.splice(insertIndex, 0, child);
        this.setChildContentParent(child);

        if (child instanceof TextTagNode && this.buffer) {
            child.setBuffer(this.buffer);
        }

        this.updateChildOffsets(insertIndex);
        this.contentParent?.onChildInserted(child);
    }

    public override commitUpdate(oldProps: TextTagProps | null, newProps: TextTagProps): void {
        super.commitUpdate(oldProps, newProps);
        this.applyOwnProps(oldProps, newProps);
    }

    public override detachDeletedInstance(): void {
        if (this.buffer && this.tag) {
            this.removeTagFromBuffer();
            const tagTable = this.buffer.getTagTable();
            tagTable.remove(this.tag);
        }
        this.tag = null;
        this.buffer = null;
        this.contentChildren = [];
        super.detachDeletedInstance();
    }

    public setContentParent(parent: TextContentParent): void {
        this.contentParent = parent;
    }

    public setBuffer(buffer: Gtk.TextBuffer): void {
        this.buffer = buffer;
        this.updateChildOffsets(0);
        this.setupTag();

        for (const child of this.contentChildren) {
            if (child instanceof TextTagNode) {
                child.setBuffer(buffer);
            }
        }
    }

    public hasBuffer(): boolean {
        return this.buffer !== null;
    }

    public getText(): string {
        let text = "";
        for (const child of this.contentChildren) {
            text += child.getText();
        }
        return text;
    }

    public getLength(): number {
        let length = 0;
        for (const child of this.contentChildren) {
            length += child.getLength();
        }
        return length;
    }

    public getChildren(): TextContentChild[] {
        return this.contentChildren;
    }

    public reapplyTag(): void {
        if (!this.buffer || !this.tag) return;
        this.removeTagFromBuffer();
        this.applyTagToRange();
    }

    public onChildInserted(child: TextContentChild): void {
        const index = this.contentChildren.indexOf(child);
        if (index !== -1) {
            this.updateChildOffsets(index);
        }

        this.contentParent?.onChildInserted(child);
    }

    public onChildRemoved(child: TextContentChild): void {
        this.contentParent?.onChildRemoved(child);
    }

    public onChildTextChanged(child: TextSegmentNode, oldLength: number, newLength: number): void {
        const index = this.contentChildren.indexOf(child);
        if (index !== -1) {
            this.updateChildOffsets(index + 1);
        }

        this.contentParent?.onChildTextChanged(child, oldLength, newLength);
    }

    private setupTag(): void {
        if (!this.buffer) return;

        const tagTable = this.buffer.getTagTable();
        this.tag = new Gtk.TextTag(this.props.id);

        this.applyStyleProps(null, this.props);
        tagTable.add(this.tag);

        if (this.props.priority !== undefined) {
            this.tag.setPriority(this.props.priority);
        }

        this.applyTagToRange();
    }

    private applyOwnProps(oldProps: TextTagProps | null, newProps: TextTagProps): void {
        if (oldProps && oldProps.id !== newProps.id) {
            throw new Error("TextTag id cannot be changed after creation");
        }

        if (!this.tag) return;

        this.applyStyleProps(oldProps, newProps);

        if (hasChanged(oldProps, newProps, "priority") && newProps.priority !== undefined) {
            this.tag.setPriority(newProps.priority);
        }
    }

    private applyStyleProps(oldProps: TextTagProps | null, newProps: TextTagProps): void {
        if (!this.tag) return;
        for (const prop of Object.keys(STYLE_PROPS) as (keyof TextTagProps)[]) {
            if (hasChanged(oldProps, newProps, prop)) {
                const value = newProps[prop];
                const method = STYLE_PROPS[prop];
                if (value !== undefined && method) {
                    const setter = this.tag[method] as (value: unknown) => void;
                    setter.call(this.tag, value);
                }
            }
        }
    }

    private applyTagToRange(): void {
        const buffer = this.buffer;
        const tag = this.tag;
        if (!buffer || !tag) return;

        const length = this.getLength();
        if (length === 0) return;

        const startIter = new Gtk.TextIter();
        const endIter = new Gtk.TextIter();

        buffer.getIterAtOffset(startIter, this.bufferOffset);
        buffer.getIterAtOffset(endIter, this.bufferOffset + length);

        buffer.applyTag(tag, startIter, endIter);
    }

    private removeTagFromBuffer(): void {
        const buffer = this.buffer;
        const tag = this.tag;
        if (!buffer || !tag) return;

        const startIter = new Gtk.TextIter();
        const endIter = new Gtk.TextIter();

        buffer.getStartIter(startIter);
        buffer.getEndIter(endIter);

        buffer.removeTag(tag, startIter, endIter);
    }

    private updateChildOffsets(startIndex: number): void {
        let offset = this.bufferOffset;

        for (let i = 0; i < startIndex; i++) {
            const child = this.contentChildren[i];
            if (child) offset += child.getLength();
        }

        for (let i = startIndex; i < this.contentChildren.length; i++) {
            const child = this.contentChildren[i];
            if (child) {
                child.setBufferOffset(offset);
                offset += child.getLength();
            }
        }
    }

    private isTextContentChild(child: Node): child is TextContentChild {
        return child instanceof TextSegmentNode || child instanceof TextTagNode || child instanceof TextAnchorNode;
    }

    private setChildContentParent(child: TextContentChild): void {
        if (child instanceof TextSegmentNode || child instanceof TextTagNode) {
            child.setContentParent(this);
        }
    }
}
