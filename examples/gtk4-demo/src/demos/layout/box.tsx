import * as Gtk from "@gtkx/ffi/gtk";
import { GtkBox, GtkButton, GtkLabel } from "@gtkx/react";
import { useState } from "react";
import type { Demo } from "../types.js";

const sourceCode = `import * as Gtk from "@gtkx/ffi/gtk";
import { GtkBox, GtkButton, GtkLabel } from "@gtkx/react";
import { useState } from "react";

const BoxDemo = () => {
    const [items, setItems] = useState(["Item 1", "Item 2", "Item 3"]);

    const addItem = () => {
        setItems([...items, \`Item \${items.length + 1}\`]);
    };

    const removeItem = () => {
        if (items.length > 0) {
            setItems(items.slice(0, -1));
        }
    };

    return (
        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={20}>
            {/* Horizontal Box */}
            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                <GtkLabel label="Horizontal Box" cssClasses={["heading"]} halign={Gtk.Align.START} />
                <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={8} cssClasses={["card"]}>
                    <GtkButton label="First" />
                    <GtkButton label="Second" />
                    <GtkButton label="Third" />
                </GtkBox>
            </GtkBox>

            {/* Vertical Box */}
            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                <GtkLabel label="Vertical Box" cssClasses={["heading"]} halign={Gtk.Align.START} />
                <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8} cssClasses={["card"]}>
                    <GtkButton label="Top" />
                    <GtkButton label="Middle" />
                    <GtkButton label="Bottom" />
                </GtkBox>
            </GtkBox>

            {/* Expand and Fill */}
            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                <GtkLabel label="Expand (hexpand)" cssClasses={["heading"]} halign={Gtk.Align.START} />
                <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={8} cssClasses={["card"]}>
                    <GtkButton label="Fixed" />
                    <GtkButton label="Expanded" hexpand />
                    <GtkButton label="Fixed" />
                </GtkBox>
            </GtkBox>

            {/* Homogeneous */}
            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                <GtkLabel label="Homogeneous" cssClasses={["heading"]} halign={Gtk.Align.START} />
                <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={8} homogeneous cssClasses={["card"]}>
                    <GtkButton label="A" />
                    <GtkButton label="Medium" />
                    <GtkButton label="Longer Text" />
                </GtkBox>
            </GtkBox>

            {/* Dynamic Items */}
            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                <GtkLabel label="Dynamic Items" cssClasses={["heading"]} halign={Gtk.Align.START} />
                <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={8}>
                    <GtkButton label="Add" onClicked={addItem} cssClasses={["suggested-action"]} />
                    <GtkButton label="Remove" onClicked={removeItem} cssClasses={["destructive-action"]} />
                </GtkBox>
                <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={8} cssClasses={["card"]}>
                    {items.map((item, i) => (
                        <GtkLabel key={i} label={item} />
                    ))}
                </GtkBox>
            </GtkBox>
        </GtkBox>
    );
};`;

const BoxDemo = () => {
    const [items, setItems] = useState(["Item 1", "Item 2", "Item 3"]);

    const addItem = () => {
        setItems([...items, `Item ${items.length + 1}`]);
    };

    const removeItem = () => {
        if (items.length > 0) {
            setItems(items.slice(0, -1));
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
            <GtkLabel label="GtkBox Layout" cssClasses={["title-2"]} halign={Gtk.Align.START} />

            {/* Horizontal Box */}
            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                <GtkLabel label="Horizontal Box" cssClasses={["heading"]} halign={Gtk.Align.START} />
                <GtkLabel
                    label="Children are arranged in a horizontal row."
                    wrap
                    cssClasses={["dim-label"]}
                    halign={Gtk.Align.START}
                />
                <GtkBox
                    orientation={Gtk.Orientation.HORIZONTAL}
                    spacing={8}
                    cssClasses={["card"]}
                    marginTop={8}
                    marginBottom={8}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkButton label="First" />
                    <GtkButton label="Second" />
                    <GtkButton label="Third" />
                </GtkBox>
            </GtkBox>

            {/* Vertical Box */}
            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                <GtkLabel label="Vertical Box" cssClasses={["heading"]} halign={Gtk.Align.START} />
                <GtkLabel
                    label="Children are arranged in a vertical column."
                    wrap
                    cssClasses={["dim-label"]}
                    halign={Gtk.Align.START}
                />
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={8}
                    cssClasses={["card"]}
                    marginTop={8}
                    marginBottom={8}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkButton label="Top" />
                    <GtkButton label="Middle" />
                    <GtkButton label="Bottom" />
                </GtkBox>
            </GtkBox>

            {/* Expand and Fill */}
            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                <GtkLabel label="Expand (hexpand)" cssClasses={["heading"]} halign={Gtk.Align.START} />
                <GtkLabel
                    label="The middle button has hexpand=true, so it takes all available horizontal space."
                    wrap
                    cssClasses={["dim-label"]}
                    halign={Gtk.Align.START}
                />
                <GtkBox
                    orientation={Gtk.Orientation.HORIZONTAL}
                    spacing={8}
                    cssClasses={["card"]}
                    marginTop={8}
                    marginBottom={8}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkButton label="Fixed" />
                    <GtkButton label="Expanded" hexpand />
                    <GtkButton label="Fixed" />
                </GtkBox>
            </GtkBox>

            {/* Homogeneous */}
            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                <GtkLabel label="Homogeneous" cssClasses={["heading"]} halign={Gtk.Align.START} />
                <GtkLabel
                    label="When homogeneous=true, all children get the same size."
                    wrap
                    cssClasses={["dim-label"]}
                    halign={Gtk.Align.START}
                />
                <GtkBox
                    orientation={Gtk.Orientation.HORIZONTAL}
                    spacing={8}
                    homogeneous
                    cssClasses={["card"]}
                    marginTop={8}
                    marginBottom={8}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkButton label="A" />
                    <GtkButton label="Medium" />
                    <GtkButton label="Longer Text" />
                </GtkBox>
            </GtkBox>

            {/* Alignment */}
            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                <GtkLabel label="Alignment (valign)" cssClasses={["heading"]} halign={Gtk.Align.START} />
                <GtkLabel
                    label="Use valign to position children vertically within the box."
                    wrap
                    cssClasses={["dim-label"]}
                    halign={Gtk.Align.START}
                />
                <GtkBox
                    orientation={Gtk.Orientation.HORIZONTAL}
                    spacing={8}
                    cssClasses={["card"]}
                    marginTop={8}
                    marginBottom={8}
                    marginStart={12}
                    marginEnd={12}
                    heightRequest={80}
                >
                    <GtkButton label="Start" valign={Gtk.Align.START} />
                    <GtkButton label="Center" valign={Gtk.Align.CENTER} />
                    <GtkButton label="End" valign={Gtk.Align.END} />
                    <GtkButton label="Fill" valign={Gtk.Align.FILL} vexpand />
                </GtkBox>
            </GtkBox>

            {/* Dynamic Items */}
            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                <GtkLabel label="Dynamic Items" cssClasses={["heading"]} halign={Gtk.Align.START} />
                <GtkLabel
                    label="React state can dynamically add or remove children."
                    wrap
                    cssClasses={["dim-label"]}
                    halign={Gtk.Align.START}
                />
                <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={8}>
                    <GtkButton label="Add Item" onClicked={addItem} cssClasses={["suggested-action"]} />
                    <GtkButton label="Remove Item" onClicked={removeItem} cssClasses={["destructive-action"]} />
                </GtkBox>
                <GtkBox
                    orientation={Gtk.Orientation.HORIZONTAL}
                    spacing={8}
                    cssClasses={["card"]}
                    marginTop={8}
                    marginBottom={8}
                    marginStart={12}
                    marginEnd={12}
                >
                    {items.length === 0 ? (
                        <GtkLabel label="No items" cssClasses={["dim-label"]} />
                    ) : (
                        items.map((item) => <GtkLabel key={item} label={item} />)
                    )}
                </GtkBox>
            </GtkBox>
        </GtkBox>
    );
};

export const boxDemo: Demo = {
    id: "box",
    title: "Box",
    description: "Linear container for arranging widgets horizontally or vertically.",
    keywords: ["box", "layout", "container", "horizontal", "vertical", "GtkBox"],
    component: BoxDemo,
    sourceCode,
};
