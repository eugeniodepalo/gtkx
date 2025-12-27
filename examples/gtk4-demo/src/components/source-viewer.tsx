import * as Gtk from "@gtkx/ffi/gtk";
import { GtkBox, GtkLabel, GtkScrolledWindow } from "@gtkx/react";
import { useDemo } from "../context/demo-context.js";

export const SourceViewer = () => {
    const { currentDemo } = useDemo();

    if (!currentDemo) {
        return (
            <GtkBox
                orientation={Gtk.Orientation.VERTICAL}
                spacing={0}
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
        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={0} vexpand hexpand>
            <GtkBox
                orientation={Gtk.Orientation.HORIZONTAL}
                spacing={0}
                marginTop={12}
                marginBottom={8}
                marginStart={12}
                marginEnd={12}
            >
                <GtkLabel label="Source Code" halign={Gtk.Align.START} cssClasses={["heading"]} />
            </GtkBox>

            <GtkScrolledWindow vexpand hexpand>
                <GtkLabel
                    label={currentDemo.sourceCode}
                    selectable
                    halign={Gtk.Align.START}
                    valign={Gtk.Align.START}
                    cssClasses={["monospace"]}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                />
            </GtkScrolledWindow>
        </GtkBox>
    );
};
