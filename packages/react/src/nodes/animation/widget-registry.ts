import { getNativeId } from "@gtkx/ffi";
import type * as Gtk from "@gtkx/ffi/gtk";
import { getAnimationStyleSheet } from "./animation-style-sheet.js";
import { TransformState } from "./transform-state.js";

type WidgetEntry = {
    cssId: string;
    originalName: string | null;
    transformState: TransformState;
};

const widgets = new WeakMap<Gtk.Widget, WidgetEntry>();
const styleSheet = getAnimationStyleSheet();

export function registerWidget(widget: Gtk.Widget): TransformState {
    const existing = widgets.get(widget);
    if (existing) {
        return existing.transformState;
    }

    const nativeId = getNativeId(widget.handle);
    const cssId = `gtkx-anim-${nativeId}`;
    const originalName = widget.getName();

    widget.setName(cssId);

    const transformState = new TransformState(() => {
        if (transformState.isDefault()) {
            styleSheet.removeRule(cssId);
        } else {
            styleSheet.setRule(cssId, transformState.toCss());
        }
    });

    widgets.set(widget, {
        cssId,
        originalName,
        transformState,
    });

    return transformState;
}

export function unregisterWidget(widget: Gtk.Widget): void {
    const entry = widgets.get(widget);
    if (!entry) return;

    styleSheet.removeRule(entry.cssId);

    if (entry.originalName !== null) {
        widget.setName(entry.originalName);
    }

    widgets.delete(widget);
}

export function getTransformState(widget: Gtk.Widget): TransformState | null {
    return widgets.get(widget)?.transformState ?? null;
}
