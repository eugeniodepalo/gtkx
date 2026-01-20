import { getNativeObject } from "@gtkx/ffi";
import * as Gtk from "@gtkx/ffi/gtk";
import { GtkBox, GtkFrame, GtkImage, GtkLabel, GtkPicture, GtkToggleButton, GtkVideo } from "@gtkx/react";
import { useEffect, useRef, useState } from "react";
import type { Demo } from "../types.js";
import sourceCode from "./images.tsx?raw";

const ImagesDemo = () => {
    const [insensitive, setInsensitive] = useState(false);
    const [widgetPaintable, setWidgetPaintable] = useState<Gtk.WidgetPaintable | null>(null);
    const boxRef = useRef<Gtk.Box | null>(null);

    useEffect(() => {
        if (boxRef.current) {
            const root = boxRef.current.getRoot();
            if (root) {
                const window = getNativeObject(root.handle, Gtk.Window);
                if (window) {
                    const paintable = new Gtk.WidgetPaintable(window);
                    setWidgetPaintable(paintable);
                }
            }
        }
    }, []);

    return (
        <GtkBox
            ref={boxRef}
            orientation={Gtk.Orientation.VERTICAL}
            spacing={8}
            marginStart={16}
            marginEnd={16}
            marginTop={16}
            marginBottom={16}
        >
            <GtkBox spacing={16}>
                <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                    <GtkLabel label="Image from icon theme" cssClasses={["heading"]} />
                    <GtkFrame halign={Gtk.Align.CENTER} valign={Gtk.Align.CENTER}>
                        <GtkImage
                            iconName="org.gnome.Settings-symbolic"
                            iconSize={Gtk.IconSize.LARGE}
                            sensitive={!insensitive}
                        />
                    </GtkFrame>
                </GtkBox>

                <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                    <GtkLabel label="Symbolic themed icon" cssClasses={["heading"]} />
                    <GtkFrame halign={Gtk.Align.CENTER} valign={Gtk.Align.CENTER}>
                        <GtkImage
                            iconName="battery-level-10-charging-symbolic"
                            iconSize={Gtk.IconSize.LARGE}
                            sensitive={!insensitive}
                        />
                    </GtkFrame>
                </GtkBox>

                <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                    <GtkLabel label="Displaying video" cssClasses={["heading"]} />
                    <GtkFrame halign={Gtk.Align.CENTER} valign={Gtk.Align.CENTER}>
                        <GtkVideo autoplay loop widthRequest={200} heightRequest={150} sensitive={!insensitive} />
                    </GtkFrame>
                </GtkBox>

                <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                    <GtkLabel label="GtkWidgetPaintable" cssClasses={["heading"]} />
                    <GtkPicture
                        paintable={widgetPaintable}
                        widthRequest={100}
                        heightRequest={100}
                        canShrink
                        valign={Gtk.Align.START}
                        sensitive={!insensitive}
                    />
                </GtkBox>
            </GtkBox>

            <GtkToggleButton
                label="_Insensitive"
                useUnderline
                halign={Gtk.Align.START}
                active={insensitive}
                onToggled={(btn) => setInsensitive(btn.getActive())}
            />
        </GtkBox>
    );
};

export const imagesDemo: Demo = {
    id: "images",
    title: "Images",
    description:
        "GtkImage and GtkPicture are used to display an image; the image can be in a number of formats. GtkImage is the widget used to display icons or images that should be sized and styled like an icon, while GtkPicture is used for images that should be displayed as-is.",
    keywords: ["GdkPaintable", "GtkWidgetPaintable", "GtkImage", "GtkPicture", "GtkVideo"],
    component: ImagesDemo,
    sourceCode,
};
