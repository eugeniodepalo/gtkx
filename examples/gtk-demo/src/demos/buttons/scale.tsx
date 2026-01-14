import * as Gtk from "@gtkx/ffi/gtk";
import { GtkBox, GtkFrame, GtkLabel, GtkScale, x } from "@gtkx/react";
import { useState } from "react";
import type { Demo } from "../types.js";
import sourceCode from "./scale.tsx?raw";

const ScaleDemo = () => {
    const [horizontalValue, setHorizontalValue] = useState(50);
    const [verticalValue, setVerticalValue] = useState(25);
    const [markedValue, setMarkedValue] = useState(0);

    return (
        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={24}>
            <GtkLabel label="Scale" cssClasses={["title-2"]} halign={Gtk.Align.START} />

            <GtkLabel
                label="GtkScale is a slider widget for selecting a numeric value from a range. It can be horizontal or vertical and supports marks for indicating specific values."
                wrap
                halign={Gtk.Align.START}
                cssClasses={["dim-label"]}
            />

            <GtkFrame label="Horizontal Scale">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={12}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkScale drawValue valuePos={Gtk.PositionType.TOP} hexpand>
                        <x.Adjustment
                            value={50}
                            lower={0}
                            upper={100}
                            stepIncrement={1}
                            pageIncrement={10}
                            onValueChanged={setHorizontalValue}
                        />
                    </GtkScale>
                    <GtkLabel
                        label={`Value: ${Math.round(horizontalValue)}`}
                        halign={Gtk.Align.START}
                        cssClasses={["dim-label"]}
                    />
                </GtkBox>
            </GtkFrame>

            <GtkFrame label="Vertical Scale">
                <GtkBox spacing={24} marginTop={12} marginBottom={12} marginStart={12} marginEnd={12}>
                    <GtkScale
                        orientation={Gtk.Orientation.VERTICAL}
                        drawValue
                        valuePos={Gtk.PositionType.LEFT}
                        inverted
                        heightRequest={150}
                    >
                        <x.Adjustment
                            value={25}
                            lower={0}
                            upper={100}
                            stepIncrement={1}
                            pageIncrement={10}
                            onValueChanged={setVerticalValue}
                        />
                    </GtkScale>
                    <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={6} valign={Gtk.Align.CENTER}>
                        <GtkLabel label="Volume Control" cssClasses={["heading"]} />
                        <GtkLabel label={`Level: ${Math.round(verticalValue)}%`} cssClasses={["dim-label"]} />
                    </GtkBox>
                </GtkBox>
            </GtkFrame>

            <GtkFrame label="Scale with Origin">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={12}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkScale drawValue hasOrigin hexpand>
                        <x.Adjustment
                            value={0}
                            lower={-10}
                            upper={10}
                            stepIncrement={1}
                            pageIncrement={5}
                            onValueChanged={setMarkedValue}
                        />
                    </GtkScale>
                    <GtkLabel
                        label={`Temperature offset: ${markedValue > 0 ? "+" : ""}${Math.round(markedValue)}`}
                        halign={Gtk.Align.START}
                        cssClasses={["dim-label"]}
                    />
                </GtkBox>
            </GtkFrame>

            <GtkFrame label="Minimal Scale">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={12}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkBox spacing={12}>
                        <GtkLabel label="Brightness:" halign={Gtk.Align.START} />
                        <GtkScale hexpand>
                            <x.Adjustment value={50} lower={0} upper={100} stepIncrement={1} pageIncrement={10} />
                        </GtkScale>
                    </GtkBox>
                </GtkBox>
            </GtkFrame>
        </GtkBox>
    );
};

export const scaleDemo: Demo = {
    id: "scale",
    title: "Scales",
    description: "Slider widget for selecting numeric values",
    keywords: ["scale", "slider", "range", "GtkScale", "horizontal", "vertical", "marks", "value"],
    component: ScaleDemo,
    sourceCode,
};
