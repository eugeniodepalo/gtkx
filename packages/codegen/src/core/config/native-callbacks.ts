import type { CallbackType } from "@gtkx/native";

export type CallbackName = CallbackType["callbackType"];

export const APPLICATION_PARAM_NAME = "application";

const CALLBACK_TRAMPOLINES: Record<string, CallbackName> = {
    "Adw.AnimationTargetFunc": "animationTargetFunc",
    "Gio.AsyncReadyCallback": "asyncReadyCallback",
    "GLib.DestroyNotify": "destroyNotify",
    "Gsk.PathIntersectionFunc": "pathIntersectionFunc",
    "Gtk.DrawingAreaDrawFunc": "drawingAreaDrawFunc",
    "Gtk.ScaleFormatValueFunc": "scaleFormatValueFunc",
    "Gtk.ShortcutFunc": "shortcutFunc",
    "Gtk.TickCallback": "tickCallback",
    "Gtk.TreeListModelCreateModelFunc": "treeListModelCreateModelFunc",
};

export const getTrampolineName = (qualifiedName: string): CallbackName | null => {
    return CALLBACK_TRAMPOLINES[qualifiedName] ?? null;
};

export const isSupportedCallback = (typeName: string): boolean => {
    return typeName in CALLBACK_TRAMPOLINES;
};
