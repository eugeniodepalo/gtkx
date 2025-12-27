import * as Gtk from "@gtkx/ffi/gtk";
import { GtkBox, GtkFrame, GtkLabel } from "@gtkx/react";
import type { Demo } from "../types.js";

const GesturesDemo = () => {
    return (
        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={24} marginStart={20} marginEnd={20} marginTop={20}>
            <GtkLabel label="Touch Gestures" cssClasses={["title-2"]} halign={Gtk.Align.START} />

            <GtkLabel
                label="GTK4 provides gesture recognizers for handling multi-touch and pointer input. Gestures are implemented as event controllers that can be attached to any widget."
                wrap
                halign={Gtk.Align.START}
                cssClasses={["dim-label"]}
            />

            {/* Available Gesture Types */}
            <GtkFrame label="Available Gesture Types">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={12}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkLabel
                        label="GTK provides these gesture recognizers:"
                        wrap
                        halign={Gtk.Align.START}
                        cssClasses={["dim-label"]}
                    />

                    <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                        <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={12}>
                            <GtkLabel label="GtkGestureClick" widthChars={20} xalign={0} cssClasses={["heading"]} />
                            <GtkLabel label="Single, double, and triple clicks" wrap cssClasses={["dim-label"]} />
                        </GtkBox>
                        <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={12}>
                            <GtkLabel label="GtkGestureDrag" widthChars={20} xalign={0} cssClasses={["heading"]} />
                            <GtkLabel
                                label="Drag operations with start point and offset"
                                wrap
                                cssClasses={["dim-label"]}
                            />
                        </GtkBox>
                        <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={12}>
                            <GtkLabel label="GtkGestureSwipe" widthChars={20} xalign={0} cssClasses={["heading"]} />
                            <GtkLabel label="Swipe gestures with velocity" wrap cssClasses={["dim-label"]} />
                        </GtkBox>
                        <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={12}>
                            <GtkLabel label="GtkGesturePan" widthChars={20} xalign={0} cssClasses={["heading"]} />
                            <GtkLabel label="Panning in a specific direction" wrap cssClasses={["dim-label"]} />
                        </GtkBox>
                        <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={12}>
                            <GtkLabel label="GtkGestureZoom" widthChars={20} xalign={0} cssClasses={["heading"]} />
                            <GtkLabel label="Pinch-to-zoom (two-finger)" wrap cssClasses={["dim-label"]} />
                        </GtkBox>
                        <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={12}>
                            <GtkLabel label="GtkGestureRotate" widthChars={20} xalign={0} cssClasses={["heading"]} />
                            <GtkLabel label="Two-finger rotation" wrap cssClasses={["dim-label"]} />
                        </GtkBox>
                        <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={12}>
                            <GtkLabel label="GtkGestureLongPress" widthChars={20} xalign={0} cssClasses={["heading"]} />
                            <GtkLabel label="Long press / touch-and-hold" wrap cssClasses={["dim-label"]} />
                        </GtkBox>
                        <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={12}>
                            <GtkLabel label="GtkGestureStylus" widthChars={20} xalign={0} cssClasses={["heading"]} />
                            <GtkLabel label="Stylus pen with pressure/tilt" wrap cssClasses={["dim-label"]} />
                        </GtkBox>
                    </GtkBox>
                </GtkBox>
            </GtkFrame>

            {/* GestureClick Signals */}
            <GtkFrame label="GtkGestureClick Signals">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={12}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkLabel
                        label="GtkGestureClick emits these signals:"
                        wrap
                        halign={Gtk.Align.START}
                        cssClasses={["dim-label"]}
                    />

                    <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={6}>
                        <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={12}>
                            <GtkLabel label="pressed" widthChars={12} xalign={0} cssClasses={["monospace"]} />
                            <GtkLabel label="(nPress, x, y) - Button pressed" cssClasses={["dim-label"]} />
                        </GtkBox>
                        <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={12}>
                            <GtkLabel label="released" widthChars={12} xalign={0} cssClasses={["monospace"]} />
                            <GtkLabel label="(nPress, x, y) - Button released" cssClasses={["dim-label"]} />
                        </GtkBox>
                        <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={12}>
                            <GtkLabel label="stopped" widthChars={12} xalign={0} cssClasses={["monospace"]} />
                            <GtkLabel label="Click sequence ended (timeout/distance)" cssClasses={["dim-label"]} />
                        </GtkBox>
                    </GtkBox>

                    <GtkLabel
                        label="The nPress parameter counts consecutive clicks (1=single, 2=double, 3=triple)."
                        wrap
                        halign={Gtk.Align.START}
                        cssClasses={["dim-label"]}
                        marginTop={8}
                    />
                </GtkBox>
            </GtkFrame>

            {/* GestureDrag Signals */}
            <GtkFrame label="GtkGestureDrag Signals">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={12}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkLabel
                        label="GtkGestureDrag tracks movement from a start point:"
                        wrap
                        halign={Gtk.Align.START}
                        cssClasses={["dim-label"]}
                    />

                    <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={6}>
                        <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={12}>
                            <GtkLabel label="drag-begin" widthChars={12} xalign={0} cssClasses={["monospace"]} />
                            <GtkLabel label="(startX, startY) - Drag started" cssClasses={["dim-label"]} />
                        </GtkBox>
                        <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={12}>
                            <GtkLabel label="drag-update" widthChars={12} xalign={0} cssClasses={["monospace"]} />
                            <GtkLabel label="(offsetX, offsetY) - Dragging in progress" cssClasses={["dim-label"]} />
                        </GtkBox>
                        <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={12}>
                            <GtkLabel label="drag-end" widthChars={12} xalign={0} cssClasses={["monospace"]} />
                            <GtkLabel label="(offsetX, offsetY) - Drag finished" cssClasses={["dim-label"]} />
                        </GtkBox>
                    </GtkBox>
                </GtkBox>
            </GtkFrame>

            {/* GestureSwipe Signals */}
            <GtkFrame label="GtkGestureSwipe Signals">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={12}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkLabel
                        label="GtkGestureSwipe detects quick swipe movements:"
                        wrap
                        halign={Gtk.Align.START}
                        cssClasses={["dim-label"]}
                    />

                    <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={6}>
                        <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={12}>
                            <GtkLabel label="swipe" widthChars={12} xalign={0} cssClasses={["monospace"]} />
                            <GtkLabel label="(velocityX, velocityY) - Swipe detected" cssClasses={["dim-label"]} />
                        </GtkBox>
                    </GtkBox>

                    <GtkLabel
                        label="Velocity is in pixels/second. Use the sign to determine direction."
                        wrap
                        halign={Gtk.Align.START}
                        cssClasses={["dim-label"]}
                        marginTop={8}
                    />
                </GtkBox>
            </GtkFrame>

            {/* Multi-touch Gestures */}
            <GtkFrame label="Multi-touch Gestures (Zoom & Rotate)">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={12}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkLabel
                        label="GtkGestureZoom and GtkGestureRotate require two touch points:"
                        wrap
                        halign={Gtk.Align.START}
                        cssClasses={["dim-label"]}
                    />

                    <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                        <GtkLabel label="GtkGestureZoom" cssClasses={["heading"]} halign={Gtk.Align.START} />
                        <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={12}>
                            <GtkLabel label="scale-changed" widthChars={14} xalign={0} cssClasses={["monospace"]} />
                            <GtkLabel label="(scale) - Scale factor (1.0 = no change)" cssClasses={["dim-label"]} />
                        </GtkBox>
                    </GtkBox>

                    <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                        <GtkLabel label="GtkGestureRotate" cssClasses={["heading"]} halign={Gtk.Align.START} />
                        <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={12}>
                            <GtkLabel label="angle-changed" widthChars={14} xalign={0} cssClasses={["monospace"]} />
                            <GtkLabel label="(angle, angleDelta) - Rotation in radians" cssClasses={["dim-label"]} />
                        </GtkBox>
                    </GtkBox>

                    <GtkLabel
                        label="Note: Multi-touch gestures work best with touchscreens or trackpads that support multi-touch input."
                        wrap
                        halign={Gtk.Align.START}
                        cssClasses={["dim-label"]}
                        marginTop={8}
                    />
                </GtkBox>
            </GtkFrame>

            {/* Implementation Example */}
            <GtkFrame label="Implementation Example">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={12}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkLabel
                        label="Gestures are added to widgets using addController():"
                        wrap
                        halign={Gtk.Align.START}
                        cssClasses={["dim-label"]}
                    />

                    <GtkLabel
                        label={`const widgetRef = useRef<Gtk.Widget | null>(null);

useEffect(() => {
  if (!widgetRef.current) return;

  // Click gesture
  const click = new Gtk.GestureClick();
  click.connect("pressed", (gesture, nPress, x, y) => {
    console.log(\`Clicked \${nPress}x at (\${x}, \${y})\`);
  });
  widgetRef.current.addController(click);

  // Drag gesture
  const drag = new Gtk.GestureDrag();
  drag.connect("drag-update", (gesture, offsetX, offsetY) => {
    console.log(\`Dragged by (\${offsetX}, \${offsetY})\`);
  });
  widgetRef.current.addController(drag);

  // Swipe gesture
  const swipe = new Gtk.GestureSwipe();
  swipe.connect("swipe", (gesture, vx, vy) => {
    console.log(\`Swiped with velocity (\${vx}, \${vy})\`);
  });
  widgetRef.current.addController(swipe);
}, []);`}
                        cssClasses={["monospace"]}
                        halign={Gtk.Align.START}
                        wrap
                    />
                </GtkBox>
            </GtkFrame>

            {/* Tips */}
            <GtkFrame label="Tips">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={8}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkLabel
                        label="1. Multiple gestures can be attached to the same widget."
                        wrap
                        halign={Gtk.Align.START}
                        cssClasses={["dim-label"]}
                    />
                    <GtkLabel
                        label="2. Use gesture.setButton(0) to respond to any mouse button."
                        wrap
                        halign={Gtk.Align.START}
                        cssClasses={["dim-label"]}
                    />
                    <GtkLabel
                        label="3. Gestures can be grouped to allow simultaneous recognition."
                        wrap
                        halign={Gtk.Align.START}
                        cssClasses={["dim-label"]}
                    />
                    <GtkLabel
                        label="4. Set gesture.setPropagationPhase() to control event handling order."
                        wrap
                        halign={Gtk.Align.START}
                        cssClasses={["dim-label"]}
                    />
                </GtkBox>
            </GtkFrame>
        </GtkBox>
    );
};

const sourceCode = `import { useRef, useEffect } from "react";
import * as Gtk from "@gtkx/ffi/gtk";
import { GtkBox, GtkLabel, GtkDrawingArea } from "@gtkx/react";

const GesturesDemo = () => {
  const areaRef = useRef<Gtk.Widget | null>(null);

  useEffect(() => {
    if (!areaRef.current) return;

    // Click gesture - handles single, double, triple clicks
    const click = new Gtk.GestureClick();
    click.connect("pressed", (gesture, nPress, x, y) => {
      if (nPress === 1) {
        console.log("Single click at", x, y);
      } else if (nPress === 2) {
        console.log("Double click at", x, y);
      }
    });
    areaRef.current.addController(click);

    // Drag gesture - for drawing, moving objects
    const drag = new Gtk.GestureDrag();
    drag.connect("drag-begin", (gesture, startX, startY) => {
      console.log("Drag started at", startX, startY);
    });
    drag.connect("drag-update", (gesture, offsetX, offsetY) => {
      console.log("Dragged by", offsetX, offsetY);
    });
    drag.connect("drag-end", (gesture, offsetX, offsetY) => {
      console.log("Drag ended with offset", offsetX, offsetY);
    });
    areaRef.current.addController(drag);

    // Swipe gesture - for navigation, dismissal
    const swipe = new Gtk.GestureSwipe();
    swipe.connect("swipe", (gesture, velocityX, velocityY) => {
      const direction = Math.abs(velocityX) > Math.abs(velocityY)
        ? (velocityX > 0 ? "right" : "left")
        : (velocityY > 0 ? "down" : "up");
      console.log("Swiped", direction);
    });
    areaRef.current.addController(swipe);

    // Zoom gesture (requires multi-touch)
    const zoom = new Gtk.GestureZoom();
    zoom.connect("scale-changed", (gesture, scale) => {
      console.log("Zoom scale:", scale);
    });
    areaRef.current.addController(zoom);

    // Rotate gesture (requires multi-touch)
    const rotate = new Gtk.GestureRotate();
    rotate.connect("angle-changed", (gesture, angle, delta) => {
      console.log("Rotation:", angle, "radians");
    });
    areaRef.current.addController(rotate);
  }, []);

  return (
    <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={12}>
      <GtkLabel label="Gesture Demo" cssClasses={["title-2"]} />
      <GtkDrawingArea
        ref={areaRef}
        widthRequest={400}
        heightRequest={300}
      />
    </GtkBox>
  );
};`;

export const gesturesDemo: Demo = {
    id: "gestures",
    title: "Touch Gestures",
    description: "Multi-touch gestures (click, drag, swipe, pinch, rotate)",
    keywords: [
        "gesture",
        "touch",
        "swipe",
        "pinch",
        "zoom",
        "rotate",
        "drag",
        "click",
        "GtkGestureClick",
        "GtkGestureDrag",
        "GtkGestureSwipe",
        "GtkGestureZoom",
        "GtkGestureRotate",
        "multi-touch",
    ],
    component: GesturesDemo,
    sourceCode,
};
