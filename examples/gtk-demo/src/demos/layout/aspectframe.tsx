import * as Gtk from "@gtkx/ffi/gtk";
import { GtkAspectFrame, GtkBox, GtkFrame, GtkImage, GtkLabel, GtkScale, x } from "@gtkx/react";
import { useState } from "react";
import type { Demo } from "../types.js";
import sourceCode from "./aspectframe.tsx?raw";

const AspectFrameDemo = () => {
    const [ratio, setRatio] = useState(1.5);

    return (
        <GtkBox
            orientation={Gtk.Orientation.VERTICAL}
            spacing={20}
            marginStart={20}
            marginEnd={20}
            marginTop={20}
            marginBottom={20}
        >
            <GtkLabel label="Aspect Frame" cssClasses={["title-2"]} halign={Gtk.Align.START} />

            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                <GtkLabel label="About GtkAspectFrame" cssClasses={["heading"]} halign={Gtk.Align.START} />
                <GtkLabel
                    label="GtkAspectFrame ensures its child maintains a specific aspect ratio. The child is centered and sized to fit within the frame while preserving the ratio."
                    wrap
                    cssClasses={["dim-label"]}
                    halign={Gtk.Align.START}
                />
            </GtkBox>

            <GtkFrame label="Adjustable Aspect Ratio">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={16}
                    marginStart={16}
                    marginEnd={16}
                    marginTop={16}
                    marginBottom={16}
                >
                    <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                        <GtkLabel label={`Aspect Ratio: ${ratio.toFixed(2)}`} halign={Gtk.Align.START} />
                        <GtkScale orientation={Gtk.Orientation.HORIZONTAL} digits={2} drawValue>
                            <x.Adjustment
                                value={ratio}
                                lower={0.2}
                                upper={5.0}
                                stepIncrement={0.1}
                                pageIncrement={0.5}
                                onValueChanged={setRatio}
                            />
                        </GtkScale>
                    </GtkBox>

                    <GtkBox spacing={24} halign={Gtk.Align.CENTER} vexpand heightRequest={200}>
                        <GtkAspectFrame ratio={ratio} xalign={0.5} yalign={0.5} obeyChild={false}>
                            <GtkBox cssClasses={["card"]} vexpand hexpand>
                                <GtkLabel
                                    label="This label maintains the specified aspect ratio. Drag the slider to change it. The content is always centered within the available space."
                                    wrap
                                    maxWidthChars={30}
                                    marginStart={12}
                                    marginEnd={12}
                                    marginTop={12}
                                    marginBottom={12}
                                />
                            </GtkBox>
                        </GtkAspectFrame>
                    </GtkBox>
                </GtkBox>
            </GtkFrame>

            <GtkFrame label="Natural Aspect Ratio (obeyChild=true)">
                <GtkBox
                    spacing={24}
                    marginStart={16}
                    marginEnd={16}
                    marginTop={16}
                    marginBottom={16}
                    halign={Gtk.Align.CENTER}
                >
                    <GtkAspectFrame ratio={0} xalign={0.5} yalign={0.5} obeyChild>
                        <GtkImage iconName="org.gtk.Demo4" pixelSize={128} cssClasses={["icon-dropshadow"]} />
                    </GtkAspectFrame>
                    <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8} valign={Gtk.Align.CENTER}>
                        <GtkLabel label="Image with Natural Ratio" cssClasses={["heading"]} />
                        <GtkLabel
                            label="When obeyChild is true, the aspect frame uses the child's natural aspect ratio instead of a fixed value."
                            wrap
                            maxWidthChars={40}
                            cssClasses={["dim-label"]}
                        />
                    </GtkBox>
                </GtkBox>
            </GtkFrame>

            <GtkFrame label="Common Aspect Ratios">
                <GtkBox
                    spacing={16}
                    marginStart={16}
                    marginEnd={16}
                    marginTop={16}
                    marginBottom={16}
                    halign={Gtk.Align.CENTER}
                >
                    <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={4} halign={Gtk.Align.CENTER}>
                        <GtkAspectFrame ratio={1} xalign={0.5} yalign={0.5} obeyChild={false}>
                            <GtkBox cssClasses={["card"]} widthRequest={80} heightRequest={80}>
                                <GtkLabel label="1:1" halign={Gtk.Align.CENTER} valign={Gtk.Align.CENTER} hexpand />
                            </GtkBox>
                        </GtkAspectFrame>
                        <GtkLabel label="Square" cssClasses={["dim-label", "caption"]} />
                    </GtkBox>

                    <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={4} halign={Gtk.Align.CENTER}>
                        <GtkAspectFrame ratio={4 / 3} xalign={0.5} yalign={0.5} obeyChild={false}>
                            <GtkBox cssClasses={["card"]} widthRequest={107} heightRequest={80}>
                                <GtkLabel label="4:3" halign={Gtk.Align.CENTER} valign={Gtk.Align.CENTER} hexpand />
                            </GtkBox>
                        </GtkAspectFrame>
                        <GtkLabel label="Standard" cssClasses={["dim-label", "caption"]} />
                    </GtkBox>

                    <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={4} halign={Gtk.Align.CENTER}>
                        <GtkAspectFrame ratio={16 / 9} xalign={0.5} yalign={0.5} obeyChild={false}>
                            <GtkBox cssClasses={["card"]} widthRequest={142} heightRequest={80}>
                                <GtkLabel label="16:9" halign={Gtk.Align.CENTER} valign={Gtk.Align.CENTER} hexpand />
                            </GtkBox>
                        </GtkAspectFrame>
                        <GtkLabel label="Widescreen" cssClasses={["dim-label", "caption"]} />
                    </GtkBox>

                    <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={4} halign={Gtk.Align.CENTER}>
                        <GtkAspectFrame ratio={21 / 9} xalign={0.5} yalign={0.5} obeyChild={false}>
                            <GtkBox cssClasses={["card"]} widthRequest={187} heightRequest={80}>
                                <GtkLabel label="21:9" halign={Gtk.Align.CENTER} valign={Gtk.Align.CENTER} hexpand />
                            </GtkBox>
                        </GtkAspectFrame>
                        <GtkLabel label="Ultrawide" cssClasses={["dim-label", "caption"]} />
                    </GtkBox>
                </GtkBox>
            </GtkFrame>

            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                <GtkLabel label="Key Properties" cssClasses={["heading"]} halign={Gtk.Align.START} />
                <GtkLabel
                    label="ratio: The aspect ratio (width/height). xalign/yalign: Alignment within frame (0.0-1.0). obeyChild: If true, use child's natural aspect ratio."
                    wrap
                    cssClasses={["dim-label"]}
                    halign={Gtk.Align.START}
                />
            </GtkBox>
        </GtkBox>
    );
};

export const aspectFrameDemo: Demo = {
    id: "aspectframe",
    title: "Aspect Frame",
    description: "Maintains child aspect ratio within available space.",
    keywords: ["aspect", "ratio", "frame", "resize", "GtkAspectFrame", "proportion", "layout"],
    component: AspectFrameDemo,
    sourceCode,
};
