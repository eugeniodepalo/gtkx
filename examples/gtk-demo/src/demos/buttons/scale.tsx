import * as Gtk from "@gtkx/ffi/gtk";
import { GtkBox, GtkFrame, GtkLabel, GtkScale } from "@gtkx/react";
import { useMemo, useState } from "react";
import type { Demo } from "../types.js";

const ScaleDemo = () => {
    const [horizontalValue, setHorizontalValue] = useState(50);
    const [verticalValue, setVerticalValue] = useState(25);
    const [markedValue, setMarkedValue] = useState(0);

    // Create adjustments for scales
    const horizontalAdjustment = useMemo(() => new Gtk.Adjustment(50, 0, 100, 1, 10, 0), []);
    const verticalAdjustment = useMemo(() => new Gtk.Adjustment(25, 0, 100, 1, 10, 0), []);
    const markedAdjustment = useMemo(() => new Gtk.Adjustment(0, -10, 10, 1, 5, 0), []);
    const brightnessAdjustment = useMemo(() => new Gtk.Adjustment(50, 0, 100, 1, 10, 0), []);

    return (
        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={24}>
            <GtkLabel label="Scale" cssClasses={["title-2"]} halign={Gtk.Align.START} />

            <GtkLabel
                label="GtkScale is a slider widget for selecting a numeric value from a range. It can be horizontal or vertical and supports marks for indicating specific values."
                wrap
                halign={Gtk.Align.START}
                cssClasses={["dim-label"]}
            />

            {/* Horizontal Scale */}
            <GtkFrame label="Horizontal Scale">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={12}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkScale
                        orientation={Gtk.Orientation.HORIZONTAL}
                        onValueChanged={(scale: Gtk.Range) => setHorizontalValue(scale.getValue())}
                        adjustment={horizontalAdjustment}
                        drawValue
                        valuePos={Gtk.PositionType.TOP}
                        hexpand
                    />
                    <GtkLabel
                        label={`Value: ${Math.round(horizontalValue)}`}
                        halign={Gtk.Align.START}
                        cssClasses={["dim-label"]}
                    />
                </GtkBox>
            </GtkFrame>

            {/* Vertical Scale */}
            <GtkFrame label="Vertical Scale">
                <GtkBox
                    orientation={Gtk.Orientation.HORIZONTAL}
                    spacing={24}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkScale
                        orientation={Gtk.Orientation.VERTICAL}
                        onValueChanged={(scale: Gtk.Range) => setVerticalValue(scale.getValue())}
                        adjustment={verticalAdjustment}
                        drawValue
                        valuePos={Gtk.PositionType.LEFT}
                        inverted
                        heightRequest={150}
                    />
                    <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={6} valign={Gtk.Align.CENTER}>
                        <GtkLabel label="Volume Control" cssClasses={["heading"]} />
                        <GtkLabel label={`Level: ${Math.round(verticalValue)}%`} cssClasses={["dim-label"]} />
                    </GtkBox>
                </GtkBox>
            </GtkFrame>

            {/* Scale with Origin */}
            <GtkFrame label="Scale with Origin">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={12}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkScale
                        orientation={Gtk.Orientation.HORIZONTAL}
                        onValueChanged={(scale: Gtk.Range) => setMarkedValue(scale.getValue())}
                        adjustment={markedAdjustment}
                        drawValue
                        hasOrigin
                        hexpand
                    />
                    <GtkLabel
                        label={`Temperature offset: ${markedValue > 0 ? "+" : ""}${Math.round(markedValue)}`}
                        halign={Gtk.Align.START}
                        cssClasses={["dim-label"]}
                    />
                </GtkBox>
            </GtkFrame>

            {/* Scale without value display */}
            <GtkFrame label="Minimal Scale">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={12}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={12}>
                        <GtkLabel label="Brightness:" halign={Gtk.Align.START} />
                        <GtkScale
                            orientation={Gtk.Orientation.HORIZONTAL}
                            adjustment={brightnessAdjustment}
                            drawValue={false}
                            hexpand
                        />
                    </GtkBox>
                </GtkBox>
            </GtkFrame>
        </GtkBox>
    );
};

const sourceCode = `import { useState } from "react";
import * as Gtk from "@gtkx/ffi/gtk";
import { GtkBox, GtkScale, GtkLabel, GtkFrame } from "@gtkx/react";

const ScaleDemo = () => {
  const [horizontalValue, setHorizontalValue] = useState(50);
  const [verticalValue, setVerticalValue] = useState(25);
  const [markedValue, setMarkedValue] = useState(0);

  return (
    <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={24}>
      {/* Horizontal Scale with value display */}
      <GtkScale
        orientation={Gtk.Orientation.HORIZONTAL}
        value={horizontalValue}
        onValueChanged={setHorizontalValue}
        adjustment={{ lower: 0, upper: 100, stepIncrement: 1, pageIncrement: 10 }}
        drawValue
        valuePos={Gtk.PositionType.TOP}
      />

      {/* Vertical Scale (inverted for volume-style) */}
      <GtkScale
        orientation={Gtk.Orientation.VERTICAL}
        value={verticalValue}
        onValueChanged={setVerticalValue}
        adjustment={{ lower: 0, upper: 100, stepIncrement: 1 }}
        drawValue
        inverted
        heightRequest={150}
      />

      {/* Scale with marks */}
      <GtkScale
        orientation={Gtk.Orientation.HORIZONTAL}
        value={markedValue}
        onValueChanged={setMarkedValue}
        adjustment={{ lower: -10, upper: 10, stepIncrement: 1 }}
        drawValue
        hasOrigin
        marks={[
          { value: -10, position: Gtk.PositionType.BOTTOM, markup: "Cold" },
          { value: 0, position: Gtk.PositionType.BOTTOM, markup: "Normal" },
          { value: 10, position: Gtk.PositionType.BOTTOM, markup: "Hot" },
        ]}
      />

      {/* Minimal scale without value */}
      <GtkScale
        orientation={Gtk.Orientation.HORIZONTAL}
        adjustment={{ lower: 0, upper: 100, stepIncrement: 1 }}
        drawValue={false}
      />
    </GtkBox>
  );
};`;

export const scaleDemo: Demo = {
    id: "scale",
    title: "Scale",
    description: "Slider widget for selecting numeric values",
    keywords: ["scale", "slider", "range", "GtkScale", "horizontal", "vertical", "marks", "value"],
    component: ScaleDemo,
    sourceCode,
};
