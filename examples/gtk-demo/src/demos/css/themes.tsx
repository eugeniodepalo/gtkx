import * as Adw from "@gtkx/ffi/adw";
import { ColorScheme } from "@gtkx/ffi/adw";
import * as Gtk from "@gtkx/ffi/gtk";
import {
    GtkBox,
    GtkButton,
    GtkCheckButton,
    GtkFrame,
    GtkLabel,
    GtkListBox,
    GtkListBoxRow,
    GtkSwitch,
} from "@gtkx/react";
import { useEffect, useState } from "react";
import type { Demo } from "../types.js";

const ThemesDemo = () => {
    const [styleManager] = useState(() => Adw.StyleManager.getDefault());
    const [isDark, setIsDark] = useState(false);
    const [colorScheme, setColorScheme] = useState<ColorScheme>(ColorScheme.DEFAULT);
    const [systemSupportsColorSchemes, setSystemSupportsColorSchemes] = useState(false);
    const [isHighContrast, setIsHighContrast] = useState(false);

    // Query initial state
    useEffect(() => {
        setIsDark(styleManager.getDark());
        setColorScheme(styleManager.getColorScheme());
        setSystemSupportsColorSchemes(styleManager.getSystemSupportsColorSchemes());
        setIsHighContrast(styleManager.getHighContrast());

        // Listen for changes
        styleManager.connect("notify", () => {
            setIsDark(styleManager.getDark());
            setColorScheme(styleManager.getColorScheme());
            setIsHighContrast(styleManager.getHighContrast());
        });
    }, [styleManager]);

    const handleColorSchemeChange = (scheme: ColorScheme) => {
        styleManager.setColorScheme(scheme);
        setColorScheme(scheme);
    };

    const colorSchemeOptions = [
        {
            scheme: ColorScheme.DEFAULT,
            label: "System Default",
            description: "Follow system preference",
            icon: "preferences-desktop-appearance-symbolic",
        },
        {
            scheme: ColorScheme.FORCE_LIGHT,
            label: "Force Light",
            description: "Always use light theme",
            icon: "weather-clear-symbolic",
        },
        {
            scheme: ColorScheme.PREFER_LIGHT,
            label: "Prefer Light",
            description: "Light unless system prefers dark",
            icon: "weather-few-clouds-symbolic",
        },
        {
            scheme: ColorScheme.PREFER_DARK,
            label: "Prefer Dark",
            description: "Dark unless system prefers light",
            icon: "weather-few-clouds-night-symbolic",
        },
        {
            scheme: ColorScheme.FORCE_DARK,
            label: "Force Dark",
            description: "Always use dark theme",
            icon: "weather-clear-night-symbolic",
        },
    ];

    return (
        <GtkBox
            orientation={Gtk.Orientation.VERTICAL}
            spacing={24}
            marginStart={20}
            marginEnd={20}
            marginTop={20}
            marginBottom={20}
        >
            <GtkLabel label="Theme Switching" cssClasses={["title-2"]} halign={Gtk.Align.START} />

            <GtkLabel
                label="Libadwaita's AdwStyleManager provides control over the application's color scheme. It respects system preferences while allowing apps to override the theme when needed."
                wrap
                halign={Gtk.Align.START}
                cssClasses={["dim-label"]}
            />

            {/* Current State */}
            <GtkFrame label="Current Theme State">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={12}
                    marginTop={16}
                    marginBottom={16}
                    marginStart={16}
                    marginEnd={16}
                >
                    <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={12}>
                        <GtkLabel label="Current appearance:" halign={Gtk.Align.START} hexpand />
                        <GtkBox
                            cssClasses={isDark ? ["accent"] : ["success"]}
                            orientation={Gtk.Orientation.HORIZONTAL}
                            spacing={4}
                        >
                            <GtkLabel label={isDark ? "Dark Mode" : "Light Mode"} cssClasses={["heading"]} />
                        </GtkBox>
                    </GtkBox>

                    <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={12}>
                        <GtkLabel label="High contrast:" halign={Gtk.Align.START} hexpand />
                        <GtkLabel label={isHighContrast ? "Enabled" : "Disabled"} cssClasses={["dim-label"]} />
                    </GtkBox>

                    <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={12}>
                        <GtkLabel label="System color scheme support:" halign={Gtk.Align.START} hexpand />
                        <GtkLabel
                            label={systemSupportsColorSchemes ? "Supported" : "Not supported"}
                            cssClasses={["dim-label"]}
                        />
                    </GtkBox>
                </GtkBox>
            </GtkFrame>

            {/* Quick Toggle */}
            <GtkFrame label="Quick Toggle">
                <GtkBox
                    orientation={Gtk.Orientation.HORIZONTAL}
                    spacing={16}
                    marginTop={16}
                    marginBottom={16}
                    marginStart={16}
                    marginEnd={16}
                >
                    <GtkLabel label="Dark Mode" halign={Gtk.Align.START} hexpand />
                    <GtkSwitch
                        active={colorScheme === ColorScheme.FORCE_DARK || colorScheme === ColorScheme.PREFER_DARK}
                        onStateSet={() => {
                            const newScheme =
                                colorScheme === ColorScheme.FORCE_DARK || colorScheme === ColorScheme.PREFER_DARK
                                    ? ColorScheme.FORCE_LIGHT
                                    : ColorScheme.FORCE_DARK;
                            handleColorSchemeChange(newScheme);
                            return true;
                        }}
                    />
                </GtkBox>
            </GtkFrame>

            {/* Color Scheme Options */}
            <GtkFrame label="Color Scheme">
                <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={0} marginTop={8} marginBottom={8}>
                    <GtkListBox selectionMode={Gtk.SelectionMode.NONE} cssClasses={["boxed-list"]}>
                        {colorSchemeOptions.map((option) => (
                            <GtkListBoxRow key={option.scheme} activatable={false}>
                                <GtkBox
                                    orientation={Gtk.Orientation.HORIZONTAL}
                                    spacing={12}
                                    marginTop={12}
                                    marginBottom={12}
                                    marginStart={12}
                                    marginEnd={12}
                                >
                                    <GtkCheckButton
                                        active={colorScheme === option.scheme}
                                        onToggled={() => handleColorSchemeChange(option.scheme)}
                                    />
                                    <GtkBox
                                        orientation={Gtk.Orientation.VERTICAL}
                                        spacing={0}
                                        hexpand
                                        valign={Gtk.Align.CENTER}
                                    >
                                        <GtkLabel label={option.label} halign={Gtk.Align.START} />
                                        <GtkLabel
                                            label={option.description}
                                            cssClasses={["dim-label", "caption"]}
                                            halign={Gtk.Align.START}
                                        />
                                    </GtkBox>
                                </GtkBox>
                            </GtkListBoxRow>
                        ))}
                    </GtkListBox>
                </GtkBox>
            </GtkFrame>

            {/* Theme-Aware Preview */}
            <GtkFrame label="Theme-Aware Preview">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={16}
                    marginTop={20}
                    marginBottom={20}
                    marginStart={20}
                    marginEnd={20}
                >
                    <GtkLabel
                        label="These elements automatically adapt to the current theme:"
                        wrap
                        cssClasses={["dim-label"]}
                        halign={Gtk.Align.START}
                    />

                    <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={12} halign={Gtk.Align.CENTER}>
                        <GtkButton label="Default" onClicked={() => {}} />
                        <GtkButton label="Suggested" cssClasses={["suggested-action"]} onClicked={() => {}} />
                        <GtkButton label="Destructive" cssClasses={["destructive-action"]} onClicked={() => {}} />
                    </GtkBox>

                    <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={24} halign={Gtk.Align.CENTER}>
                        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={4}>
                            <GtkLabel label="Title" cssClasses={["title-3"]} />
                            <GtkLabel label="Regular text" />
                            <GtkLabel label="Dim label" cssClasses={["dim-label"]} />
                        </GtkBox>

                        <GtkBox
                            cssClasses={["card"]}
                            orientation={Gtk.Orientation.VERTICAL}
                            spacing={0}
                            marginTop={8}
                            marginBottom={8}
                            marginStart={16}
                            marginEnd={16}
                        >
                            <GtkBox
                                orientation={Gtk.Orientation.VERTICAL}
                                spacing={8}
                                marginTop={12}
                                marginBottom={12}
                                marginStart={12}
                                marginEnd={12}
                            >
                                <GtkLabel label="Card Widget" cssClasses={["heading"]} />
                                <GtkLabel label="Cards adapt to theme" cssClasses={["dim-label"]} />
                            </GtkBox>
                        </GtkBox>
                    </GtkBox>
                </GtkBox>
            </GtkFrame>

            {/* API Reference */}
            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                <GtkLabel label="AdwStyleManager API" cssClasses={["heading"]} halign={Gtk.Align.START} />
                <GtkLabel
                    label="Use Adw.StyleManager.getDefault() to get the global style manager. Call setColorScheme() to change the theme. Query getDark() and getHighContrast() for the current appearance. Connect to 'notify' signal to react to changes."
                    wrap
                    cssClasses={["dim-label"]}
                    halign={Gtk.Align.START}
                />
            </GtkBox>
        </GtkBox>
    );
};

const sourceCode = `import * as Gtk from "@gtkx/ffi/gtk";
import * as Adw from "@gtkx/ffi/adw";
import { ColorScheme } from "@gtkx/ffi/adw";
import { GtkBox, GtkLabel, GtkSwitch } from "@gtkx/react";
import { useEffect, useState } from "react";

const ThemeToggle = () => {
  const [styleManager] = useState(() => Adw.StyleManager.getDefault());
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Get initial state
    setIsDark(styleManager.getDark());

    // Listen for changes
    styleManager.connect("notify", () => {
      setIsDark(styleManager.getDark());
    });
  }, [styleManager]);

  const toggleDarkMode = () => {
    const newScheme = isDark ? ColorScheme.FORCE_LIGHT : ColorScheme.FORCE_DARK;
    styleManager.setColorScheme(newScheme);
  };

  return (
    <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={12}>
      <GtkLabel label="Dark Mode" hexpand />
      <GtkSwitch
        active={isDark}
        onStateSet={() => {
          toggleDarkMode();
          return true;
        }}
      />
    </GtkBox>
  );
};

// ColorScheme options:
// - DEFAULT: Follow system preference
// - FORCE_LIGHT: Always light
// - PREFER_LIGHT: Light unless system prefers dark
// - PREFER_DARK: Dark unless system prefers light
// - FORCE_DARK: Always dark`;

export const themesDemo: Demo = {
    id: "themes",
    title: "Theme Switching",
    description: "Control light/dark mode with AdwStyleManager",
    keywords: ["theme", "dark", "light", "color-scheme", "AdwStyleManager", "appearance"],
    component: ThemesDemo,
    sourceCode,
};
