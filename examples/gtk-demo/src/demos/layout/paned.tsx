import * as Gtk from "@gtkx/ffi/gtk";
import { GtkBox, GtkButton, GtkLabel, GtkPaned, GtkScrolledWindow, Slot } from "@gtkx/react";
import { useState } from "react";
import type { Demo } from "../types.js";

const sourceCode = `import * as Gtk from "@gtkx/ffi/gtk";
import { GtkBox, GtkLabel, GtkPaned, GtkScrolledWindow, Slot } from "@gtkx/react";

const PanedDemo = () => {
    return (
        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={20}>
            {/* Horizontal Paned */}
            <GtkPaned orientation={Gtk.Orientation.HORIZONTAL} wideHandle position={200}>
                <Slot for={GtkPaned} id="startChild">
                    <GtkScrolledWindow>
                        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                            <GtkLabel label="Left Pane" cssClasses={["heading"]} />
                            <GtkLabel label="Start child content" />
                        </GtkBox>
                    </GtkScrolledWindow>
                </Slot>
                <Slot for={GtkPaned} id="endChild">
                    <GtkScrolledWindow>
                        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                            <GtkLabel label="Right Pane" cssClasses={["heading"]} />
                            <GtkLabel label="End child content" />
                        </GtkBox>
                    </GtkScrolledWindow>
                </Slot>
            </GtkPaned>

            {/* Vertical Paned */}
            <GtkPaned orientation={Gtk.Orientation.VERTICAL} wideHandle position={100}>
                <Slot for={GtkPaned} id="startChild">
                    <GtkLabel label="Top Pane" />
                </Slot>
                <Slot for={GtkPaned} id="endChild">
                    <GtkLabel label="Bottom Pane" />
                </Slot>
            </GtkPaned>
        </GtkBox>
    );
};`;

const PanedDemo = () => {
    const [position, setPosition] = useState(200);

    return (
        <GtkBox
            orientation={Gtk.Orientation.VERTICAL}
            spacing={20}
            marginStart={20}
            marginEnd={20}
            marginTop={20}
            marginBottom={20}
        >
            <GtkLabel label="Paned Container" cssClasses={["title-2"]} halign={Gtk.Align.START} />

            {/* Horizontal Paned */}
            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                <GtkLabel label="Horizontal Paned" cssClasses={["heading"]} halign={Gtk.Align.START} />
                <GtkLabel
                    label="Drag the handle between panes to resize them. Uses Slot for startChild and endChild."
                    wrap
                    cssClasses={["dim-label"]}
                    halign={Gtk.Align.START}
                />
                <GtkPaned
                    orientation={Gtk.Orientation.HORIZONTAL}
                    wideHandle
                    heightRequest={150}
                    position={position}
                    cssClasses={["card"]}
                >
                    <Slot for={GtkPaned} id="startChild">
                        <GtkScrolledWindow hscrollbarPolicy={Gtk.PolicyType.NEVER}>
                            <GtkBox
                                orientation={Gtk.Orientation.VERTICAL}
                                spacing={8}
                                marginStart={12}
                                marginEnd={12}
                                marginTop={12}
                                marginBottom={12}
                            >
                                <GtkLabel label="Left Pane" cssClasses={["heading"]} halign={Gtk.Align.START} />
                                <GtkLabel
                                    label="This is the start child of the paned container. Resize by dragging the handle."
                                    wrap
                                    cssClasses={["dim-label"]}
                                />
                            </GtkBox>
                        </GtkScrolledWindow>
                    </Slot>
                    <Slot for={GtkPaned} id="endChild">
                        <GtkScrolledWindow hscrollbarPolicy={Gtk.PolicyType.NEVER}>
                            <GtkBox
                                orientation={Gtk.Orientation.VERTICAL}
                                spacing={8}
                                marginStart={12}
                                marginEnd={12}
                                marginTop={12}
                                marginBottom={12}
                            >
                                <GtkLabel label="Right Pane" cssClasses={["heading"]} halign={Gtk.Align.START} />
                                <GtkLabel
                                    label="This is the end child of the paned container."
                                    wrap
                                    cssClasses={["dim-label"]}
                                />
                            </GtkBox>
                        </GtkScrolledWindow>
                    </Slot>
                </GtkPaned>
            </GtkBox>

            {/* Vertical Paned */}
            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                <GtkLabel label="Vertical Paned" cssClasses={["heading"]} halign={Gtk.Align.START} />
                <GtkLabel
                    label="Orientation can be vertical for top/bottom split."
                    wrap
                    cssClasses={["dim-label"]}
                    halign={Gtk.Align.START}
                />
                <GtkPaned
                    orientation={Gtk.Orientation.VERTICAL}
                    wideHandle
                    heightRequest={200}
                    position={80}
                    cssClasses={["card"]}
                >
                    <Slot for={GtkPaned} id="startChild">
                        <GtkBox
                            orientation={Gtk.Orientation.VERTICAL}
                            spacing={8}
                            marginStart={12}
                            marginEnd={12}
                            marginTop={12}
                        >
                            <GtkLabel label="Top Pane" cssClasses={["heading"]} halign={Gtk.Align.START} />
                        </GtkBox>
                    </Slot>
                    <Slot for={GtkPaned} id="endChild">
                        <GtkBox
                            orientation={Gtk.Orientation.VERTICAL}
                            spacing={8}
                            marginStart={12}
                            marginEnd={12}
                            marginTop={12}
                        >
                            <GtkLabel label="Bottom Pane" cssClasses={["heading"]} halign={Gtk.Align.START} />
                        </GtkBox>
                    </Slot>
                </GtkPaned>
            </GtkBox>

            {/* Nested Panes */}
            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                <GtkLabel label="Nested Panes" cssClasses={["heading"]} halign={Gtk.Align.START} />
                <GtkLabel
                    label="Panes can be nested to create complex layouts like IDE interfaces."
                    wrap
                    cssClasses={["dim-label"]}
                    halign={Gtk.Align.START}
                />
                <GtkPaned
                    orientation={Gtk.Orientation.HORIZONTAL}
                    wideHandle
                    heightRequest={200}
                    position={150}
                    cssClasses={["card"]}
                >
                    <Slot for={GtkPaned} id="startChild">
                        <GtkBox
                            orientation={Gtk.Orientation.VERTICAL}
                            spacing={8}
                            marginStart={12}
                            marginEnd={12}
                            marginTop={12}
                        >
                            <GtkLabel label="Sidebar" cssClasses={["heading"]} halign={Gtk.Align.START} />
                            <GtkButton label="Item 1" cssClasses={["flat"]} />
                            <GtkButton label="Item 2" cssClasses={["flat"]} />
                            <GtkButton label="Item 3" cssClasses={["flat"]} />
                        </GtkBox>
                    </Slot>
                    <Slot for={GtkPaned} id="endChild">
                        <GtkPaned orientation={Gtk.Orientation.VERTICAL} wideHandle position={100}>
                            <Slot for={GtkPaned} id="startChild">
                                <GtkBox
                                    orientation={Gtk.Orientation.VERTICAL}
                                    spacing={8}
                                    marginStart={12}
                                    marginEnd={12}
                                    marginTop={12}
                                >
                                    <GtkLabel label="Main Content" cssClasses={["heading"]} halign={Gtk.Align.START} />
                                    <GtkLabel label="Editor or content area" cssClasses={["dim-label"]} />
                                </GtkBox>
                            </Slot>
                            <Slot for={GtkPaned} id="endChild">
                                <GtkBox
                                    orientation={Gtk.Orientation.VERTICAL}
                                    spacing={8}
                                    marginStart={12}
                                    marginEnd={12}
                                    marginTop={12}
                                >
                                    <GtkLabel label="Details Panel" cssClasses={["heading"]} halign={Gtk.Align.START} />
                                    <GtkLabel label="Properties or terminal" cssClasses={["dim-label"]} />
                                </GtkBox>
                            </Slot>
                        </GtkPaned>
                    </Slot>
                </GtkPaned>
            </GtkBox>

            {/* Controlled Position */}
            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                <GtkLabel label="Controlled Position" cssClasses={["heading"]} halign={Gtk.Align.START} />
                <GtkLabel
                    label="The divider position can be controlled programmatically."
                    wrap
                    cssClasses={["dim-label"]}
                    halign={Gtk.Align.START}
                />
                <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={8}>
                    <GtkButton label="25%" onClicked={() => setPosition(100)} />
                    <GtkButton label="50%" onClicked={() => setPosition(200)} />
                    <GtkButton label="75%" onClicked={() => setPosition(300)} />
                </GtkBox>
                <GtkLabel label={`Current position: ${position}px`} cssClasses={["dim-label"]} />
            </GtkBox>
        </GtkBox>
    );
};

export const panedDemo: Demo = {
    id: "paned",
    title: "Paned",
    description: "Resizable split container with draggable divider.",
    keywords: ["paned", "split", "resize", "divider", "sidebar", "GtkPaned"],
    component: PanedDemo,
    sourceCode,
};
