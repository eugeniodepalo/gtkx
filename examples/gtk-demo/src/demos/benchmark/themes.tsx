import { getNativeObject } from "@gtkx/ffi";
import type * as Gdk from "@gtkx/ffi/gdk";
import * as Gtk from "@gtkx/ffi/gtk";
import { GtkBox, GtkHeaderBar, GtkLabel, GtkToggleButton, x } from "@gtkx/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Demo } from "../types.js";
import sourceCode from "./themes.tsx?raw";

interface Theme {
    name: string;
    dark: boolean;
}

const THEMES: Theme[] = [
    { name: "Adwaita", dark: false },
    { name: "Adwaita", dark: true },
    { name: "HighContrast", dark: false },
    { name: "HighContrastInverse", dark: false },
];

const ThemesDemo = () => {
    const [isRunning, setIsRunning] = useState(false);
    const [fps, setFps] = useState("");
    const themeIndexRef = useRef(0);
    const tickIdRef = useRef<number | null>(null);
    const boxRef = useRef<Gtk.Box | null>(null);
    const windowRef = useRef<Gtk.Window | null>(null);

    const tickCallback = useCallback((_widget: Gtk.Widget, frameClock: Gdk.FrameClock): boolean => {
        const settings = Gtk.Settings.getDefault();
        if (!settings) return true;

        const theme = THEMES[themeIndexRef.current % THEMES.length];
        if (theme) {
            settings.setGtkThemeName(theme.name);
            settings.setGtkApplicationPreferDarkTheme(theme.dark);
        }

        themeIndexRef.current++;

        const fpsValue = frameClock.getFps();
        setFps(`${fpsValue.toFixed(2)} fps`);

        return true;
    }, []);

    const handleToggle = useCallback(
        (active: boolean) => {
            if (!windowRef.current && boxRef.current) {
                const root = boxRef.current.getRoot();
                if (root) {
                    windowRef.current = getNativeObject(root.handle, Gtk.Window);
                }
            }
            const window = windowRef.current;
            if (!window) return;

            if (active) {
                tickIdRef.current = window.addTickCallback(tickCallback);
                setIsRunning(true);
            } else {
                if (tickIdRef.current !== null) {
                    window.removeTickCallback(tickIdRef.current);
                    tickIdRef.current = null;
                }
                const settings = Gtk.Settings.getDefault();
                if (settings) {
                    settings.setGtkThemeName("Adwaita");
                    settings.setGtkApplicationPreferDarkTheme(false);
                }
                setIsRunning(false);
                setFps("");
            }
        },
        [tickCallback],
    );

    useEffect(() => {
        return () => {
            if (windowRef.current && tickIdRef.current !== null) {
                windowRef.current.removeTickCallback(tickIdRef.current);
            }
            const settings = Gtk.Settings.getDefault();
            if (settings) {
                settings.setGtkThemeName("Adwaita");
                settings.setGtkApplicationPreferDarkTheme(false);
            }
        };
    }, []);

    return (
        <>
            <x.Slot for="GtkWindow" id="titlebar">
                <GtkHeaderBar>
                    <x.PackEnd>
                        <GtkLabel label={fps} widthChars={12} />
                    </x.PackEnd>
                </GtkHeaderBar>
            </x.Slot>
            <GtkBox
                ref={boxRef}
                orientation={Gtk.Orientation.VERTICAL}
                spacing={12}
                marginStart={20}
                marginEnd={20}
                marginTop={20}
                marginBottom={20}
                valign={Gtk.Align.CENTER}
            >
                <GtkLabel
                    label="Warning: This demo involves rapidly flashing changes and may be hazardous to photosensitive viewers."
                    wrap
                    cssClasses={["warning"]}
                />
                <GtkToggleButton
                    label={isRunning ? "Stop" : "Start"}
                    active={isRunning}
                    halign={Gtk.Align.CENTER}
                    onToggled={(btn) => handleToggle(btn.getActive())}
                />
            </GtkBox>
        </>
    );
};

export const themesDemo: Demo = {
    id: "themes",
    title: "Benchmark/Themes",
    description:
        "This demo continuously switches themes, like some of you. Warning: This demo involves rapidly flashing changes and may be hazardous to photosensitive viewers.",
    keywords: ["benchmark", "themes", "performance", "fps", "GtkSettings"],
    component: ThemesDemo,
    sourceCode,
};
