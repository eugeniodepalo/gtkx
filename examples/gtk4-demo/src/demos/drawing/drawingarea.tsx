import * as Gtk from "@gtkx/ffi/gtk";
import { GtkBox, GtkDrawingArea, GtkFrame, GtkLabel } from "@gtkx/react";
import type { Demo } from "../types.js";

const DrawingAreaDemo = () => {
    return (
        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={24}>
            <GtkLabel label="Drawing Area" cssClasses={["title-2"]} halign={Gtk.Align.START} />

            <GtkLabel
                label="GtkDrawingArea is a widget for custom drawing. In native GTK4, you would use Cairo or snapshot functions to draw custom content. However, GTKX currently does not support custom drawing callbacks."
                wrap
                halign={Gtk.Align.START}
                cssClasses={["dim-label"]}
            />

            {/* Placeholder Drawing Area */}
            <GtkFrame label="Drawing Area (Placeholder)">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={12}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkDrawingArea contentWidth={300} contentHeight={200} cssClasses={["view"]} />
                    <GtkLabel
                        label="This is an empty drawing area. Custom drawing with Cairo is not yet supported in GTKX."
                        wrap
                        halign={Gtk.Align.CENTER}
                        cssClasses={["dim-label"]}
                    />
                </GtkBox>
            </GtkFrame>

            {/* Limitation Explanation */}
            <GtkFrame label="Current Limitations">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={12}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkLabel label="Custom Drawing Not Available" cssClasses={["heading"]} halign={Gtk.Align.START} />
                    <GtkLabel
                        label="In native GTK4, GtkDrawingArea uses a draw function callback that receives a Cairo context for custom rendering. This pattern requires direct access to Cairo drawing primitives, which is not currently exposed through the GTKX FFI layer."
                        wrap
                        halign={Gtk.Align.START}
                    />
                    <GtkLabel label="Alternatives:" cssClasses={["heading"]} halign={Gtk.Align.START} marginTop={12} />
                    <GtkLabel
                        label="- Use GtkImage or GtkPicture for displaying pre-rendered images\n- Use GtkCanvas (if available) for simple shapes\n- Use CSS styling for visual effects\n- Create SVG files and load them as images"
                        wrap
                        halign={Gtk.Align.START}
                    />
                </GtkBox>
            </GtkFrame>

            {/* Size Configuration */}
            <GtkFrame label="Size Configuration">
                <GtkBox
                    orientation={Gtk.Orientation.HORIZONTAL}
                    spacing={24}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                    halign={Gtk.Align.CENTER}
                >
                    <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={6} halign={Gtk.Align.CENTER}>
                        <GtkDrawingArea contentWidth={100} contentHeight={100} cssClasses={["card"]} />
                        <GtkLabel label="100x100" cssClasses={["dim-label", "caption"]} />
                    </GtkBox>
                    <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={6} halign={Gtk.Align.CENTER}>
                        <GtkDrawingArea contentWidth={150} contentHeight={100} cssClasses={["card"]} />
                        <GtkLabel label="150x100" cssClasses={["dim-label", "caption"]} />
                    </GtkBox>
                    <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={6} halign={Gtk.Align.CENTER}>
                        <GtkDrawingArea contentWidth={100} contentHeight={150} cssClasses={["card"]} />
                        <GtkLabel label="100x150" cssClasses={["dim-label", "caption"]} />
                    </GtkBox>
                </GtkBox>
            </GtkFrame>
        </GtkBox>
    );
};

const sourceCode = `import * as Gtk from "@gtkx/ffi/gtk";
import { GtkBox, GtkDrawingArea, GtkLabel } from "@gtkx/react";

const DrawingAreaDemo = () => {
  return (
    <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={24}>
      {/* Basic drawing area with size */}
      <GtkDrawingArea
        contentWidth={300}
        contentHeight={200}
      />

      {/* Note: Custom drawing with Cairo is not yet supported */}
      {/* In native GTK4, you would use gtk_drawing_area_set_draw_func */}
      {/* to provide a callback for custom rendering */}
    </GtkBox>
  );
};

// Native GTK4 example (not available in GTKX):
// gtk_drawing_area_set_draw_func(area, draw_callback, NULL, NULL);
//
// static void draw_callback(GtkDrawingArea *area, cairo_t *cr,
//                           int width, int height, gpointer data) {
//   cairo_set_source_rgb(cr, 1, 0, 0);
//   cairo_rectangle(cr, 10, 10, width - 20, height - 20);
//   cairo_fill(cr);
// }`;

export const drawingAreaDemo: Demo = {
    id: "drawingarea",
    title: "Drawing Area",
    description: "Widget for custom drawing (limited support)",
    keywords: ["drawing", "canvas", "cairo", "GtkDrawingArea", "custom", "graphics"],
    component: DrawingAreaDemo,
    sourceCode,
};
