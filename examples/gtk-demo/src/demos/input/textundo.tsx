import * as GObject from "@gtkx/ffi/gobject";
import * as Gtk from "@gtkx/ffi/gtk";
import { GtkBox, GtkButton, GtkFrame, GtkLabel, GtkScrolledWindow, GtkTextView } from "@gtkx/react";
import { useEffect, useState } from "react";
import type { Demo } from "../types.js";

const TextUndoDemo = () => {
    const [buffer] = useState(() => new Gtk.TextBuffer());
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);
    const [actionCount, setActionCount] = useState(0);

    useEffect(() => {
        buffer.setEnableUndo(true);

        const changedHandler = buffer.connect("changed", () => {
            setCanUndo(buffer.getCanUndo());
            setCanRedo(buffer.getCanRedo());
            setActionCount((prev) => prev + 1);
        });

        return () => {
            GObject.signalHandlerDisconnect(buffer, changedHandler);
        };
    }, [buffer]);

    const handleUndo = () => {
        if (buffer.getCanUndo()) {
            buffer.undo();
            setCanUndo(buffer.getCanUndo());
            setCanRedo(buffer.getCanRedo());
        }
    };

    const handleRedo = () => {
        if (buffer.getCanRedo()) {
            buffer.redo();
            setCanUndo(buffer.getCanUndo());
            setCanRedo(buffer.getCanRedo());
        }
    };

    const handleInsertSample = () => {
        buffer.setText("Type here to test undo/redo functionality.", -1);
    };

    const handleBeginUserAction = () => {
        buffer.beginUserAction();
    };

    const handleEndUserAction = () => {
        buffer.endUserAction();
    };

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

                <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={8}>
                    <GtkButton label="Undo (Ctrl+Z)" onClicked={handleUndo} sensitive={canUndo} />
                    <GtkButton label="Redo (Ctrl+Shift+Z)" onClicked={handleRedo} sensitive={canRedo} />
                    <GtkButton label="Insert Sample" onClicked={handleInsertSample} />
                </GtkBox>

                <GtkFrame>
                    <GtkScrolledWindow minContentHeight={150} hexpand vexpand>
                        <GtkTextView
                            buffer={buffer}
                            leftMargin={12}
                            rightMargin={12}
                            topMargin={12}
                            bottomMargin={12}
                            wrapMode={Gtk.WrapMode.WORD_CHAR}
                        />
                    </GtkScrolledWindow>
                </GtkFrame>

                <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={16}>
                    <GtkLabel label={`Can Undo: ${canUndo ? "Yes" : "No"}`} cssClasses={["dim-label"]} />
                    <GtkLabel label={`Can Redo: ${canRedo ? "Yes" : "No"}`} cssClasses={["dim-label"]} />
                    <GtkLabel label={`Actions: ${actionCount}`} cssClasses={["dim-label"]} />
                </GtkBox>
            </GtkBox>

            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={12}>
                <GtkLabel label="User Actions" cssClasses={["heading"]} halign={Gtk.Align.START} />
                <GtkLabel
                    label="You can group multiple edits into a single undo action using beginUserAction() and endUserAction(). This is useful when you want multiple programmatic changes to be undone as a single unit."
                    wrap
                    cssClasses={["dim-label"]}
                />

                <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={8}>
                    <GtkButton label="Begin User Action" onClicked={handleBeginUserAction} />
                    <GtkButton label="End User Action" onClicked={handleEndUserAction} />
                </GtkBox>

                <GtkLabel
                    label="Usage example:\nbuffer.beginUserAction();\nbuffer.insertAtCursor('Hello ');\nbuffer.insertAtCursor('World');\nbuffer.endUserAction();\n// Both inserts are now a single undo action"
                    cssClasses={["dim-label", "monospace"]}
                    halign={Gtk.Align.START}
                />
            </GtkBox>

            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={12}>
                <GtkLabel label="Keyboard Shortcuts" cssClasses={["heading"]} halign={Gtk.Align.START} />
                <GtkLabel
                    label="Ctrl+Z: Undo the last change\nCtrl+Shift+Z or Ctrl+Y: Redo the last undone change\n\nGtkTextView automatically provides these shortcuts when the buffer has undo enabled."
                    cssClasses={["dim-label"]}
                    halign={Gtk.Align.START}
                />
            </GtkBox>

            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={12}>
                <GtkLabel label="API Reference" cssClasses={["heading"]} halign={Gtk.Align.START} />
                <GtkLabel
                    label="buffer.setEnableUndo(true) - Enable undo tracking\nbuffer.getCanUndo() - Check if undo is available\nbuffer.getCanRedo() - Check if redo is available\nbuffer.undo() - Perform undo\nbuffer.redo() - Perform redo\nbuffer.beginUserAction() - Start grouping edits\nbuffer.endUserAction() - End grouping edits"
                    cssClasses={["dim-label", "monospace"]}
                    halign={Gtk.Align.START}
                />
            </GtkBox>
        </GtkBox>
    );
};

const sourceCode = `import * as Gtk from "@gtkx/ffi/gtk";
import { GtkBox, GtkButton, GtkFrame, GtkScrolledWindow, GtkTextView } from "@gtkx/react";
import { useEffect, useState } from "react";

const TextUndoDemo = () => {
  const [buffer] = useState(() => new Gtk.TextBuffer());
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  useEffect(() => {
    buffer.setEnableUndo(true);

    const handler = buffer.connect("changed", () => {
      setCanUndo(buffer.getCanUndo());
      setCanRedo(buffer.getCanRedo());
    });

    return () => GObject.signalHandlerDisconnect(buffer, handler);
  }, [buffer]);

  return (
    <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={12}>
      <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={8}>
        <GtkButton label="Undo" onClicked={() => buffer.undo()} sensitive={canUndo} />
        <GtkButton label="Redo" onClicked={() => buffer.redo()} sensitive={canRedo} />
      </GtkBox>

      <GtkFrame>
        <GtkScrolledWindow minContentHeight={150}>
          <GtkTextView buffer={buffer} wrapMode={Gtk.WrapMode.WORD_CHAR} />
        </GtkScrolledWindow>
      </GtkFrame>
    </GtkBox>
  );
};`;

export const textundoDemo: Demo = {
    id: "textundo",
    title: "Text Undo",
    description: "TextView with built-in undo/redo support.",
    keywords: ["textview", "undo", "redo", "history", "GtkTextBuffer", "edit"],
    component: TextUndoDemo,
    sourceCode,
};
