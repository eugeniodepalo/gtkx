import * as Gtk from "@gtkx/ffi/gtk";
import { GridChild, GtkBox, GtkButton, GtkEntry, GtkGrid, GtkLabel } from "@gtkx/react";
import { useState } from "react";
import type { Demo } from "../types.js";

const sourceCode = `import * as Gtk from "@gtkx/ffi/gtk";
import { GridChild, GtkBox, GtkButton, GtkEntry, GtkGrid, GtkLabel } from "@gtkx/react";
import { useState } from "react";

const GridDemo = () => {
    const [gridSize, setGridSize] = useState({ rows: 3, cols: 3 });

    return (
        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={20}>
            {/* Basic Grid */}
            <GtkGrid rowSpacing={8} columnSpacing={8}>
                <GridChild column={0} row={0}>
                    <GtkButton label="(0,0)" />
                </GridChild>
                <GridChild column={1} row={0}>
                    <GtkButton label="(1,0)" />
                </GridChild>
                <GridChild column={0} row={1}>
                    <GtkButton label="(0,1)" />
                </GridChild>
                <GridChild column={1} row={1}>
                    <GtkButton label="(1,1)" />
                </GridChild>
            </GtkGrid>

            {/* Column and Row Spanning */}
            <GtkGrid rowSpacing={8} columnSpacing={8}>
                <GridChild column={0} row={0} columnSpan={2}>
                    <GtkButton label="Spans 2 columns" hexpand />
                </GridChild>
                <GridChild column={2} row={0} rowSpan={2}>
                    <GtkButton label="Spans 2 rows" vexpand />
                </GridChild>
            </GtkGrid>

            {/* Form Layout */}
            <GtkGrid rowSpacing={8} columnSpacing={12}>
                <GridChild column={0} row={0}>
                    <GtkLabel label="Name:" halign={Gtk.Align.END} />
                </GridChild>
                <GridChild column={1} row={0}>
                    <GtkEntry hexpand />
                </GridChild>
                <GridChild column={0} row={1}>
                    <GtkLabel label="Email:" halign={Gtk.Align.END} />
                </GridChild>
                <GridChild column={1} row={1}>
                    <GtkEntry hexpand />
                </GridChild>
            </GtkGrid>
        </GtkBox>
    );
};`;

const GridDemo = () => {
    const [gridSize, setGridSize] = useState({ rows: 3, cols: 3 });

    const generateGrid = () => {
        const cells = [];
        for (let row = 0; row < gridSize.rows; row++) {
            for (let col = 0; col < gridSize.cols; col++) {
                cells.push({ row, col });
            }
        }
        return cells;
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
            <GtkLabel label="Grid Layout" cssClasses={["title-2"]} halign={Gtk.Align.START} />

            {/* Basic Grid */}
            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                <GtkLabel label="Basic Grid" cssClasses={["heading"]} halign={Gtk.Align.START} />
                <GtkLabel
                    label="Grid arranges widgets in rows and columns. Use <GridChild> to specify position."
                    wrap
                    cssClasses={["dim-label"]}
                    halign={Gtk.Align.START}
                />
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={0}
                    cssClasses={["card"]}
                    marginTop={8}
                    marginBottom={8}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkGrid
                        rowSpacing={8}
                        columnSpacing={8}
                        marginTop={12}
                        marginBottom={12}
                        marginStart={12}
                        marginEnd={12}
                    >
                        <GridChild column={0} row={0}>
                            <GtkButton label="(0,0)" />
                        </GridChild>
                        <GridChild column={1} row={0}>
                            <GtkButton label="(1,0)" />
                        </GridChild>
                        <GridChild column={2} row={0}>
                            <GtkButton label="(2,0)" />
                        </GridChild>
                        <GridChild column={0} row={1}>
                            <GtkButton label="(0,1)" />
                        </GridChild>
                        <GridChild column={1} row={1}>
                            <GtkButton label="(1,1)" />
                        </GridChild>
                        <GridChild column={2} row={1}>
                            <GtkButton label="(2,1)" />
                        </GridChild>
                    </GtkGrid>
                </GtkBox>
            </GtkBox>

            {/* Column and Row Spanning */}
            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                <GtkLabel label="Column and Row Spanning" cssClasses={["heading"]} halign={Gtk.Align.START} />
                <GtkLabel
                    label="Widgets can span multiple columns or rows using columnSpan and rowSpan props."
                    wrap
                    cssClasses={["dim-label"]}
                    halign={Gtk.Align.START}
                />
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={0}
                    cssClasses={["card"]}
                    marginTop={8}
                    marginBottom={8}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkGrid
                        rowSpacing={8}
                        columnSpacing={8}
                        marginTop={12}
                        marginBottom={12}
                        marginStart={12}
                        marginEnd={12}
                    >
                        <GridChild column={0} row={0} columnSpan={2}>
                            <GtkButton label="Spans 2 columns" hexpand />
                        </GridChild>
                        <GridChild column={2} row={0} rowSpan={2}>
                            <GtkButton label="Spans 2 rows" vexpand />
                        </GridChild>
                        <GridChild column={0} row={1}>
                            <GtkButton label="(0,1)" />
                        </GridChild>
                        <GridChild column={1} row={1}>
                            <GtkButton label="(1,1)" />
                        </GridChild>
                    </GtkGrid>
                </GtkBox>
            </GtkBox>

            {/* Form Layout */}
            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                <GtkLabel label="Form Layout" cssClasses={["heading"]} halign={Gtk.Align.START} />
                <GtkLabel
                    label="Grid is ideal for form layouts with labels and inputs aligned."
                    wrap
                    cssClasses={["dim-label"]}
                    halign={Gtk.Align.START}
                />
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={0}
                    cssClasses={["card"]}
                    marginTop={8}
                    marginBottom={8}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkGrid
                        rowSpacing={8}
                        columnSpacing={12}
                        marginTop={12}
                        marginBottom={12}
                        marginStart={12}
                        marginEnd={12}
                    >
                        <GridChild column={0} row={0}>
                            <GtkLabel label="Name:" halign={Gtk.Align.END} />
                        </GridChild>
                        <GridChild column={1} row={0}>
                            <GtkEntry hexpand placeholderText="Enter your name" />
                        </GridChild>
                        <GridChild column={0} row={1}>
                            <GtkLabel label="Email:" halign={Gtk.Align.END} />
                        </GridChild>
                        <GridChild column={1} row={1}>
                            <GtkEntry hexpand placeholderText="Enter your email" />
                        </GridChild>
                        <GridChild column={0} row={2}>
                            <GtkLabel label="Phone:" halign={Gtk.Align.END} />
                        </GridChild>
                        <GridChild column={1} row={2}>
                            <GtkEntry hexpand placeholderText="Enter your phone" />
                        </GridChild>
                        <GridChild column={0} row={3} columnSpan={2}>
                            <GtkButton
                                label="Submit"
                                halign={Gtk.Align.END}
                                marginTop={8}
                                cssClasses={["suggested-action"]}
                            />
                        </GridChild>
                    </GtkGrid>
                </GtkBox>
            </GtkBox>

            {/* Dynamic Grid */}
            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                <GtkLabel label="Dynamic Grid" cssClasses={["heading"]} halign={Gtk.Align.START} />
                <GtkLabel
                    label="Grid size can be controlled with React state."
                    wrap
                    cssClasses={["dim-label"]}
                    halign={Gtk.Align.START}
                />
                <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={8}>
                    <GtkButton
                        label="Add Row"
                        onClicked={() => setGridSize({ ...gridSize, rows: Math.min(gridSize.rows + 1, 5) })}
                    />
                    <GtkButton
                        label="Remove Row"
                        onClicked={() => setGridSize({ ...gridSize, rows: Math.max(gridSize.rows - 1, 1) })}
                    />
                    <GtkButton
                        label="Add Column"
                        onClicked={() => setGridSize({ ...gridSize, cols: Math.min(gridSize.cols + 1, 5) })}
                    />
                    <GtkButton
                        label="Remove Column"
                        onClicked={() => setGridSize({ ...gridSize, cols: Math.max(gridSize.cols - 1, 1) })}
                    />
                </GtkBox>
                <GtkLabel label={`Grid: ${gridSize.rows} rows x ${gridSize.cols} columns`} cssClasses={["dim-label"]} />
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={0}
                    cssClasses={["card"]}
                    marginTop={8}
                    marginBottom={8}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkGrid
                        rowSpacing={4}
                        columnSpacing={4}
                        marginTop={12}
                        marginBottom={12}
                        marginStart={12}
                        marginEnd={12}
                    >
                        {generateGrid().map(({ row, col }) => (
                            <GridChild key={`${row}-${col}`} column={col} row={row}>
                                <GtkButton label={`${col},${row}`} widthRequest={50} />
                            </GridChild>
                        ))}
                    </GtkGrid>
                </GtkBox>
            </GtkBox>
        </GtkBox>
    );
};

export const gridDemo: Demo = {
    id: "grid",
    title: "Grid",
    description: "Two-dimensional layout container for arranging widgets in rows and columns.",
    keywords: ["grid", "layout", "container", "rows", "columns", "table", "form", "GtkGrid"],
    component: GridDemo,
    sourceCode,
};
