import type * as Gtk from "@gtkx/ffi/gtk";
import type * as Pango from "@gtkx/ffi/pango";
import { hasChanged } from "./utils.js";

export type TagStyleProps = {
    background?: string;
    backgroundFullHeight?: boolean;
    foreground?: string;
    family?: string;
    font?: string;
    sizePoints?: number;
    size?: number;
    scale?: number;
    weight?: Pango.Weight | number;
    style?: Pango.Style;
    stretch?: Pango.Stretch;
    variant?: Pango.Variant;
    strikethrough?: boolean;
    underline?: Pango.Underline;
    overline?: Pango.Overline;
    rise?: number;
    letterSpacing?: number;
    lineHeight?: number;
    leftMargin?: number;
    rightMargin?: number;
    indent?: number;
    pixelsAboveLines?: number;
    pixelsBelowLines?: number;
    pixelsInsideWrap?: number;
    justification?: Gtk.Justification;
    direction?: Gtk.TextDirection;
    wrapMode?: Gtk.WrapMode;
    editable?: boolean;
    invisible?: boolean;
    allowBreaks?: boolean;
    insertHyphens?: boolean;
    fallback?: boolean;
    accumulativeMargin?: boolean;
    paragraphBackground?: string;
    showSpaces?: Pango.ShowFlags;
    textTransform?: Pango.TextTransform;
    fontFeatures?: string;
    language?: string;
};

const STYLE_PROPS: Record<keyof TagStyleProps, keyof Gtk.TextTag> = {
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

export function applyStyleChanges(tag: Gtk.TextTag, oldProps: TagStyleProps | null, newProps: TagStyleProps): void {
    for (const prop of Object.keys(STYLE_PROPS) as (keyof TagStyleProps)[]) {
        if (hasChanged(oldProps, newProps, prop)) {
            const value = newProps[prop];
            if (value !== undefined) {
                const setter = tag[STYLE_PROPS[prop]] as (value: unknown) => void;
                setter.call(tag, value);
            }
        }
    }
}
