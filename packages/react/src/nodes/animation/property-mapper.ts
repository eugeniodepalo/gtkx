import type * as Gtk from "@gtkx/ffi/gtk";
import type { TransformProperty } from "./transform-state.js";
import { getTransformState } from "./widget-registry.js";

export type AnimatableProperty = TransformProperty | "opacity";

type PropertyAccessor = {
    get: (widget: Gtk.Widget) => number;
    set: (widget: Gtk.Widget, value: number) => void;
};

const TRANSFORM_DEFAULTS: Record<TransformProperty, number> = {
    x: 0,
    y: 0,
    scale: 1,
    scaleX: 1,
    scaleY: 1,
    rotate: 0,
};

function createTransformAccessor(property: TransformProperty): PropertyAccessor {
    return {
        get: (widget) => getTransformState(widget)?.get(property) ?? TRANSFORM_DEFAULTS[property],
        set: (widget, value) => getTransformState(widget)?.set(property, value),
    };
}

const propertyAccessors: Record<AnimatableProperty, PropertyAccessor> = {
    opacity: {
        get: (widget) => widget.getOpacity(),
        set: (widget, value) => widget.setOpacity(value),
    },
    x: createTransformAccessor("x"),
    y: createTransformAccessor("y"),
    scale: createTransformAccessor("scale"),
    scaleX: createTransformAccessor("scaleX"),
    scaleY: createTransformAccessor("scaleY"),
    rotate: createTransformAccessor("rotate"),
};

export function getPropertyAccessor(property: AnimatableProperty): PropertyAccessor {
    return propertyAccessors[property];
}

export function isAnimatableProperty(property: string): property is AnimatableProperty {
    return property in propertyAccessors;
}

export function isTransformProperty(property: string): property is TransformProperty {
    return property in TRANSFORM_DEFAULTS;
}
