import { beginBatch, endBatch } from "@gtkx/ffi";
import * as Gtk from "@gtkx/ffi/gtk";
import { GtkBox, GtkButton, GtkFrame, GtkLabel, GtkScrolledWindow, GtkTextView, x } from "@gtkx/react";
import { useCallback, useRef } from "react";
import type { Demo } from "../types.js";
import sourceCode from "./textscroll.tsx?raw";

const loremIpsum = `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.

Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.

Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit.

Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur.

At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident, similique sunt in culpa qui officia deserunt mollitia animi.`;

const horizontalText = `${"This is a very long line of text that extends beyond the visible area. ".repeat(10)}\n\n${loremIpsum.split("\n\n").join(" ")}`;
const bothText = (() => {
    const content = loremIpsum
        .split("\n\n")
        .map((para) => para.replace(/\n/g, " "))
        .join("\n\n");
    return `${content}\n\n${content}`;
})();

const TextScrollDemo = () => {
    const verticalViewRef = useRef<Gtk.TextView | null>(null);

    const scrollToStart = useCallback((textView: Gtk.TextView | null) => {
        if (!textView) return;
        const buffer = textView.getBuffer();
        if (!buffer) return;
        beginBatch();
        const startIter = new Gtk.TextIter();
        buffer.getStartIter(startIter);
        endBatch();
        buffer.placeCursor(startIter);
        const insertMark = buffer.getInsert();
        textView.scrollToMark(insertMark, 0.0, false, 0.0, 0.0);
    }, []);

    const scrollToEnd = useCallback((textView: Gtk.TextView | null) => {
        if (!textView) return;
        const buffer = textView.getBuffer();
        if (!buffer) return;
        beginBatch();
        const endIter = new Gtk.TextIter();
        buffer.getEndIter(endIter);
        endBatch();
        buffer.placeCursor(endIter);
        const insertMark = buffer.getInsert();
        textView.scrollToMark(insertMark, 0.0, false, 0.0, 0.0);
    }, []);

    return (
        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={20} marginStart={20} marginEnd={20} marginTop={20}>
            <GtkLabel label="Scrolling Text" cssClasses={["title-2"]} halign={Gtk.Align.START} />

            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={12}>
                <GtkLabel label="Vertical Scrolling" cssClasses={["heading"]} halign={Gtk.Align.START} />
                <GtkLabel
                    label="GtkScrolledWindow provides scrollbars when content exceeds the visible area. This example shows vertical scrolling with automatic scrollbar policy."
                    wrap
                    cssClasses={["dim-label"]}
                />

                <GtkFrame>
                    <GtkScrolledWindow
                        minContentHeight={150}
                        maxContentHeight={150}
                        hscrollbarPolicy={Gtk.PolicyType.NEVER}
                        vscrollbarPolicy={Gtk.PolicyType.AUTOMATIC}
                    >
                        <GtkTextView
                            ref={verticalViewRef}
                            leftMargin={12}
                            rightMargin={12}
                            topMargin={12}
                            bottomMargin={12}
                            wrapMode={Gtk.WrapMode.WORD}
                            editable={false}
                            cursorVisible={false}
                        >
                            <x.TextBuffer text={loremIpsum} />
                        </GtkTextView>
                    </GtkScrolledWindow>
                </GtkFrame>

                <GtkBox spacing={8}>
                    <GtkButton label="Scroll to Start" onClicked={() => scrollToStart(verticalViewRef.current)} />
                    <GtkButton label="Scroll to End" onClicked={() => scrollToEnd(verticalViewRef.current)} />
                </GtkBox>
            </GtkBox>

            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={12}>
                <GtkLabel label="Horizontal Scrolling" cssClasses={["heading"]} halign={Gtk.Align.START} />
                <GtkLabel
                    label="When text wrapping is disabled, horizontal scrolling allows viewing long lines."
                    wrap
                    cssClasses={["dim-label"]}
                />

                <GtkFrame>
                    <GtkScrolledWindow
                        minContentHeight={100}
                        maxContentHeight={100}
                        hscrollbarPolicy={Gtk.PolicyType.AUTOMATIC}
                        vscrollbarPolicy={Gtk.PolicyType.NEVER}
                    >
                        <GtkTextView
                            leftMargin={12}
                            rightMargin={12}
                            topMargin={12}
                            bottomMargin={12}
                            wrapMode={Gtk.WrapMode.NONE}
                            editable={false}
                            cursorVisible={false}
                        >
                            <x.TextBuffer text={horizontalText} />
                        </GtkTextView>
                    </GtkScrolledWindow>
                </GtkFrame>
            </GtkBox>

            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={12}>
                <GtkLabel label="Both Directions" cssClasses={["heading"]} halign={Gtk.Align.START} />
                <GtkLabel
                    label="Content can scroll in both directions when needed. This is useful for code editors or log viewers."
                    wrap
                    cssClasses={["dim-label"]}
                />

                <GtkFrame>
                    <GtkScrolledWindow
                        minContentWidth={300}
                        minContentHeight={150}
                        maxContentHeight={150}
                        hscrollbarPolicy={Gtk.PolicyType.AUTOMATIC}
                        vscrollbarPolicy={Gtk.PolicyType.AUTOMATIC}
                    >
                        <GtkTextView
                            leftMargin={12}
                            rightMargin={12}
                            topMargin={12}
                            bottomMargin={12}
                            wrapMode={Gtk.WrapMode.NONE}
                            monospace
                            editable={false}
                            cursorVisible={false}
                        >
                            <x.TextBuffer text={bothText} />
                        </GtkTextView>
                    </GtkScrolledWindow>
                </GtkFrame>
            </GtkBox>

            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={12}>
                <GtkLabel label="Scrollbar Policies" cssClasses={["heading"]} halign={Gtk.Align.START} />
                <GtkLabel
                    label={`GtkScrolledWindow supports different scrollbar policies:
- AUTOMATIC: Show when needed
- ALWAYS: Always visible
- NEVER: Never show (content clips)
- EXTERNAL: Managed externally`}
                    cssClasses={["dim-label"]}
                    halign={Gtk.Align.START}
                />
            </GtkBox>
        </GtkBox>
    );
};

export const textscrollDemo: Demo = {
    id: "textscroll",
    title: "Text View/Automatic Scrolling",
    description: "Scrollable text views with GtkScrolledWindow.",
    keywords: ["scroll", "textview", "scrollbar", "GtkScrolledWindow", "overflow"],
    component: TextScrollDemo,
    sourceCode,
};
