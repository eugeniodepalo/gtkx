import { injectGlobal } from "@gtkx/css";
import * as Gtk from "@gtkx/ffi/gtk";
import {
    GtkGrid,
    GtkImage,
    GtkLabel,
    GtkListBox,
    GtkListBoxRow,
    GtkScrolledWindow,
    GtkStack,
    GtkStackSwitcher,
    x,
} from "@gtkx/react";
import { useCallback, useEffect, useState } from "react";
import type { Demo } from "../types.js";
import sourceCode from "./css-blendmodes.tsx?raw";

const BLEND_MODES = [
    { name: "Color", id: "color" },
    { name: "Color (burn)", id: "color-burn" },
    { name: "Color (dodge)", id: "color-dodge" },
    { name: "Darken", id: "darken" },
    { name: "Difference", id: "difference" },
    { name: "Exclusion", id: "exclusion" },
    { name: "Hard Light", id: "hard-light" },
    { name: "Hue", id: "hue" },
    { name: "Lighten", id: "lighten" },
    { name: "Luminosity", id: "luminosity" },
    { name: "Multiply", id: "multiply" },
    { name: "Normal", id: "normal" },
    { name: "Overlay", id: "overlay" },
    { name: "Saturate", id: "saturation" },
    { name: "Screen", id: "screen" },
    { name: "Soft Light", id: "soft-light" },
];

const createBlendCss = (blendMode: string) => `
image.color1 {
    background: linear-gradient(to right, red 0%, yellow 50%, green 100%);
    min-width: 200px;
    min-height: 200px;
}

image.color2 {
    background: linear-gradient(to bottom, blue 0%, magenta 50%, cyan 100%);
    min-width: 200px;
    min-height: 200px;
}

image.blend0 {
    background: linear-gradient(to right, red 0%, yellow 50%, green 100%),
                linear-gradient(to bottom, blue 0%, magenta 50%, cyan 100%);
    background-blend-mode: ${blendMode};
    min-width: 200px;
    min-height: 200px;
}

image.red {
    background: red;
    min-width: 200px;
    min-height: 200px;
}

image.blue {
    background: blue;
    min-width: 200px;
    min-height: 200px;
}

image.blend1 {
    background: red, blue;
    background-blend-mode: ${blendMode};
    min-width: 200px;
    min-height: 200px;
}

image.cyan {
    background: cyan;
    min-width: 200px;
    min-height: 200px;
}

image.magenta {
    background: magenta;
    min-width: 200px;
    min-height: 200px;
}

image.yellow {
    background: yellow;
    min-width: 200px;
    min-height: 200px;
}

image.blend2 {
    background: cyan, magenta, yellow;
    background-blend-mode: ${blendMode};
    min-width: 200px;
    min-height: 200px;
}
`;

injectGlobal`${createBlendCss("normal")}`;

const CssBlendmodesDemo = () => {
    const [stack, setStack] = useState<Gtk.Stack | null>(null);
    const [listbox, setListbox] = useState<Gtk.ListBox | null>(null);

    const handleRowActivated = useCallback((_listbox: Gtk.ListBox, row: Gtk.ListBoxRow) => {
        const index = row.getIndex();
        const mode = BLEND_MODES[index];
        if (mode) {
            injectGlobal`${createBlendCss(mode.id)}`;
        }
    }, []);

    useEffect(() => {
        if (listbox) {
            const normalIndex = BLEND_MODES.findIndex((m) => m.id === "normal");
            const row = listbox.getRowAtIndex(normalIndex);
            if (row) {
                listbox.selectRow(row);
            }
        }
    }, [listbox]);

    return (
        <GtkGrid marginStart={12} marginEnd={12} marginTop={12} marginBottom={12} rowSpacing={12} columnSpacing={12}>
            <x.GridChild column={0} row={0}>
                <GtkLabel label="Blend mode:" xalign={0} cssClasses={["dim-label"]} />
            </x.GridChild>

            <x.GridChild column={0} row={1}>
                <GtkScrolledWindow vexpand hasFrame minContentWidth={150}>
                    <GtkListBox ref={setListbox} onRowActivated={handleRowActivated}>
                        {BLEND_MODES.map((mode) => (
                            <GtkListBoxRow key={mode.id}>
                                <GtkLabel label={mode.name} xalign={0} />
                            </GtkListBoxRow>
                        ))}
                    </GtkListBox>
                </GtkScrolledWindow>
            </x.GridChild>

            <x.GridChild column={1} row={0}>
                <GtkStackSwitcher stack={stack ?? undefined} halign={Gtk.Align.CENTER} hexpand />
            </x.GridChild>

            <x.GridChild column={1} row={1}>
                <GtkStack
                    ref={setStack}
                    hexpand
                    vexpand
                    hhomogeneous={false}
                    vhomogeneous={false}
                    transitionType={Gtk.StackTransitionType.CROSSFADE}
                >
                    <x.StackPage id="page0" title="Gradients">
                        <GtkGrid
                            halign={Gtk.Align.CENTER}
                            valign={Gtk.Align.CENTER}
                            vexpand
                            rowSpacing={12}
                            columnSpacing={12}
                        >
                            <x.GridChild column={0} row={0}>
                                <GtkLabel label="Gradient 1" />
                            </x.GridChild>
                            <x.GridChild column={1} row={0}>
                                <GtkLabel label="Gradient 2" />
                            </x.GridChild>
                            <x.GridChild column={0} row={1}>
                                <GtkImage cssClasses={["color1"]} />
                            </x.GridChild>
                            <x.GridChild column={1} row={1}>
                                <GtkImage cssClasses={["color2"]} />
                            </x.GridChild>
                            <x.GridChild column={0} row={2} columnSpan={2}>
                                <GtkLabel label="Blended picture" />
                            </x.GridChild>
                            <x.GridChild column={0} row={3} columnSpan={2}>
                                <GtkImage halign={Gtk.Align.CENTER} cssClasses={["blend0"]} />
                            </x.GridChild>
                        </GtkGrid>
                    </x.StackPage>

                    <x.StackPage id="page1" title="Blends">
                        <GtkGrid
                            halign={Gtk.Align.CENTER}
                            valign={Gtk.Align.CENTER}
                            vexpand
                            rowSpacing={12}
                            columnSpacing={12}
                        >
                            <x.GridChild column={0} row={0}>
                                <GtkLabel label="Red" />
                            </x.GridChild>
                            <x.GridChild column={1} row={0}>
                                <GtkLabel label="Blue" />
                            </x.GridChild>
                            <x.GridChild column={0} row={1}>
                                <GtkImage cssClasses={["red"]} />
                            </x.GridChild>
                            <x.GridChild column={1} row={1}>
                                <GtkImage cssClasses={["blue"]} />
                            </x.GridChild>
                            <x.GridChild column={0} row={2} columnSpan={2}>
                                <GtkLabel label="Blended picture" />
                            </x.GridChild>
                            <x.GridChild column={0} row={3} columnSpan={2}>
                                <GtkImage halign={Gtk.Align.CENTER} cssClasses={["blend1"]} />
                            </x.GridChild>
                        </GtkGrid>
                    </x.StackPage>

                    <x.StackPage id="page2" title="CMY">
                        <GtkGrid
                            halign={Gtk.Align.CENTER}
                            valign={Gtk.Align.CENTER}
                            hexpand
                            vexpand
                            rowSpacing={6}
                            columnSpacing={12}
                        >
                            <x.GridChild column={0} row={0}>
                                <GtkLabel label="Cyan" xalign={0} cssClasses={["dim-label"]} />
                            </x.GridChild>
                            <x.GridChild column={1} row={0}>
                                <GtkLabel label="Magenta" xalign={0} cssClasses={["dim-label"]} />
                            </x.GridChild>
                            <x.GridChild column={0} row={1}>
                                <GtkImage cssClasses={["cyan"]} />
                            </x.GridChild>
                            <x.GridChild column={1} row={1}>
                                <GtkImage cssClasses={["magenta"]} />
                            </x.GridChild>
                            <x.GridChild column={0} row={2}>
                                <GtkLabel label="Yellow" xalign={0} cssClasses={["dim-label"]} />
                            </x.GridChild>
                            <x.GridChild column={1} row={2}>
                                <GtkLabel label="Blended picture" xalign={0} cssClasses={["heading"]} />
                            </x.GridChild>
                            <x.GridChild column={0} row={3}>
                                <GtkImage cssClasses={["yellow"]} />
                            </x.GridChild>
                            <x.GridChild column={1} row={3}>
                                <GtkImage halign={Gtk.Align.CENTER} cssClasses={["blend2"]} />
                            </x.GridChild>
                        </GtkGrid>
                    </x.StackPage>
                </GtkStack>
            </x.GridChild>
        </GtkGrid>
    );
};

export const cssBlendmodesDemo: Demo = {
    id: "css-blendmodes",
    title: "Theming/CSS Blend Modes",
    description: "You can blend multiple backgrounds using the CSS blend modes available.",
    keywords: ["css", "blend", "mode", "multiply", "screen", "overlay", "compositing"],
    component: CssBlendmodesDemo,
    sourceCode,
};
