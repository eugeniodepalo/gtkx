import * as Gtk from "@gtkx/ffi/gtk";
import { GtkBox, GtkButton, GtkFrame, GtkLabel, GtkScrolledWindow, GtkTextView, x } from "@gtkx/react";
import { useCallback, useRef, useState } from "react";
import type { Demo } from "../types.js";
import sourceCode from "./textundo.tsx?raw";

const TextUndoDemo = () => {
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);
    const [text, setText] = useState("");
    const textViewRef = useRef<Gtk.TextView | null>(null);

    const handleUndo = useCallback(() => {
        textViewRef.current?.getBuffer()?.undo();
    }, []);

    const handleRedo = useCallback(() => {
        textViewRef.current?.getBuffer()?.redo();
    }, []);

    const handleInsertSample = useCallback(() => {
        setText("Type here to test undo/redo functionality.");
    }, []);

    const handleBeginUserAction = useCallback(() => {
        textViewRef.current?.getBuffer()?.beginUserAction();
    }, []);

    const handleEndUserAction = useCallback(() => {
        textViewRef.current?.getBuffer()?.endUserAction();
    }, []);

    return (
        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={20} marginStart={20} marginEnd={20} marginTop={20}>
            <GtkLabel label="TextView Undo" cssClasses={["title-2"]} halign={Gtk.Align.START} />

            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={12}>
                <GtkLabel label="Built-in Undo/Redo" cssClasses={["heading"]} halign={Gtk.Align.START} />
                <GtkLabel
                    label="GtkTextBuffer supports built-in undo/redo when enabled. Try typing text, then use Ctrl+Z to undo and Ctrl+Shift+Z to redo. You can also use the buttons below."
                    wrap
                    cssClasses={["dim-label"]}
                />

                <GtkBox spacing={8}>
                    <GtkButton label="Undo (Ctrl+Z)" onClicked={handleUndo} sensitive={canUndo} />
                    <GtkButton label="Redo (Ctrl+Shift+Z)" onClicked={handleRedo} sensitive={canRedo} />
                    <GtkButton label="Insert Sample" onClicked={handleInsertSample} />
                </GtkBox>

                <GtkFrame>
                    <GtkScrolledWindow minContentHeight={150} hexpand vexpand>
                        <GtkTextView
                            ref={textViewRef}
                            leftMargin={12}
                            rightMargin={12}
                            topMargin={12}
                            bottomMargin={12}
                            wrapMode={Gtk.WrapMode.WORD_CHAR}
                        >
                            <x.TextBuffer
                                text={text}
                                enableUndo
                                onCanUndoChanged={setCanUndo}
                                onCanRedoChanged={setCanRedo}
                            />
                        </GtkTextView>
                    </GtkScrolledWindow>
                </GtkFrame>

                <GtkBox spacing={16}>
                    <GtkLabel label={`Can Undo: ${canUndo ? "Yes" : "No"}`} cssClasses={["dim-label"]} />
                    <GtkLabel label={`Can Redo: ${canRedo ? "Yes" : "No"}`} cssClasses={["dim-label"]} />
                </GtkBox>
            </GtkBox>

            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={12}>
                <GtkLabel label="User Actions" cssClasses={["heading"]} halign={Gtk.Align.START} />
                <GtkLabel
                    label="You can group multiple edits into a single undo action using beginUserAction() and endUserAction(). This is useful when you want multiple programmatic changes to be undone as a single unit."
                    wrap
                    cssClasses={["dim-label"]}
                />

                <GtkBox spacing={8}>
                    <GtkButton label="Begin User Action" onClicked={handleBeginUserAction} />
                    <GtkButton label="End User Action" onClicked={handleEndUserAction} />
                </GtkBox>

                <GtkLabel
                    label={`Usage example:
buffer.beginUserAction();
buffer.insertAtCursor('Hello ');
buffer.insertAtCursor('World');
buffer.endUserAction();
// Both inserts are now a single undo action`}
                    cssClasses={["dim-label", "monospace"]}
                    halign={Gtk.Align.START}
                />
            </GtkBox>

            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={12}>
                <GtkLabel label="Keyboard Shortcuts" cssClasses={["heading"]} halign={Gtk.Align.START} />
                <GtkLabel
                    label={`Ctrl+Z: Undo the last change
Ctrl+Shift+Z or Ctrl+Y: Redo the last undone change

GtkTextView automatically provides these shortcuts when the buffer has undo enabled.`}
                    cssClasses={["dim-label"]}
                    halign={Gtk.Align.START}
                />
            </GtkBox>

            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={12}>
                <GtkLabel label="API Reference" cssClasses={["heading"]} halign={Gtk.Align.START} />
                <GtkLabel
                    label={`buffer.setEnableUndo(true) - Enable undo tracking
buffer.getCanUndo() - Check if undo is available
buffer.getCanRedo() - Check if redo is available
buffer.undo() - Perform undo
buffer.redo() - Perform redo
buffer.beginUserAction() - Start grouping edits
buffer.endUserAction() - End grouping edits`}
                    cssClasses={["dim-label", "monospace"]}
                    halign={Gtk.Align.START}
                />
            </GtkBox>
        </GtkBox>
    );
};

export const textundoDemo: Demo = {
    id: "textundo",
    title: "Text View/Undo and Redo",
    description: "TextView with built-in undo/redo support.",
    keywords: ["textview", "undo", "redo", "history", "GtkTextBuffer", "edit"],
    component: TextUndoDemo,
    sourceCode,
};
