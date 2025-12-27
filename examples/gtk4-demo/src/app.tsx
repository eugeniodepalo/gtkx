import * as Gtk from "@gtkx/ffi/gtk";
import { GtkApplicationWindow, GtkBox, GtkPaned, quit, Slot } from "@gtkx/react";
import { DemoPanel } from "./components/demo-panel.js";
import { Sidebar } from "./components/sidebar.js";
import { SourceViewer } from "./components/source-viewer.js";
import { DemoProvider, useDemo } from "./context/demo-context.js";
import { categories } from "./demos/index.js";

const AppContent = () => {
    const { currentDemo } = useDemo();

    return (
        <GtkPaned
            orientation={Gtk.Orientation.HORIZONTAL}
            wideHandle
            vexpand
            hexpand
            shrinkStartChild={false}
            shrinkEndChild={false}
            position={280}
        >
            <Slot for={GtkPaned} id="startChild">
                <Sidebar />
            </Slot>
            <Slot for={GtkPaned} id="endChild">
                <GtkPaned
                    orientation={Gtk.Orientation.HORIZONTAL}
                    wideHandle
                    vexpand
                    hexpand
                    shrinkStartChild={false}
                    shrinkEndChild={false}
                    position={550}
                >
                    <Slot for={GtkPaned} id="startChild">
                        <DemoPanel demo={currentDemo} />
                    </Slot>
                    <Slot for={GtkPaned} id="endChild">
                        <SourceViewer />
                    </Slot>
                </GtkPaned>
            </Slot>
        </GtkPaned>
    );
};

export const App = () => (
    <DemoProvider categories={categories}>
        <GtkApplicationWindow title="GTK4 Demo" defaultWidth={1400} defaultHeight={900} onCloseRequest={quit}>
            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={0} vexpand hexpand>
                <AppContent />
            </GtkBox>
        </GtkApplicationWindow>
    </DemoProvider>
);

export default App;
