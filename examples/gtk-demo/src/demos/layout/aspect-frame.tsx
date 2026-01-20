import { injectGlobal } from "@gtkx/css";
import * as Gdk from "@gtkx/ffi/gdk";
import * as Gtk from "@gtkx/ffi/gtk";
import { GtkAspectFrame, GtkBox, GtkLabel, GtkPicture, GtkScale } from "@gtkx/react";
import { useMemo, useState } from "react";
import type { Demo } from "../types.js";
import sourceCode from "./aspect-frame.tsx?raw";

injectGlobal`
.aspect-frame-demo aspectframe {
    margin: 6px;
    border: 1px dotted red;
}

.aspect-frame-demo aspectframe > * {
    border: 1px dotted blue;
}
`;

const LABEL_TEXT =
    "This wrapping label is always given a specific aspect ratio by the aspect frame. The specific aspect ratio can be controlled by dragging the slider. The picture is always given its natural aspect ratio. Try resizing the window to see how the two aspect frames react to different available sizes, and how the box distributes space between them.";

const AspectFrameDemo = () => {
    const [ratio, setRatio] = useState(1.5);

    const texture = useMemo(() => {
        return Gdk.Texture.newFromFilename(new URL("./ducky.png", import.meta.url).pathname);
    }, []);

    return (
        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={12} cssClasses={["aspect-frame-demo"]}>
            <GtkScale
                orientation={Gtk.Orientation.HORIZONTAL}
                digits={2}
                drawValue
                value={ratio}
                lower={0.2}
                upper={5.0}
                stepIncrement={0.1}
                pageIncrement={0.5}
                onValueChanged={setRatio}
            />
            <GtkBox vexpand>
                <GtkAspectFrame ratio={ratio} xalign={0.5} yalign={0.5} obeyChild={false} hexpand>
                    <GtkLabel label={LABEL_TEXT} wrap maxWidthChars={50} />
                </GtkAspectFrame>
                <GtkAspectFrame ratio={0} xalign={0.5} yalign={0.5} obeyChild>
                    <GtkPicture paintable={texture} />
                </GtkAspectFrame>
            </GtkBox>
        </GtkBox>
    );
};

export const aspectFrameDemo: Demo = {
    id: "aspect-frame",
    title: "Aspect Frame",
    description: "GtkAspectFrame makes sure its child gets a specific aspect ratio.",
    keywords: ["aspect", "ratio", "frame", "GtkAspectFrame"],
    component: AspectFrameDemo,
    sourceCode,
};
