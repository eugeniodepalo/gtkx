import { css } from "@gtkx/css";
import { beginBatch, endBatch } from "@gtkx/ffi";
import * as GObject from "@gtkx/ffi/gobject";
import * as Gtk from "@gtkx/ffi/gtk";
import {
    GtkBox,
    GtkButton,
    GtkCheckButton,
    GtkEntry,
    GtkFrame,
    GtkLabel,
    GtkPaned,
    GtkScale,
    GtkScrolledWindow,
    GtkTextView,
    x,
} from "@gtkx/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Demo } from "../types.js";
import sourceCode from "./textview.tsx?raw";

const editorStyle = css`
    font-size: 14px;
`;

const SAMPLE_RICH_TEXT = `Rich Text Formatting

This text demonstrates various formatting options available in GtkTextView using GtkTextTag.

Bold text shows emphasis.
Italic text for titles or emphasis.
Underlined text for links.
Strikethrough for deleted content.

Colors: This text is red. This text is blue. This text is green.

Sizes: Small text, Normal text, Large text, Extra large text.

Combined: Bold and italic together.

Monospace: code_example();

This text has a yellow background highlight.

Superscript: E=mc² and Subscript: H₂O

The formatting is applied using GtkTextTag objects stored in the buffer's tag table.`;

const getBufferText = (buffer: Gtk.TextBuffer): string => {
    beginBatch();
    const startIter = new Gtk.TextIter();
    const endIter = new Gtk.TextIter();
    buffer.getStartIter(startIter);
    buffer.getEndIter(endIter);
    endBatch();
    return buffer.getText(startIter, endIter, true);
};

const TextViewDemo = () => {
    const textView1Ref = useRef<Gtk.TextView | null>(null);
    const textView2Ref = useRef<Gtk.TextView | null>(null);
    const sharedBufferRef = useRef<Gtk.TextBuffer | null>(null);
    const tagsCreatedRef = useRef(false);
    const handlerIdRef = useRef<number | null>(null);

    const [charCount, setCharCount] = useState(0);
    const [wordCount, setWordCount] = useState(0);
    const [lineCount, setLineCount] = useState(1);
    const [syncEnabled, setSyncEnabled] = useState(true);

    const handleBufferChanged = useCallback((buffer: Gtk.TextBuffer) => {
        const text = getBufferText(buffer);
        setCharCount(text.length);
        const words = text
            .trim()
            .split(/\s+/)
            .filter((w) => w.length > 0);
        setWordCount(words.length);
        setLineCount(buffer.getLineCount());
    }, []);

    const createTags = useCallback((buffer: Gtk.TextBuffer) => {
        if (tagsCreatedRef.current) return;
        tagsCreatedRef.current = true;

        const tagTable = buffer.getTagTable();

        const boldTag = new Gtk.TextTag("bold");
        const italicTag = new Gtk.TextTag("italic");
        const underlineTag = new Gtk.TextTag("underline");
        const strikeTag = new Gtk.TextTag("strikethrough");
        const redTag = new Gtk.TextTag("red");
        const blueTag = new Gtk.TextTag("blue");
        const greenTag = new Gtk.TextTag("green");
        const smallTag = new Gtk.TextTag("small");
        const largeTag = new Gtk.TextTag("large");
        const xlargeTag = new Gtk.TextTag("xlarge");
        const monoTag = new Gtk.TextTag("monospace");
        const highlightTag = new Gtk.TextTag("highlight");
        const superTag = new Gtk.TextTag("superscript");
        const subTag = new Gtk.TextTag("subscript");

        tagTable.add(boldTag);
        tagTable.add(italicTag);
        tagTable.add(underlineTag);
        tagTable.add(strikeTag);
        tagTable.add(redTag);
        tagTable.add(blueTag);
        tagTable.add(greenTag);
        tagTable.add(smallTag);
        tagTable.add(largeTag);
        tagTable.add(xlargeTag);
        tagTable.add(monoTag);
        tagTable.add(highlightTag);
        tagTable.add(superTag);
        tagTable.add(subTag);
    }, []);

    const applyFormatting = useCallback((buffer: Gtk.TextBuffer) => {
        const tagTable = buffer.getTagTable();

        const applyTag = (tagName: string, searchText: string) => {
            const tag = tagTable.lookup(tagName);
            if (!tag) return;

            const text = getBufferText(buffer);
            const index = text.indexOf(searchText);
            if (index === -1) return;

            const startIter = new Gtk.TextIter();
            const endIter = new Gtk.TextIter();
            buffer.getIterAtOffset(startIter, index);
            buffer.getIterAtOffset(endIter, index + searchText.length);
            buffer.applyTag(tag, startIter, endIter);
        };

        beginBatch();
        applyTag("bold", "Bold text");
        applyTag("italic", "Italic text");
        applyTag("underline", "Underlined text");
        applyTag("strikethrough", "Strikethrough");
        applyTag("red", "This text is red.");
        applyTag("blue", "This text is blue.");
        applyTag("green", "This text is green.");
        applyTag("small", "Small text");
        applyTag("large", "Large text");
        applyTag("xlarge", "Extra large text");
        applyTag("bold", "Bold and italic");
        applyTag("italic", "Bold and italic");
        applyTag("monospace", "code_example();");
        applyTag("highlight", "yellow background highlight");
        applyTag("superscript", "²");
        applyTag("subscript", "₂");
        endBatch();
    }, []);

    useEffect(() => {
        const textView1 = textView1Ref.current;
        if (!textView1) return;

        const buffer = textView1.getBuffer();
        if (!buffer) return;

        sharedBufferRef.current = buffer;
        createTags(buffer);
        buffer.setText(SAMPLE_RICH_TEXT, -1);
        applyFormatting(buffer);
        handleBufferChanged(buffer);

        handlerIdRef.current = buffer.connect("changed", () => handleBufferChanged(buffer));

        return () => {
            if (handlerIdRef.current !== null && sharedBufferRef.current) {
                GObject.signalHandlerDisconnect(sharedBufferRef.current, handlerIdRef.current);
                handlerIdRef.current = null;
            }
        };
    }, [createTags, applyFormatting, handleBufferChanged]);

    useEffect(() => {
        const textView2 = textView2Ref.current;
        if (!textView2 || !sharedBufferRef.current || !syncEnabled) return;

        textView2.setBuffer(sharedBufferRef.current);
    }, [syncEnabled]);

    const handleClear = useCallback(() => {
        const buffer = sharedBufferRef.current;
        if (buffer) buffer.setText("", 0);
    }, []);

    const handleInsertSample = useCallback(() => {
        const buffer = sharedBufferRef.current;
        if (buffer) {
            buffer.setText(SAMPLE_RICH_TEXT, -1);
            applyFormatting(buffer);
        }
    }, [applyFormatting]);

    return (
        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={20} marginStart={20} marginEnd={20} marginTop={20}>
            <GtkLabel label="TextView" cssClasses={["title-2"]} halign={Gtk.Align.START} />

            <GtkLabel
                label="GtkTextView provides a powerful multi-line text editing widget. This demo shows shared buffers between multiple views, rich text formatting with tags, and live statistics."
                wrap
                halign={Gtk.Align.START}
                cssClasses={["dim-label"]}
            />

            <GtkFrame label="Shared Buffer - Two Views">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={12}
                    marginStart={16}
                    marginEnd={16}
                    marginTop={16}
                    marginBottom={16}
                >
                    <GtkLabel
                        label="Both text views share the same GtkTextBuffer. Edits in one view appear instantly in the other. This is useful for split-view editors."
                        wrap
                        halign={Gtk.Align.START}
                        cssClasses={["dim-label"]}
                    />

                    <GtkBox spacing={8}>
                        <GtkButton label="Insert Sample" onClicked={handleInsertSample} />
                        <GtkButton label="Clear" onClicked={handleClear} />
                        <GtkCheckButton
                            label="Sync views"
                            active={syncEnabled}
                            onToggled={(btn) => setSyncEnabled(btn.getActive())}
                        />
                    </GtkBox>

                    <GtkPaned orientation={Gtk.Orientation.HORIZONTAL} shrinkStartChild={false} shrinkEndChild={false}>
                        <GtkFrame>
                            <GtkScrolledWindow minContentHeight={200} minContentWidth={250}>
                                <GtkTextView
                                    ref={textView1Ref}
                                    leftMargin={12}
                                    rightMargin={12}
                                    topMargin={12}
                                    bottomMargin={12}
                                    wrapMode={Gtk.WrapMode.WORD_CHAR}
                                    cssClasses={[editorStyle]}
                                >
                                    <x.TextBuffer />
                                </GtkTextView>
                            </GtkScrolledWindow>
                        </GtkFrame>
                        <GtkFrame>
                            <GtkScrolledWindow minContentHeight={200} minContentWidth={250}>
                                <GtkTextView
                                    ref={textView2Ref}
                                    leftMargin={12}
                                    rightMargin={12}
                                    topMargin={12}
                                    bottomMargin={12}
                                    wrapMode={Gtk.WrapMode.WORD_CHAR}
                                    cssClasses={[editorStyle]}
                                />
                            </GtkScrolledWindow>
                        </GtkFrame>
                    </GtkPaned>

                    <GtkBox spacing={16}>
                        <GtkLabel label={`Characters: ${charCount}`} cssClasses={["dim-label", "monospace"]} />
                        <GtkLabel label={`Words: ${wordCount}`} cssClasses={["dim-label", "monospace"]} />
                        <GtkLabel label={`Lines: ${lineCount}`} cssClasses={["dim-label", "monospace"]} />
                    </GtkBox>
                </GtkBox>
            </GtkFrame>

            <GtkFrame label="Rich Text Tags">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={12}
                    marginStart={16}
                    marginEnd={16}
                    marginTop={16}
                    marginBottom={16}
                >
                    <GtkLabel
                        label="GtkTextTag objects apply formatting to text ranges. Tags can control appearance (fonts, colors, sizes) and behavior."
                        wrap
                        halign={Gtk.Align.START}
                        cssClasses={["dim-label"]}
                    />

                    <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={6}>
                        <GtkBox spacing={12}>
                            <GtkLabel label="weight" widthChars={12} xalign={0} cssClasses={["monospace"]} />
                            <GtkLabel label="Bold text (PANGO_WEIGHT_BOLD)" cssClasses={["dim-label"]} />
                        </GtkBox>
                        <GtkBox spacing={12}>
                            <GtkLabel label="style" widthChars={12} xalign={0} cssClasses={["monospace"]} />
                            <GtkLabel label="Italic text (PANGO_STYLE_ITALIC)" cssClasses={["dim-label"]} />
                        </GtkBox>
                        <GtkBox spacing={12}>
                            <GtkLabel label="underline" widthChars={12} xalign={0} cssClasses={["monospace"]} />
                            <GtkLabel label="Single, double, or wavy underlines" cssClasses={["dim-label"]} />
                        </GtkBox>
                        <GtkBox spacing={12}>
                            <GtkLabel label="strikethrough" widthChars={12} xalign={0} cssClasses={["monospace"]} />
                            <GtkLabel label="Strikethrough text" cssClasses={["dim-label"]} />
                        </GtkBox>
                        <GtkBox spacing={12}>
                            <GtkLabel label="foreground" widthChars={12} xalign={0} cssClasses={["monospace"]} />
                            <GtkLabel label="Text color (red, blue, etc.)" cssClasses={["dim-label"]} />
                        </GtkBox>
                        <GtkBox spacing={12}>
                            <GtkLabel label="background" widthChars={12} xalign={0} cssClasses={["monospace"]} />
                            <GtkLabel label="Highlight color" cssClasses={["dim-label"]} />
                        </GtkBox>
                        <GtkBox spacing={12}>
                            <GtkLabel label="scale" widthChars={12} xalign={0} cssClasses={["monospace"]} />
                            <GtkLabel label="Font size multiplier" cssClasses={["dim-label"]} />
                        </GtkBox>
                        <GtkBox spacing={12}>
                            <GtkLabel label="rise" widthChars={12} xalign={0} cssClasses={["monospace"]} />
                            <GtkLabel label="Superscript/subscript offset" cssClasses={["dim-label"]} />
                        </GtkBox>
                    </GtkBox>
                </GtkBox>
            </GtkFrame>

            <GtkFrame label="Embedded Widgets">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={12}
                    marginStart={16}
                    marginEnd={16}
                    marginTop={16}
                    marginBottom={16}
                >
                    <GtkLabel
                        label="Widgets can be embedded within text using GtkTextChildAnchor. The widgets flow with the text content."
                        wrap
                        halign={Gtk.Align.START}
                        cssClasses={["dim-label"]}
                    />

                    <GtkBox spacing={12}>
                        <GtkLabel label="Example widgets that could be embedded:" cssClasses={["dim-label"]} />
                    </GtkBox>

                    <GtkBox spacing={12}>
                        <GtkButton label="Button" cssClasses={["flat"]} />
                        <GtkEntry placeholderText="Entry field" widthChars={15} />
                        <GtkScale orientation={Gtk.Orientation.HORIZONTAL} widthRequest={100}>
                            <x.Adjustment value={50} lower={0} upper={100} stepIncrement={1} pageIncrement={10} />
                        </GtkScale>
                        <GtkCheckButton label="Check" />
                    </GtkBox>

                    <GtkLabel
                        label="Use buffer.createChildAnchor() and textView.addChildAtAnchor() to embed widgets."
                        wrap
                        halign={Gtk.Align.START}
                        cssClasses={["dim-label", "caption", "monospace"]}
                    />
                </GtkBox>
            </GtkFrame>

            <GtkFrame label="Text Wrapping Modes">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={12}
                    marginStart={16}
                    marginEnd={16}
                    marginTop={16}
                    marginBottom={16}
                >
                    <GtkLabel
                        label="GtkTextView supports different wrapping modes for handling long lines."
                        wrap
                        halign={Gtk.Align.START}
                        cssClasses={["dim-label"]}
                    />

                    <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={6}>
                        <GtkBox spacing={12}>
                            <GtkLabel label="WRAP_NONE" widthChars={14} xalign={0} cssClasses={["monospace"]} />
                            <GtkLabel label="No wrapping, horizontal scrolling" cssClasses={["dim-label"]} />
                        </GtkBox>
                        <GtkBox spacing={12}>
                            <GtkLabel label="WRAP_CHAR" widthChars={14} xalign={0} cssClasses={["monospace"]} />
                            <GtkLabel label="Break at any character" cssClasses={["dim-label"]} />
                        </GtkBox>
                        <GtkBox spacing={12}>
                            <GtkLabel label="WRAP_WORD" widthChars={14} xalign={0} cssClasses={["monospace"]} />
                            <GtkLabel label="Break at word boundaries" cssClasses={["dim-label"]} />
                        </GtkBox>
                        <GtkBox spacing={12}>
                            <GtkLabel label="WRAP_WORD_CHAR" widthChars={14} xalign={0} cssClasses={["monospace"]} />
                            <GtkLabel label="Word boundaries, fall back to char" cssClasses={["dim-label"]} />
                        </GtkBox>
                    </GtkBox>
                </GtkBox>
            </GtkFrame>

            <GtkFrame label="Monospace Code Editor">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={8}
                    marginStart={16}
                    marginEnd={16}
                    marginTop={16}
                    marginBottom={16}
                >
                    <GtkLabel
                        label="Use the monospace property for code editing scenarios."
                        wrap
                        halign={Gtk.Align.START}
                        cssClasses={["dim-label"]}
                    />
                    <GtkScrolledWindow minContentHeight={80}>
                        <GtkTextView
                            monospace
                            leftMargin={12}
                            rightMargin={12}
                            topMargin={8}
                            bottomMargin={8}
                            wrapMode={Gtk.WrapMode.NONE}
                            cssClasses={["card"]}
                        />
                    </GtkScrolledWindow>
                </GtkBox>
            </GtkFrame>
        </GtkBox>
    );
};

export const textviewDemo: Demo = {
    id: "textview",
    title: "Text View/Multiple Views",
    description: "Shared buffer between views, rich text tags, and embedded widgets",
    keywords: [
        "textview",
        "text",
        "editor",
        "multiline",
        "GtkTextView",
        "buffer",
        "shared",
        "tag",
        "formatting",
        "rich",
        "widget",
        "embed",
    ],
    component: TextViewDemo,
    sourceCode,
};
