import * as Gtk from "@gtkx/ffi/gtk";
import { GtkBox, GtkButton, GtkFrame, GtkLabel, GtkLevelBar, GtkProgressBar } from "@gtkx/react";
import { useEffect, useState } from "react";
import type { Demo } from "../types.js";

const ProgressDemo = () => {
    const [progress, setProgress] = useState(0.4);
    const [isAnimating, setIsAnimating] = useState(false);
    const [levelValue, setLevelValue] = useState(0.6);

    // Animate progress bar
    useEffect(() => {
        if (!isAnimating) return;

        const interval = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 1) {
                    setIsAnimating(false);
                    return 0;
                }
                return prev + 0.02;
            });
        }, 50);

        return () => clearInterval(interval);
    }, [isAnimating]);

    return (
        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={24}>
            <GtkLabel label="Progress Indicators" cssClasses={["title-2"]} halign={Gtk.Align.START} />

            <GtkLabel
                label="GTK4 provides GtkProgressBar for showing task progress and GtkLevelBar for displaying values within a range. Both support horizontal and vertical orientations."
                wrap
                halign={Gtk.Align.START}
                cssClasses={["dim-label"]}
            />

            {/* Basic Progress Bar */}
            <GtkFrame label="Progress Bar">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={12}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkProgressBar fraction={progress} showText hexpand />
                    <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={12} halign={Gtk.Align.CENTER}>
                        <GtkButton
                            label="Start Animation"
                            onClicked={() => {
                                setProgress(0);
                                setIsAnimating(true);
                            }}
                            sensitive={!isAnimating}
                            cssClasses={["suggested-action"]}
                        />
                        <GtkButton
                            label="Reset"
                            onClicked={() => {
                                setIsAnimating(false);
                                setProgress(0);
                            }}
                        />
                    </GtkBox>
                    <GtkLabel
                        label={`Progress: ${Math.round(progress * 100)}%`}
                        cssClasses={["dim-label"]}
                        halign={Gtk.Align.START}
                    />
                </GtkBox>
            </GtkFrame>

            {/* Progress Bar with Text */}
            <GtkFrame label="Progress Bar with Custom Text">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={12}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkProgressBar fraction={0.33} showText text="Downloading... 33%" hexpand />
                    <GtkProgressBar fraction={0.67} showText text="Processing files..." hexpand />
                    <GtkProgressBar fraction={1.0} showText text="Complete!" hexpand />
                </GtkBox>
            </GtkFrame>

            {/* Inverted Progress Bar */}
            <GtkFrame label="Inverted Progress Bar">
                <GtkBox
                    orientation={Gtk.Orientation.HORIZONTAL}
                    spacing={24}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={6} hexpand>
                        <GtkLabel label="Normal" halign={Gtk.Align.START} />
                        <GtkProgressBar fraction={0.7} hexpand />
                    </GtkBox>
                    <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={6} hexpand>
                        <GtkLabel label="Inverted" halign={Gtk.Align.START} />
                        <GtkProgressBar fraction={0.7} inverted hexpand />
                    </GtkBox>
                </GtkBox>
            </GtkFrame>

            {/* Vertical Progress Bar */}
            <GtkFrame label="Vertical Progress Bars">
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
                        <GtkProgressBar orientation={Gtk.Orientation.VERTICAL} fraction={0.25} heightRequest={100} />
                        <GtkLabel label="25%" cssClasses={["dim-label", "caption"]} />
                    </GtkBox>
                    <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={6} halign={Gtk.Align.CENTER}>
                        <GtkProgressBar orientation={Gtk.Orientation.VERTICAL} fraction={0.5} heightRequest={100} />
                        <GtkLabel label="50%" cssClasses={["dim-label", "caption"]} />
                    </GtkBox>
                    <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={6} halign={Gtk.Align.CENTER}>
                        <GtkProgressBar orientation={Gtk.Orientation.VERTICAL} fraction={0.75} heightRequest={100} />
                        <GtkLabel label="75%" cssClasses={["dim-label", "caption"]} />
                    </GtkBox>
                    <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={6} halign={Gtk.Align.CENTER}>
                        <GtkProgressBar orientation={Gtk.Orientation.VERTICAL} fraction={1.0} heightRequest={100} />
                        <GtkLabel label="100%" cssClasses={["dim-label", "caption"]} />
                    </GtkBox>
                </GtkBox>
            </GtkFrame>

            {/* Level Bar - Continuous Mode */}
            <GtkFrame label="Level Bar (Continuous)">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={12}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkLevelBar
                        value={levelValue}
                        minValue={0}
                        maxValue={1}
                        mode={Gtk.LevelBarMode.CONTINUOUS}
                        hexpand
                    />
                    <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={12} halign={Gtk.Align.CENTER}>
                        <GtkButton label="-" onClicked={() => setLevelValue(Math.max(0, levelValue - 0.1))} />
                        <GtkLabel label={`${Math.round(levelValue * 100)}%`} widthRequest={50} />
                        <GtkButton label="+" onClicked={() => setLevelValue(Math.min(1, levelValue + 0.1))} />
                    </GtkBox>
                </GtkBox>
            </GtkFrame>

            {/* Level Bar - Discrete Mode */}
            <GtkFrame label="Level Bar (Discrete)">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={12}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkLabel label="Rating (1-5 stars):" halign={Gtk.Align.START} />
                    <GtkLevelBar value={3} minValue={0} maxValue={5} mode={Gtk.LevelBarMode.DISCRETE} hexpand />
                    <GtkLabel label="Skill Level (1-10):" halign={Gtk.Align.START} marginTop={12} />
                    <GtkLevelBar value={7} minValue={0} maxValue={10} mode={Gtk.LevelBarMode.DISCRETE} hexpand />
                </GtkBox>
            </GtkFrame>

            {/* Vertical Level Bars */}
            <GtkFrame label="Vertical Level Bars">
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
                        <GtkLevelBar
                            orientation={Gtk.Orientation.VERTICAL}
                            value={0.3}
                            minValue={0}
                            maxValue={1}
                            heightRequest={100}
                            inverted
                        />
                        <GtkLabel label="Low" cssClasses={["dim-label", "caption"]} />
                    </GtkBox>
                    <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={6} halign={Gtk.Align.CENTER}>
                        <GtkLevelBar
                            orientation={Gtk.Orientation.VERTICAL}
                            value={0.6}
                            minValue={0}
                            maxValue={1}
                            heightRequest={100}
                            inverted
                        />
                        <GtkLabel label="Medium" cssClasses={["dim-label", "caption"]} />
                    </GtkBox>
                    <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={6} halign={Gtk.Align.CENTER}>
                        <GtkLevelBar
                            orientation={Gtk.Orientation.VERTICAL}
                            value={0.9}
                            minValue={0}
                            maxValue={1}
                            heightRequest={100}
                            inverted
                        />
                        <GtkLabel label="High" cssClasses={["dim-label", "caption"]} />
                    </GtkBox>
                </GtkBox>
            </GtkFrame>
        </GtkBox>
    );
};

const sourceCode = `import { useState, useEffect } from "react";
import * as Gtk from "@gtkx/ffi/gtk";
import { GtkBox, GtkProgressBar, GtkLevelBar, GtkButton, GtkLabel } from "@gtkx/react";

const ProgressDemo = () => {
  const [progress, setProgress] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (!isAnimating) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 1) {
          setIsAnimating(false);
          return 0;
        }
        return prev + 0.02;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isAnimating]);

  return (
    <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={12}>
      {/* Progress bar with animation */}
      <GtkProgressBar fraction={progress} showText />
      <GtkButton
        label="Start"
        onClicked={() => setIsAnimating(true)}
      />

      {/* Progress bar with custom text */}
      <GtkProgressBar
        fraction={0.5}
        showText
        text="Downloading..."
      />

      {/* Continuous level bar */}
      <GtkLevelBar
        value={0.7}
        minValue={0}
        maxValue={1}
        mode={Gtk.LevelBarMode.CONTINUOUS}
      />

      {/* Discrete level bar (rating style) */}
      <GtkLevelBar
        value={3}
        minValue={0}
        maxValue={5}
        mode={Gtk.LevelBarMode.DISCRETE}
      />

      {/* Vertical progress bar */}
      <GtkProgressBar
        orientation={Gtk.Orientation.VERTICAL}
        fraction={0.5}
        heightRequest={100}
      />
    </GtkBox>
  );
};`;

export const progressDemo: Demo = {
    id: "progress",
    title: "Progress",
    description: "Progress bars and level indicators",
    keywords: ["progress", "progressbar", "levelbar", "GtkProgressBar", "GtkLevelBar", "loading", "meter", "rating"],
    component: ProgressDemo,
    sourceCode,
};
