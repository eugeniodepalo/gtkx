import * as Gio from "@gtkx/ffi/gio";
import * as GObject from "@gtkx/ffi/gobject";
import { useEffect, useMemo, useState } from "react";

interface SettingTypeMap {
    boolean: boolean;
    int: number;
    double: number;
    string: string;
    strv: string[];
}

type SettingType = keyof SettingTypeMap;

const GETTERS: Record<SettingType, string> = {
    boolean: "getBoolean",
    int: "getInt",
    double: "getDouble",
    string: "getString",
    strv: "getStrv",
};

type SettingGetter = (key: string) => unknown;

function readSetting(settings: Gio.Settings, key: string, type: SettingType): unknown {
    const getter = (settings as unknown as Record<string, SettingGetter>)[GETTERS[type]] as SettingGetter;
    return getter.call(settings, key);
}

/**
 * Subscribes to a GSettings key and returns its current value as React state.
 *
 * Creates a `Gio.Settings` instance for the given schema (stable across
 * re-renders), connects to `changed::key`, and re-renders whenever the
 * setting changes. The initial value is read synchronously at mount time.
 *
 * @param schemaId - The GSettings schema ID (e.g. `"org.gnome.desktop.interface"`)
 * @param key - The settings key in kebab-case (e.g. `"color-scheme"`)
 * @param type - The value type, used to select the appropriate GSettings getter
 * @returns The current setting value, kept in sync with the GSettings backend
 *
 * @example
 * ```tsx
 * const colorScheme = useSetting("org.gnome.desktop.interface", "color-scheme", "string");
 * const isDark = colorScheme === "prefer-dark";
 * ```
 *
 * @example
 * ```tsx
 * const showAnimations = useSetting("org.gnome.desktop.interface", "enable-animations", "boolean");
 * ```
 */
export function useSetting<T extends SettingType>(schemaId: string, key: string, type: T): SettingTypeMap[T] {
    const settings = useMemo(() => new Gio.Settings(schemaId), [schemaId]);
    const [value, setValue] = useState<SettingTypeMap[T]>(() => readSetting(settings, key, type) as SettingTypeMap[T]);

    useEffect(() => {
        setValue(readSetting(settings, key, type) as SettingTypeMap[T]);

        const handlerId = settings.connect(`changed::${key}`, () => {
            setValue(readSetting(settings, key, type) as SettingTypeMap[T]);
        });

        return () => {
            GObject.signalHandlerDisconnect(settings, handlerId);
        };
    }, [settings, key, type]);

    return value;
}
