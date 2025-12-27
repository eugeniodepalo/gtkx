import * as Gtk from "@gtkx/ffi/gtk";
import { GtkApplicationWindow, GtkBox, GtkLabel, quit } from "@gtkx/react";

export const App = () => {
    return (
        <GtkApplicationWindow title="GTKX Example" defaultWidth={400} defaultHeight={300} onCloseRequest={quit}>
            <GtkBox
                orientation={Gtk.Orientation.VERTICAL}
                spacing={20}
                marginTop={40}
                marginBottom={40}
                marginStart={40}
                marginEnd={40}
                valign={Gtk.Align.CENTER}
                halign={Gtk.Align.CENTER}
            >
                <GtkLabel label="GTKX Example App" cssClasses={["title-1"]} />
                <GtkLabel
                    label="This app demonstrates GTKX packaging for Linux distribution."
                    cssClasses={["dim-label"]}
                    wrap
                    justify={Gtk.Justification.CENTER}
                />
            </GtkBox>
        </GtkApplicationWindow>
    );
};

export default App;
