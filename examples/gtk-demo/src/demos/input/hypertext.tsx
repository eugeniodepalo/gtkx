import { css } from "@gtkx/css";
import { beginBatch, endBatch } from "@gtkx/ffi";
import * as Gdk from "@gtkx/ffi/gdk";
import * as Gtk from "@gtkx/ffi/gtk";
import {
    GtkBox,
    GtkButton,
    GtkFrame,
    GtkImage,
    GtkLabel,
    GtkLevelBar,
    GtkScrolledWindow,
    GtkTextView,
    x,
} from "@gtkx/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Demo } from "../types.js";
import sourceCode from "./hypertext.tsx?raw";

const hypertextViewStyle = css`
    font-size: 14px;
    padding: 16px;

    &:focus {
        outline: none;
    }
`;

interface PageContent {
    title: string;
    content: string;
    links: { text: string; target: string; start: number; end: number }[];
    widgets?: { type: "levelbar" | "button" | "image"; position: number; props?: Record<string, unknown> }[];
}

const PAGES: Record<string, PageContent> = {
    home: {
        title: "Welcome",
        content: `Welcome to the Hypertext Demo!

This demo shows how GtkTextView can display rich content with clickable hypertext links and embedded widgets.

Click on any link to navigate:
• Learn about Tags
• Learn about Hypertext
• View the Widget Gallery

Below is an embedded progress indicator:
[WIDGET]

This demo also supports:
• Cursor changes on hover
• Keyboard navigation (Enter to follow links)
• History navigation (Back button)`,
        links: [
            { text: "Tags", target: "tags", start: 165, end: 169 },
            { text: "Hypertext", target: "hypertext", start: 186, end: 195 },
            { text: "Widget Gallery", target: "widgets", start: 212, end: 226 },
        ],
        widgets: [{ type: "levelbar", position: 283, props: { value: 0.7 } }],
    },
    tags: {
        title: "Tags",
        content: `Tags

/tæɡz/ • noun

An attribute that can be applied to some range of text. Tags can affect the appearance of text (colors, fonts, sizes) and also attach arbitrary data.

In GTK, GtkTextTag objects are used to:
• Apply formatting (bold, italic, underline)
• Set colors and backgrounds
• Control text size and font family
• Attach custom data for links

Example uses:
• Syntax highlighting in code editors
• Rich text formatting in word processors
• Clickable links in help browsers

← Go back to the home page`,
        links: [{ text: "home page", target: "home", start: 480, end: 489 }],
    },
    hypertext: {
        title: "Hypertext",
        content: `Hypertext

/ˈhaɪpərˌtekst/ • noun

Machine-readable text that is not sequential but is organized so that related items of information are connected.

Key characteristics:
• Non-linear navigation
• Links between documents
• Interactive content
• Embedded media

The World Wide Web is the most famous example of hypertext, using HTML (HyperText Markup Language) to create linked documents.

GTK implements hypertext through:
• GtkTextTag for link styling
• GtkTextBuffer for content
• Event handlers for interaction

← Go back to the home page`,
        links: [{ text: "home page", target: "home", start: 515, end: 524 }],
    },
    widgets: {
        title: "Widget Gallery",
        content: `Widget Gallery

GtkTextView can embed arbitrary widgets using GtkTextChildAnchor. This allows for rich interactive content within text.

Progress indicator: [WIDGET:levelbar]

This is useful for:
• Interactive tutorials
• Form elements in rich text
• Status indicators
• Custom decorations

Widgets are anchored to specific positions in the text buffer and move with the surrounding text as it reflows.

← Go back to the home page`,
        links: [{ text: "home page", target: "home", start: 400, end: 409 }],
        widgets: [{ type: "levelbar", position: 119, props: { value: 0.5 } }],
    },
};

const HypertextDemo = () => {
    const [currentPage, setCurrentPage] = useState("home");
    const [history, setHistory] = useState<string[]>([]);
    const [hoveredLink, setHoveredLink] = useState<string | null>(null);
    const [cursor, setCursor] = useState(() => new Gdk.Cursor("text"));
    const textViewRef = useRef<Gtk.TextView | null>(null);
    const bufferRef = useRef<Gtk.TextBuffer | null>(null);
    const linkTagRef = useRef<Gtk.TextTag | null>(null);
    const currentLinksRef = useRef<PageContent["links"]>([]);

    const navigateTo = useCallback(
        (pageId: string) => {
            if (PAGES[pageId] && pageId !== currentPage) {
                setHistory((prev) => [...prev, currentPage]);
                setCurrentPage(pageId);
            }
        },
        [currentPage],
    );

    const goBack = useCallback(() => {
        if (history.length > 0) {
            const previousPage = history[history.length - 1];
            setHistory((prev) => prev.slice(0, -1));
            if (previousPage) {
                setCurrentPage(previousPage);
            }
        }
    }, [history]);

    const setupPage = useCallback(() => {
        const textView = textViewRef.current;
        if (!textView) return;

        const buffer = textView.getBuffer();
        if (!buffer) return;

        bufferRef.current = buffer;
        const page = PAGES[currentPage];
        if (!page) return;

        currentLinksRef.current = page.links;

        if (!linkTagRef.current) {
            linkTagRef.current = new Gtk.TextTag("link");
            const tagTable = buffer.getTagTable();
            tagTable.add(linkTagRef.current);
        }

        buffer.setText(page.content, -1);

        beginBatch();
        for (const link of page.links) {
            const startIter = new Gtk.TextIter();
            const endIter = new Gtk.TextIter();
            buffer.getIterAtOffset(startIter, link.start);
            buffer.getIterAtOffset(endIter, link.end);
            buffer.applyTag(linkTagRef.current, startIter, endIter);
        }
        endBatch();
    }, [currentPage]);

    useEffect(() => {
        setupPage();
    }, [setupPage]);

    const findLinkAtPosition = useCallback((offset: number): PageContent["links"][0] | null => {
        for (const link of currentLinksRef.current) {
            if (offset >= link.start && offset < link.end) {
                return link;
            }
        }
        return null;
    }, []);

    const getBufferPosition = useCallback((x: number, y: number): number | null => {
        const textView = textViewRef.current;
        if (!textView) return null;

        const iter = new Gtk.TextIter();
        const result = textView.getIterAtPosition(iter, x, y);
        if (!result) return null;

        return iter.getOffset();
    }, []);

    const handleMotion = useCallback(
        (x: number, y: number) => {
            const offset = getBufferPosition(x, y);
            if (offset === null) {
                setHoveredLink(null);
                setCursor(new Gdk.Cursor("text"));
                return;
            }

            const link = findLinkAtPosition(offset);
            if (link) {
                setHoveredLink(link.text);
                setCursor(new Gdk.Cursor("pointer"));
            } else {
                setHoveredLink(null);
                setCursor(new Gdk.Cursor("text"));
            }
        },
        [getBufferPosition, findLinkAtPosition],
    );

    const handleClick = useCallback(
        (_nPress: number, x: number, y: number) => {
            const offset = getBufferPosition(x, y);
            if (offset === null) return;

            const link = findLinkAtPosition(offset);
            if (link) {
                navigateTo(link.target);
            }
        },
        [getBufferPosition, findLinkAtPosition, navigateTo],
    );

    const page = PAGES[currentPage];

    return (
        <GtkBox
            orientation={Gtk.Orientation.VERTICAL}
            spacing={20}
            marginStart={20}
            marginEnd={20}
            marginTop={20}
            marginBottom={20}
        >
            <GtkBox spacing={12}>
                <GtkLabel label="Hypertext" cssClasses={["title-2"]} halign={Gtk.Align.START} hexpand />
                <GtkButton
                    onClicked={goBack}
                    sensitive={history.length > 0}
                    cssClasses={["flat"]}
                    tooltipText="Go back"
                >
                    <GtkBox spacing={6}>
                        <GtkImage iconName="go-previous-symbolic" />
                        <GtkLabel label="Back" />
                    </GtkBox>
                </GtkButton>
            </GtkBox>

            <GtkLabel
                label="GtkTextView supports rich content with clickable hypertext links. Navigate between pages by clicking links or use the Back button to return to previous pages."
                wrap
                halign={Gtk.Align.START}
                cssClasses={["dim-label"]}
            />

            <GtkFrame label={page?.title ?? "Page"}>
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={12}
                    marginStart={16}
                    marginEnd={16}
                    marginTop={16}
                    marginBottom={16}
                >
                    <GtkScrolledWindow minContentHeight={300} cssClasses={["card"]}>
                        <GtkTextView
                            ref={textViewRef}
                            editable={false}
                            cursorVisible={false}
                            cursor={cursor}
                            wrapMode={Gtk.WrapMode.WORD}
                            cssClasses={[hypertextViewStyle]}
                            onMotion={handleMotion}
                            onPressed={handleClick}
                        >
                            <x.TextBuffer />
                        </GtkTextView>
                    </GtkScrolledWindow>

                    <GtkBox spacing={12}>
                        <GtkLabel label="Hovered:" cssClasses={["dim-label"]} />
                        <GtkLabel
                            label={hoveredLink ?? "None"}
                            cssClasses={hoveredLink ? ["heading"] : ["dim-label"]}
                            hexpand
                        />
                    </GtkBox>
                </GtkBox>
            </GtkFrame>

            <GtkFrame label="Embedded Widget Demo">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={12}
                    marginStart={16}
                    marginEnd={16}
                    marginTop={16}
                    marginBottom={16}
                >
                    <GtkLabel
                        label="GtkTextView can embed widgets using GtkTextChildAnchor. Here's a standalone example:"
                        wrap
                        halign={Gtk.Align.START}
                        cssClasses={["dim-label"]}
                    />
                    <GtkBox spacing={12}>
                        <GtkLabel label="Progress:" />
                        <GtkLevelBar value={0.65} minValue={0} maxValue={1} hexpand />
                    </GtkBox>
                </GtkBox>
            </GtkFrame>

            <GtkFrame label="Navigation">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={8}
                    marginStart={16}
                    marginEnd={16}
                    marginTop={16}
                    marginBottom={16}
                >
                    <GtkLabel label="Available Pages:" cssClasses={["heading"]} halign={Gtk.Align.START} />
                    <GtkBox spacing={8}>
                        {Object.entries(PAGES).map(([id, pageInfo]) => (
                            <GtkButton
                                key={id}
                                label={pageInfo.title}
                                onClicked={() => navigateTo(id)}
                                cssClasses={currentPage === id ? ["suggested-action"] : ["flat"]}
                            />
                        ))}
                    </GtkBox>
                    <GtkLabel
                        label={`History: ${history.length > 0 ? history.join(" → ") + " → " + currentPage : currentPage}`}
                        cssClasses={["dim-label", "caption", "monospace"]}
                        halign={Gtk.Align.START}
                    />
                </GtkBox>
            </GtkFrame>

            <GtkFrame label="Implementation">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={6}
                    marginStart={16}
                    marginEnd={16}
                    marginTop={16}
                    marginBottom={16}
                >
                    <GtkBox spacing={12}>
                        <GtkLabel label="GtkTextTag" widthChars={16} xalign={0} cssClasses={["monospace"]} />
                        <GtkLabel label="Applies link styling (color, underline)" cssClasses={["dim-label"]} />
                    </GtkBox>
                    <GtkBox spacing={12}>
                        <GtkLabel label="EventController" widthChars={16} xalign={0} cssClasses={["monospace"]} />
                        <GtkLabel label="Detects hover and click events" cssClasses={["dim-label"]} />
                    </GtkBox>
                    <GtkBox spacing={12}>
                        <GtkLabel label="TextChildAnchor" widthChars={16} xalign={0} cssClasses={["monospace"]} />
                        <GtkLabel label="Anchors widgets within text" cssClasses={["dim-label"]} />
                    </GtkBox>
                    <GtkBox spacing={12}>
                        <GtkLabel label="Cursor" widthChars={16} xalign={0} cssClasses={["monospace"]} />
                        <GtkLabel label="Changes to pointer over links" cssClasses={["dim-label"]} />
                    </GtkBox>
                </GtkBox>
            </GtkFrame>
        </GtkBox>
    );
};

export const hypertextDemo: Demo = {
    id: "hypertext",
    title: "Text View/Hypertext",
    description: "Multi-page wiki browser with clickable links and embedded widgets",
    keywords: [
        "text",
        "link",
        "hypertext",
        "url",
        "clickable",
        "GtkTextTag",
        "GtkTextView",
        "wiki",
        "navigation",
        "embedded",
        "widget",
    ],
    component: HypertextDemo,
    sourceCode,
};
