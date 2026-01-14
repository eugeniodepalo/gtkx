import * as Gtk from "@gtkx/ffi/gtk";
import { GtkBox, GtkFrame, GtkLabel, GtkSpinButton, x } from "@gtkx/react";
import { useState } from "react";
import type { Demo } from "../types.js";
import sourceCode from "./spinbutton.tsx?raw";

const SpinButtonDemo = () => {
    const [basicValue, setBasicValue] = useState(50);
    const [floatValue, setFloatValue] = useState(2.5);
    const [hours, setHours] = useState(12);
    const [minutes, setMinutes] = useState(0);
    const [seconds, setSeconds] = useState(0);

    return (
        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={24}>
            <GtkLabel label="Spin Button" cssClasses={["title-2"]} halign={Gtk.Align.START} />

            <GtkLabel
                label="GtkSpinButton allows numeric input with increment/decrement buttons. It supports integer and floating-point values with configurable ranges and step sizes."
                wrap
                halign={Gtk.Align.START}
                cssClasses={["dim-label"]}
            />

            <GtkFrame label="Basic Integer">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={12}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkBox spacing={12}>
                        <GtkLabel label="Value (0-100):" halign={Gtk.Align.START} hexpand />
                        <GtkSpinButton digits={0} climbRate={1}>
                            <x.Adjustment
                                value={basicValue}
                                lower={0}
                                upper={100}
                                stepIncrement={1}
                                pageIncrement={10}
                                onValueChange={setBasicValue}
                            />
                        </GtkSpinButton>
                    </GtkBox>
                    <GtkLabel
                        label={`Current value: ${basicValue}`}
                        halign={Gtk.Align.START}
                        cssClasses={["dim-label"]}
                    />
                </GtkBox>
            </GtkFrame>

            <GtkFrame label="Floating Point">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={12}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkBox spacing={12}>
                        <GtkLabel label="Value (0.0-10.0):" halign={Gtk.Align.START} hexpand />
                        <GtkSpinButton digits={2} climbRate={0.1}>
                            <x.Adjustment
                                value={floatValue}
                                lower={0}
                                upper={10}
                                stepIncrement={0.1}
                                pageIncrement={1}
                                onValueChange={setFloatValue}
                            />
                        </GtkSpinButton>
                    </GtkBox>
                    <GtkLabel
                        label={`Current value: ${floatValue.toFixed(2)}`}
                        halign={Gtk.Align.START}
                        cssClasses={["dim-label"]}
                    />
                </GtkBox>
            </GtkFrame>

            <GtkFrame label="Time Input">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={12}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkBox spacing={6} halign={Gtk.Align.CENTER}>
                        <GtkSpinButton digits={0} climbRate={1} wrap widthChars={2}>
                            <x.Adjustment
                                value={hours}
                                lower={0}
                                upper={23}
                                stepIncrement={1}
                                pageIncrement={6}
                                onValueChange={setHours}
                            />
                        </GtkSpinButton>
                        <GtkLabel label=":" />
                        <GtkSpinButton digits={0} climbRate={1} wrap widthChars={2}>
                            <x.Adjustment
                                value={minutes}
                                lower={0}
                                upper={59}
                                stepIncrement={1}
                                pageIncrement={10}
                                onValueChange={setMinutes}
                            />
                        </GtkSpinButton>
                        <GtkLabel label=":" />
                        <GtkSpinButton digits={0} climbRate={1} wrap widthChars={2}>
                            <x.Adjustment
                                value={seconds}
                                lower={0}
                                upper={59}
                                stepIncrement={1}
                                pageIncrement={10}
                                onValueChange={setSeconds}
                            />
                        </GtkSpinButton>
                    </GtkBox>
                    <GtkLabel
                        label={`Time: ${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`}
                        halign={Gtk.Align.CENTER}
                        cssClasses={["dim-label"]}
                    />
                </GtkBox>
            </GtkFrame>
        </GtkBox>
    );
};

export const spinbuttonDemo: Demo = {
    id: "spinbutton",
    title: "Spin Buttons",
    description: "Numeric input with increment/decrement buttons",
    keywords: ["spin", "number", "input", "numeric", "GtkSpinButton", "integer", "float", "time"],
    component: SpinButtonDemo,
    sourceCode,
};
