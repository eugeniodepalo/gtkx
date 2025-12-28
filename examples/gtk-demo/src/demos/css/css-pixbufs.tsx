import * as Gdk from "@gtkx/ffi/gdk";
import * as Gtk from "@gtkx/ffi/gtk";
import { GtkBox, GtkButton, GtkFrame, GtkLabel, GtkScale } from "@gtkx/react";
import { useEffect, useMemo, useState } from "react";
import type { Demo } from "../types.js";
import sourceCode from "./css-pixbufs.tsx?raw";

const STYLE_PROVIDER_PRIORITY_APPLICATION = 600;

const ICONS = [
    "emblem-photos-symbolic",
    "folder-symbolic",
    "applications-system-symbolic",
    "user-home-symbolic",
    "weather-clear-symbolic",
    "starred-symbolic",
];

const EFFECTS = [
    { name: "None", filter: "none" },
    { name: "Grayscale", filter: "grayscale(100%)" },
    { name: "Sepia", filter: "sepia(100%)" },
    { name: "Invert", filter: "invert(100%)" },
    { name: "Blur", filter: "blur(2px)" },
    { name: "Brightness", filter: "brightness(150%)" },
    { name: "Contrast", filter: "contrast(200%)" },
    { name: "Saturate", filter: "saturate(200%)" },
];

const CssPixbufsDemo = () => {
    const [iconIndex, setIconIndex] = useState(0);
    const [effectIndex, setEffectIndex] = useState(0);
    const [iconSize, setIconSize] = useState(64);
    const [cssProvider] = useState(() => new Gtk.CssProvider());

    const sizeAdjustment = useMemo(() => new Gtk.Adjustment(64, 24, 128, 8, 16, 0), []);

    const currentIcon = ICONS[iconIndex] ?? "emblem-photos-symbolic";
    const currentEffect = EFFECTS[effectIndex] ?? EFFECTS[0];

    useEffect(() => {
        const display = Gdk.DisplayManager.get().getDefaultDisplay();
        if (display) {
            Gtk.StyleContext.addProviderForDisplay(display, cssProvider, STYLE_PROVIDER_PRIORITY_APPLICATION);
        }

        return () => {
            if (display) {
                Gtk.StyleContext.removeProviderForDisplay(display, cssProvider);
            }
        };
    }, [cssProvider]);

    useEffect(() => {
        const css = `
.icon-background {
    background-image: -gtk-icontheme("${currentIcon}");
    background-size: ${iconSize}px ${iconSize}px;
    background-repeat: no-repeat;
    background-position: center;
    min-width: ${iconSize + 48}px;
    min-height: ${iconSize + 48}px;
    border-radius: 12px;
    background-color: alpha(@theme_fg_color, 0.05);
}

.icon-with-effect {
    background-image: -gtk-icontheme("${currentIcon}");
    background-size: ${iconSize}px ${iconSize}px;
    background-repeat: no-repeat;
    background-position: center;
    min-width: ${iconSize + 48}px;
    min-height: ${iconSize + 48}px;
    border-radius: 12px;
    background-color: alpha(@theme_fg_color, 0.05);
    filter: ${currentEffect?.filter ?? "none"};
}

.icon-tiled {
    background-image: -gtk-icontheme("${currentIcon}");
    background-size: 32px 32px;
    background-repeat: repeat;
    min-height: 150px;
    border-radius: 12px;
    opacity: 0.3;
}

.icon-button {
    min-width: 48px;
    min-height: 48px;
}

.icon-button image {
    -gtk-icon-size: 24px;
}
`;
        try {
            cssProvider.loadFromString(css);
        } catch {
            // Ignore CSS errors
        }
    }, [cssProvider, currentIcon, iconSize, currentEffect?.filter]);

    return (
        <GtkBox
            orientation={Gtk.Orientation.VERTICAL}
            spacing={20}
            marginStart={20}
            marginEnd={20}
            marginTop={20}
            marginBottom={20}
        >
            <GtkLabel label="CSS with Icons" cssClasses={["title-2"]} halign={Gtk.Align.START} />

            <GtkLabel
                label="GTK CSS can reference theme icons using the -gtk-icontheme() function. This allows using icons as background images with CSS transformations and filters applied."
                wrap
                halign={Gtk.Align.START}
                cssClasses={["dim-label"]}
            />

            <GtkFrame label="Select Icon">
                <GtkBox
                    orientation={Gtk.Orientation.HORIZONTAL}
                    spacing={8}
                    marginStart={16}
                    marginEnd={16}
                    marginTop={16}
                    marginBottom={16}
                    halign={Gtk.Align.CENTER}
                >
                    {ICONS.map((icon, index) => (
                        <GtkButton
                            key={icon}
                            iconName={icon}
                            cssClasses={index === iconIndex ? ["suggested-action", "icon-button"] : ["icon-button"]}
                            onClicked={() => setIconIndex(index)}
                        />
                    ))}
                </GtkBox>
            </GtkFrame>

            <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={20}>
                <GtkFrame label="Icon as Background" hexpand>
                    <GtkBox
                        orientation={Gtk.Orientation.VERTICAL}
                        spacing={16}
                        marginStart={16}
                        marginEnd={16}
                        marginTop={16}
                        marginBottom={16}
                        halign={Gtk.Align.CENTER}
                    >
                        <GtkBox
                            orientation={Gtk.Orientation.VERTICAL}
                            spacing={0}
                            cssClasses={["icon-background"]}
                            halign={Gtk.Align.CENTER}
                        />
                        <GtkLabel label="background-image: -gtk-icontheme()" cssClasses={["caption", "dim-label"]} />
                    </GtkBox>
                </GtkFrame>

                <GtkFrame label="With CSS Filter" hexpand>
                    <GtkBox
                        orientation={Gtk.Orientation.VERTICAL}
                        spacing={16}
                        marginStart={16}
                        marginEnd={16}
                        marginTop={16}
                        marginBottom={16}
                        halign={Gtk.Align.CENTER}
                    >
                        <GtkBox
                            orientation={Gtk.Orientation.VERTICAL}
                            spacing={0}
                            cssClasses={["icon-with-effect"]}
                            halign={Gtk.Align.CENTER}
                        />
                        <GtkLabel
                            label={`filter: ${currentEffect?.filter ?? "none"}`}
                            cssClasses={["caption", "dim-label"]}
                        />
                    </GtkBox>
                </GtkFrame>
            </GtkBox>

            <GtkFrame label="CSS Filters">
                <GtkBox
                    orientation={Gtk.Orientation.HORIZONTAL}
                    spacing={8}
                    marginStart={16}
                    marginEnd={16}
                    marginTop={16}
                    marginBottom={16}
                    halign={Gtk.Align.CENTER}
                >
                    {EFFECTS.map((effect, index) => (
                        <GtkButton
                            key={effect.name}
                            label={effect.name}
                            cssClasses={index === effectIndex ? ["suggested-action"] : []}
                            onClicked={() => setEffectIndex(index)}
                        />
                    ))}
                </GtkBox>
            </GtkFrame>

            <GtkFrame label="Icon Size">
                <GtkBox
                    orientation={Gtk.Orientation.HORIZONTAL}
                    spacing={16}
                    marginStart={16}
                    marginEnd={16}
                    marginTop={16}
                    marginBottom={16}
                >
                    <GtkLabel label="Size:" />
                    <GtkScale
                        orientation={Gtk.Orientation.HORIZONTAL}
                        adjustment={sizeAdjustment}
                        drawValue
                        valuePos={Gtk.PositionType.RIGHT}
                        hexpand
                        onValueChanged={(scale: Gtk.Range) => setIconSize(scale.getValue())}
                    />
                </GtkBox>
            </GtkFrame>

            <GtkFrame label="Tiled Pattern">
                <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={0} cssClasses={["icon-tiled"]} hexpand />
            </GtkFrame>

            <GtkLabel
                label="The -gtk-icontheme() function loads icons from the current icon theme. Combined with CSS properties like background-size, background-repeat, and filter, you can create various visual effects."
                wrap
                cssClasses={["dim-label", "caption"]}
                halign={Gtk.Align.START}
            />
        </GtkBox>
    );
};

export const cssPixbufsDemo: Demo = {
    id: "css-pixbufs",
    title: "CSS with Icons",
    description: "Using icons and images in CSS backgrounds",
    keywords: ["css", "icon", "pixbuf", "image", "background", "icontheme", "filter"],
    component: CssPixbufsDemo,
    sourceCode,
};
