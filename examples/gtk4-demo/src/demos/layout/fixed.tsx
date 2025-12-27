import * as Gtk from "@gtkx/ffi/gtk";
import { GtkBox, GtkButton, GtkFixed, GtkLabel } from "@gtkx/react";
import { useEffect, useRef, useState } from "react";
import type { Demo } from "../types.js";

const sourceCode = `import * as Gtk from "@gtkx/ffi/gtk";
import { GtkBox, GtkButton, GtkFixed, GtkLabel } from "@gtkx/react";
import { useEffect, useRef, useState } from "react";

const FixedDemo = () => {
    const fixedRef = useRef<Gtk.Fixed | null>(null);
    const [positions, setPositions] = useState([
        { x: 20, y: 20, label: "A" },
        { x: 100, y: 50, label: "B" },
        { x: 50, y: 100, label: "C" },
    ]);

    // Position widgets using the Fixed.put() method
    useEffect(() => {
        const fixed = fixedRef.current;
        if (!fixed) return;

        // GtkFixed requires manual positioning via put() or move()
        // The ref gives access to the native Fixed widget
    }, [positions]);

    return (
        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={20}>
            <GtkLabel label="GtkFixed allows absolute positioning of widgets." />

            <GtkFixed ref={fixedRef} widthRequest={300} heightRequest={200}>
                {/* Children are positioned absolutely */}
            </GtkFixed>

            <GtkLabel label="Warning: Fixed positioning doesn't adapt to themes or translations." />
        </GtkBox>
    );
};`;

interface Position {
    x: number;
    y: number;
    label: string;
}

const FixedDemo = () => {
    const fixedRef = useRef<Gtk.Fixed | null>(null);
    const buttonRefs = useRef<Map<string, Gtk.Widget>>(new Map());
    const [positions, setPositions] = useState<Position[]>([
        { x: 20, y: 20, label: "Widget A" },
        { x: 150, y: 40, label: "Widget B" },
        { x: 80, y: 100, label: "Widget C" },
    ]);

    // Move widgets when positions change
    useEffect(() => {
        const fixed = fixedRef.current;
        if (!fixed) return;

        for (const pos of positions) {
            const widget = buttonRefs.current.get(pos.label);
            if (widget) {
                fixed.move(widget, pos.x, pos.y);
            }
        }
    }, [positions]);

    const randomizePositions = () => {
        setPositions(
            positions.map((pos) => ({
                ...pos,
                x: Math.floor(Math.random() * 200),
                y: Math.floor(Math.random() * 120),
            })),
        );
    };

    const addWidget = () => {
        const newLabel = `Widget ${String.fromCharCode(65 + positions.length)}`;
        setPositions([
            ...positions,
            {
                x: Math.floor(Math.random() * 200),
                y: Math.floor(Math.random() * 120),
                label: newLabel,
            },
        ]);
    };

    const removeWidget = () => {
        if (positions.length > 0) {
            const toRemove = positions[positions.length - 1];
            buttonRefs.current.delete(toRemove.label);
            setPositions(positions.slice(0, -1));
        }
    };

    return (
        <GtkBox
            orientation={Gtk.Orientation.VERTICAL}
            spacing={20}
            marginStart={20}
            marginEnd={20}
            marginTop={20}
            marginBottom={20}
        >
            <GtkLabel label="Fixed Positioning" cssClasses={["title-2"]} halign={Gtk.Align.START} />

            {/* About Fixed */}
            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                <GtkLabel label="About GtkFixed" cssClasses={["heading"]} halign={Gtk.Align.START} />
                <GtkLabel
                    label="GtkFixed places child widgets at absolute positions. Unlike other containers, it does not perform any automatic layout. Use fixed.put(widget, x, y) to position children and fixed.move(widget, x, y) to reposition them."
                    wrap
                    cssClasses={["dim-label"]}
                    halign={Gtk.Align.START}
                />
            </GtkBox>

            {/* Fixed Container Example */}
            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                <GtkLabel label="Absolute Positioning" cssClasses={["heading"]} halign={Gtk.Align.START} />
                <GtkLabel
                    label="Click 'Randomize' to move widgets to random positions."
                    wrap
                    cssClasses={["dim-label"]}
                    halign={Gtk.Align.START}
                />
                <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={8}>
                    <GtkButton
                        label="Randomize Positions"
                        onClicked={randomizePositions}
                        cssClasses={["suggested-action"]}
                    />
                    <GtkButton label="Add Widget" onClicked={addWidget} />
                    <GtkButton label="Remove Widget" onClicked={removeWidget} />
                </GtkBox>
                <GtkFixed ref={fixedRef} widthRequest={350} heightRequest={180} cssClasses={["card"]} marginTop={8}>
                    {positions.map((pos) => (
                        <GtkLabel
                            key={pos.label}
                            label={pos.label}
                            cssClasses={["accent", "pill"]}
                            ref={(widget: Gtk.Widget | null) => {
                                if (widget) {
                                    buttonRefs.current.set(pos.label, widget);
                                    // Initial positioning
                                    const fixed = fixedRef.current;
                                    if (fixed) {
                                        fixed.move(widget, pos.x, pos.y);
                                    }
                                }
                            }}
                        />
                    ))}
                </GtkFixed>
            </GtkBox>

            {/* Position Display */}
            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                <GtkLabel label="Current Positions" cssClasses={["heading"]} halign={Gtk.Align.START} />
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={4}
                    cssClasses={["card"]}
                    marginStart={12}
                    marginEnd={12}
                    marginTop={8}
                    marginBottom={8}
                >
                    {positions.map((pos) => (
                        <GtkLabel
                            key={pos.label}
                            label={`${pos.label}: (${pos.x}, ${pos.y})`}
                            halign={Gtk.Align.START}
                            marginStart={12}
                            marginTop={4}
                            marginBottom={4}
                        />
                    ))}
                </GtkBox>
            </GtkBox>

            {/* Warnings */}
            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                <GtkLabel label="Caution" cssClasses={["heading"]} halign={Gtk.Align.START} />
                <GtkLabel
                    label="GtkFixed should be used sparingly. Fixed positioning does not adapt to different themes, font sizes, translations, or screen sizes. For most layouts, prefer GtkBox, GtkGrid, or other layout containers."
                    wrap
                    cssClasses={["dim-label"]}
                    halign={Gtk.Align.START}
                />
            </GtkBox>
        </GtkBox>
    );
};

export const fixedDemo: Demo = {
    id: "fixed",
    title: "Fixed",
    description: "Container for absolute positioning of widgets at specific coordinates.",
    keywords: ["fixed", "absolute", "position", "coordinates", "GtkFixed"],
    component: FixedDemo,
    sourceCode,
};
