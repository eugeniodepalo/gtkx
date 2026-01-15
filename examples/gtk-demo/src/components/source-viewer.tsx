import * as Gtk from "@gtkx/ffi/gtk";
import { GtkBox, GtkLabel, GtkScrolledWindow, GtkSourceView, x } from "@gtkx/react";
import { useDemo } from "../context/demo-context.js";

export const SourceViewer = () => {
    const { currentDemo } = useDemo();

    if (!currentDemo?.sourceCode) {
        return (
            <GtkBox
                orientation={Gtk.Orientation.VERTICAL}
                valign={Gtk.Align.CENTER}
                halign={Gtk.Align.CENTER}
                vexpand
                hexpand
            >
                <GtkLabel label="No source" cssClasses={["dim-label"]} />
            </GtkBox>
        );
    }

    return (
        <GtkBox orientation={Gtk.Orientation.VERTICAL} vexpand hexpand>
            <GtkScrolledWindow vexpand hexpand>
                <GtkSourceView
                    editable={false}
                    showLineNumbers
                    tabWidth={4}
                    leftMargin={20}
                    rightMargin={20}
                    topMargin={20}
                    bottomMargin={20}
                    monospace
                >
                    <x.SourceBuffer text={currentDemo.sourceCode} language="typescript" styleScheme="Adwaita-dark" />
                </GtkSourceView>
            </GtkScrolledWindow>
        </GtkBox>
    );
};
