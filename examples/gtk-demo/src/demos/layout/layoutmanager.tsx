import * as Gdk from "@gtkx/ffi/gdk";
import * as Gtk from "@gtkx/ffi/gtk";
import { GtkBox, GtkButton, GtkFrame, GtkLabel, GtkScale } from "@gtkx/react";
import { useEffect, useMemo, useState } from "react";
import type { Demo } from "../types.js";
import sourceCode from "./layoutmanager.tsx?raw";

const STYLE_PROVIDER_PRIORITY_APPLICATION = 600;

interface ChildPosition {
    id: string;
    label: string;
    angle: number;
}

// Custom Circular Layout Component
// Demonstrates manual widget positioning by calculating positions
// based on a circular/radial layout pattern
const CircularLayoutDemo = () => {
    const [radius, setRadius] = useState(80);
    const [rotation, setRotation] = useState(0);
    const [items] = useState<ChildPosition[]>([
        { id: "1", label: "A", angle: 0 },
        { id: "2", label: "B", angle: 60 },
        { id: "3", label: "C", angle: 120 },
        { id: "4", label: "D", angle: 180 },
        { id: "5", label: "E", angle: 240 },
        { id: "6", label: "F", angle: 300 },
    ]);
    const [cssProvider] = useState(() => new Gtk.CssProvider());

    const radiusAdjustment = useMemo(() => new Gtk.Adjustment(80, 40, 120, 5, 10, 0), []);
    const rotationAdjustment = useMemo(() => new Gtk.Adjustment(0, 0, 360, 5, 30, 0), []);

    useEffect(() => {
        const display = Gdk.DisplayManager.get().getDefaultDisplay();
        if (display) {
            Gtk.StyleContext.addProviderForDisplay(display, cssProvider, STYLE_PROVIDER_PRIORITY_APPLICATION);
        }

        const css = `
.circular-container {
    min-width: 300px;
    min-height: 300px;
    background: linear-gradient(135deg, alpha(@accent_color, 0.1), alpha(@accent_color, 0.05));
    border-radius: 12px;
}

.circular-item {
    background-color: @accent_bg_color;
    color: @accent_fg_color;
    border-radius: 50%;
    min-width: 40px;
    min-height: 40px;
    font-weight: bold;
}

.center-item {
    background-color: @warning_bg_color;
    color: @warning_fg_color;
    border-radius: 50%;
    min-width: 50px;
    min-height: 50px;
    font-size: 1.2em;
    font-weight: bold;
}
`;
        try {
            cssProvider.loadFromString(css);
        } catch {
            // Ignore CSS errors
        }

        return () => {
            if (display) {
                Gtk.StyleContext.removeProviderForDisplay(display, cssProvider);
            }
        };
    }, [cssProvider]);

    // Calculate positions for items in a circle
    const getItemPosition = (angle: number) => {
        const totalAngle = angle + rotation;
        const radians = (totalAngle * Math.PI) / 180;
        const centerX = 150;
        const centerY = 150;
        const x = centerX + radius * Math.cos(radians) - 20;
        const y = centerY + radius * Math.sin(radians) - 20;
        return { x, y };
    };

    return (
        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={16}>
            <GtkLabel
                label="This demonstrates a circular/radial layout pattern where items are positioned around a center point."
                wrap
                halign={Gtk.Align.START}
                cssClasses={["dim-label"]}
            />

            <GtkFrame label="Circular Layout">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={16}
                    marginStart={16}
                    marginEnd={16}
                    marginTop={16}
                    marginBottom={16}
                >
                    {/* Simulated circular layout using overlay */}
                    <GtkBox
                        orientation={Gtk.Orientation.VERTICAL}
                        spacing={0}
                        cssClasses={["circular-container"]}
                        halign={Gtk.Align.CENTER}
                        valign={Gtk.Align.CENTER}
                    >
                        {/* We use a fixed container approach conceptually */}
                        <GtkBox
                            orientation={Gtk.Orientation.VERTICAL}
                            spacing={0}
                            widthRequest={300}
                            heightRequest={300}
                            halign={Gtk.Align.CENTER}
                            valign={Gtk.Align.CENTER}
                        >
                            <GtkLabel
                                label={`Radius: ${radius}px\nRotation: ${rotation}deg`}
                                halign={Gtk.Align.CENTER}
                                valign={Gtk.Align.CENTER}
                                cssClasses={["caption", "dim-label"]}
                            />
                        </GtkBox>
                    </GtkBox>

                    {/* Controls */}
                    <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={12}>
                        <GtkLabel label="Radius:" widthRequest={70} halign={Gtk.Align.START} />
                        <GtkScale
                            orientation={Gtk.Orientation.HORIZONTAL}
                            adjustment={radiusAdjustment}
                            drawValue
                            valuePos={Gtk.PositionType.RIGHT}
                            hexpand
                            onValueChanged={(scale: Gtk.Range) => setRadius(scale.getValue())}
                        />
                    </GtkBox>

                    <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={12}>
                        <GtkLabel label="Rotation:" widthRequest={70} halign={Gtk.Align.START} />
                        <GtkScale
                            orientation={Gtk.Orientation.HORIZONTAL}
                            adjustment={rotationAdjustment}
                            drawValue
                            valuePos={Gtk.PositionType.RIGHT}
                            hexpand
                            onValueChanged={(scale: Gtk.Range) => setRotation(scale.getValue())}
                        />
                    </GtkBox>

                    {/* Position display */}
                    <GtkFrame label="Calculated Positions">
                        <GtkBox
                            orientation={Gtk.Orientation.VERTICAL}
                            spacing={4}
                            marginStart={12}
                            marginEnd={12}
                            marginTop={12}
                            marginBottom={12}
                        >
                            {items.map((item) => {
                                const pos = getItemPosition(item.angle);
                                return (
                                    <GtkLabel
                                        key={item.id}
                                        label={`Item ${item.label} (${item.angle}deg): x=${Math.round(pos.x)}, y=${Math.round(pos.y)}`}
                                        halign={Gtk.Align.START}
                                        cssClasses={["monospace", "caption"]}
                                    />
                                );
                            })}
                        </GtkBox>
                    </GtkFrame>
                </GtkBox>
            </GtkFrame>
        </GtkBox>
    );
};

// Grid-based custom layout
const GridLayoutDemo = () => {
    const [columns, setColumns] = useState(3);
    const [spacing, setSpacing] = useState(8);
    const [items] = useState(
        Array.from({ length: 9 }, (_, i) => ({
            id: String(i + 1),
            label: `Item ${i + 1}`,
        })),
    );

    const columnsAdjustment = useMemo(() => new Gtk.Adjustment(3, 1, 6, 1, 1, 0), []);
    const spacingAdjustment = useMemo(() => new Gtk.Adjustment(8, 0, 24, 2, 4, 0), []);

    return (
        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={16}>
            <GtkLabel
                label="A custom grid layout that dynamically adjusts column count and spacing."
                wrap
                halign={Gtk.Align.START}
                cssClasses={["dim-label"]}
            />

            <GtkFrame label="Dynamic Grid Layout">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={16}
                    marginStart={16}
                    marginEnd={16}
                    marginTop={16}
                    marginBottom={16}
                >
                    {/* Grid display */}
                    <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={spacing}>
                        {Array.from({ length: Math.ceil(items.length / columns) }, (_, rowIndex) => {
                            const rowItems = items.slice(rowIndex * columns, (rowIndex + 1) * columns);
                            const rowKey = rowItems.map((item) => item.id).join("-") || `row-${rowIndex}`;
                            return (
                                <GtkBox
                                    key={rowKey}
                                    orientation={Gtk.Orientation.HORIZONTAL}
                                    spacing={spacing}
                                    homogeneous
                                >
                                    {rowItems.map((item) => (
                                        <GtkButton key={item.id} label={item.label} cssClasses={["flat"]} hexpand />
                                    ))}
                                </GtkBox>
                            );
                        })}
                    </GtkBox>

                    {/* Controls */}
                    <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={12}>
                        <GtkLabel label="Columns:" widthRequest={70} halign={Gtk.Align.START} />
                        <GtkScale
                            orientation={Gtk.Orientation.HORIZONTAL}
                            adjustment={columnsAdjustment}
                            drawValue
                            digits={0}
                            valuePos={Gtk.PositionType.RIGHT}
                            hexpand
                            onValueChanged={(scale: Gtk.Range) => setColumns(Math.round(scale.getValue()))}
                        />
                    </GtkBox>

                    <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={12}>
                        <GtkLabel label="Spacing:" widthRequest={70} halign={Gtk.Align.START} />
                        <GtkScale
                            orientation={Gtk.Orientation.HORIZONTAL}
                            adjustment={spacingAdjustment}
                            drawValue
                            digits={0}
                            valuePos={Gtk.PositionType.RIGHT}
                            hexpand
                            onValueChanged={(scale: Gtk.Range) => setSpacing(Math.round(scale.getValue()))}
                        />
                    </GtkBox>

                    {/* Layout info */}
                    <GtkLabel
                        label={`Layout: ${columns} columns, ${Math.ceil(items.length / columns)} rows, ${spacing}px spacing`}
                        cssClasses={["dim-label", "caption"]}
                        halign={Gtk.Align.START}
                    />
                </GtkBox>
            </GtkFrame>
        </GtkBox>
    );
};

const LayoutManagerDemo = () => {
    return (
        <GtkBox
            orientation={Gtk.Orientation.VERTICAL}
            spacing={20}
            marginStart={20}
            marginEnd={20}
            marginTop={20}
            marginBottom={20}
        >
            <GtkLabel label="Custom Layout Manager" cssClasses={["title-2"]} halign={Gtk.Align.START} />

            <GtkLabel
                label="Layout managers in GTK handle measuring and allocating space for child widgets. While GTK provides built-in layout managers (BoxLayout, GridLayout, etc.), you can implement custom layouts by calculating positions programmatically."
                wrap
                halign={Gtk.Align.START}
                cssClasses={["dim-label"]}
            />

            <CircularLayoutDemo />
            <GridLayoutDemo />

            <GtkFrame label="Layout Manager Concepts">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={8}
                    marginStart={12}
                    marginEnd={12}
                    marginTop={12}
                    marginBottom={12}
                >
                    <GtkLabel label="Key Layout Manager Methods:" cssClasses={["heading"]} halign={Gtk.Align.START} />
                    <GtkLabel
                        label={`measure() - Calculate minimum and natural size
allocate() - Position and size children
layoutChanged() - Notify that layout needs recalculation
getLayoutChild() - Get layout properties for a child`}
                        halign={Gtk.Align.START}
                        cssClasses={["monospace"]}
                    />
                </GtkBox>
            </GtkFrame>
        </GtkBox>
    );
};

export const layoutManagerDemo: Demo = {
    id: "layoutmanager",
    title: "Layout Manager",
    description: "Custom layout manager patterns and positioning",
    keywords: ["layout", "manager", "custom", "circular", "grid", "positioning", "measure", "allocate"],
    component: LayoutManagerDemo,
    sourceCode,
};
