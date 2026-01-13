import * as GObject from "@gtkx/ffi/gobject";
import { typeFromName } from "@gtkx/ffi/gobject";
import * as Gtk from "@gtkx/ffi/gtk";
import { GtkBox, GtkButton, GtkFrame, GtkLabel, GtkScale } from "@gtkx/react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Demo } from "../types.js";
import sourceCode from "./themes.tsx?raw";

interface ThemeConfig {
    name: string;
    dark: boolean;
}

const themes: ThemeConfig[] = [
    { name: "Adwaita", dark: false },
    { name: "Adwaita", dark: true },
    { name: "HighContrast", dark: false },
    { name: "HighContrastInverse", dark: true },
];

function createStringValue(str: string): GObject.Value {
    const stringType = typeFromName("gchararray");
    const value = new GObject.Value();
    value.init(stringType);
    value.setString(str);
    return value;
}

function createBooleanValue(bool: boolean): GObject.Value {
    const boolType = typeFromName("gboolean");
    const value = new GObject.Value();
    value.init(boolType);
    value.setBoolean(bool);
    return value;
}

function setTheme(themeName: string, preferDark: boolean) {
    const settings = Gtk.Settings.getDefault();
    if (!settings) return;

    settings.setProperty("gtk-theme-name", createStringValue(themeName));
    settings.setProperty("gtk-application-prefer-dark-theme", createBooleanValue(preferDark));
}

const ThemesDemo = () => {
    const [isRunning, setIsRunning] = useState(false);
    const [fps, setFps] = useState(0);
    const [currentThemeIndex, setCurrentThemeIndex] = useState(0);
    const [intervalMs, setIntervalMs] = useState(100);
    const frameCountRef = useRef(0);
    const lastTimeRef = useRef(Date.now());
    const originalThemeRef = useRef<ThemeConfig | null>(null);

    useEffect(() => {
        const settings = Gtk.Settings.getDefault();
        if (settings && !originalThemeRef.current) {
            const themeValue = new GObject.Value();
            const boolType = typeFromName("gboolean");
            themeValue.init(boolType);
            originalThemeRef.current = {
                name: "Adwaita",
                dark: false,
            };
        }
    }, []);

    useEffect(() => {
        if (!isRunning) return;

        const interval = setInterval(() => {
            const nextIndex = (currentThemeIndex + 1) % themes.length;
            const theme = themes[nextIndex];
            if (theme) {
                setTheme(theme.name, theme.dark);
                setCurrentThemeIndex(nextIndex);
            }

            frameCountRef.current++;
            const now = Date.now();
            const elapsed = now - lastTimeRef.current;
            if (elapsed >= 1000) {
                setFps(Math.round((frameCountRef.current * 1000) / elapsed));
                frameCountRef.current = 0;
                lastTimeRef.current = now;
            }
        }, intervalMs);

        return () => clearInterval(interval);
    }, [isRunning, currentThemeIndex, intervalMs]);

    const handleStop = () => {
        setIsRunning(false);
        if (originalThemeRef.current) {
            setTheme(originalThemeRef.current.name, originalThemeRef.current.dark);
        }
    };

    const intervalAdjustment = useMemo(() => new Gtk.Adjustment(100, 10, 1000, 10, 100, 0), []);

    const currentTheme = themes[currentThemeIndex];

    return (
        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={24}>
            <GtkLabel label="Benchmark: Themes" cssClasses={["title-2"]} halign={Gtk.Align.START} />

            <GtkFrame label="Warning">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={8}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkLabel
                        label="This benchmark rapidly switches between themes, which may cause flashing. If you have photosensitivity issues, please do not run this demo."
                        wrap
                        halign={Gtk.Align.START}
                        cssClasses={["warning"]}
                    />
                </GtkBox>
            </GtkFrame>

            <GtkFrame label="Controls">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={16}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkBox spacing={12}>
                        <GtkLabel label="Switch Interval (ms):" halign={Gtk.Align.START} />
                        <GtkScale
                            hexpand
                            drawValue
                            valuePos={Gtk.PositionType.RIGHT}
                            digits={0}
                            adjustment={intervalAdjustment}
                            onValueChanged={(scale: Gtk.Range) => setIntervalMs(Math.round(scale.getValue()))}
                            sensitive={!isRunning}
                        />
                    </GtkBox>

                    <GtkBox spacing={12}>
                        <GtkButton
                            label={isRunning ? "Stop" : "Start Benchmark"}
                            onClicked={() => (isRunning ? handleStop() : setIsRunning(true))}
                            cssClasses={[isRunning ? "destructive-action" : "suggested-action"]}
                        />
                        <GtkLabel label={`FPS: ${fps}`} cssClasses={["monospace"]} valign={Gtk.Align.CENTER} />
                    </GtkBox>
                </GtkBox>
            </GtkFrame>

            <GtkFrame label="Current Theme">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={8}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkBox spacing={12}>
                        <GtkLabel label="Theme:" widthChars={12} xalign={0} />
                        <GtkLabel label={currentTheme?.name ?? "Unknown"} cssClasses={["monospace"]} />
                    </GtkBox>
                    <GtkBox spacing={12}>
                        <GtkLabel label="Dark Mode:" widthChars={12} xalign={0} />
                        <GtkLabel label={currentTheme?.dark ? "Yes" : "No"} cssClasses={["monospace"]} />
                    </GtkBox>
                </GtkBox>
            </GtkFrame>

            <GtkFrame label="About This Benchmark">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={8}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkLabel
                        label="This benchmark stress-tests GTK's theme switching performance by rapidly cycling through available themes. It uses GObject.Value and setProperty to change the gtk-theme-name and gtk-application-prefer-dark-theme settings."
                        wrap
                        halign={Gtk.Align.START}
                    />
                    <GtkLabel
                        label="The FPS counter shows how many theme switches occur per second. Higher values indicate better theme switching performance."
                        wrap
                        halign={Gtk.Align.START}
                        marginTop={8}
                        cssClasses={["dim-label"]}
                    />
                </GtkBox>
            </GtkFrame>
        </GtkBox>
    );
};

export const themesDemo: Demo = {
    id: "themes",
    title: "Benchmark: Themes",
    description: "Stress test theme switching performance",
    keywords: ["benchmark", "themes", "performance", "fps", "stress test", "dark mode"],
    component: ThemesDemo,
    sourceCode,
};
