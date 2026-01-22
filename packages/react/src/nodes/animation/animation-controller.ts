import * as Adw from "@gtkx/ffi/adw";
import type * as Gtk from "@gtkx/ffi/gtk";
import { createAnimation, type Transition } from "./animation-factory.js";
import {
    type AnimatableProperty,
    getPropertyAccessor,
    isAnimatableProperty,
    isTransformProperty,
} from "./property-mapper.js";
import { registerWidget, unregisterWidget } from "./widget-registry.js";

export type AnimatableProperties = Partial<Record<AnimatableProperty, number>>;

type ActiveAnimation = {
    animation: Adw.Animation;
    connectionId: number;
};

const DEFAULT_SPRING: Transition = { type: "spring", stiffness: 100, damping: 10 };
const DEFAULT_TIMED: Transition = { type: "timed", duration: 250, easing: Adw.Easing.EASE_OUT_CUBIC };

function getDefaultTransition(property: AnimatableProperty): Transition {
    return isTransformProperty(property) ? DEFAULT_SPRING : DEFAULT_TIMED;
}

function isEmptyTransition(transition: Transition): boolean {
    return transition.type === undefined && !("duration" in transition) && !("stiffness" in transition);
}

export class AnimationController {
    private widget: Gtk.Widget | null = null;
    private activeAnimations = new Map<AnimatableProperty, ActiveAnimation>();
    private pendingCompletions = new Set<AnimatableProperty>();
    private onComplete: (() => void) | null = null;

    setWidget(widget: Gtk.Widget | null): void {
        if (this.widget === widget) return;

        if (this.widget) {
            this.skipAll();
            unregisterWidget(this.widget);
        }

        this.widget = widget;

        if (widget) {
            registerWidget(widget);
        }
    }

    applyImmediate(properties: AnimatableProperties): void {
        if (!this.widget) return;

        for (const [key, value] of Object.entries(properties)) {
            if (value === undefined || !isAnimatableProperty(key)) continue;
            const accessor = getPropertyAccessor(key);
            accessor.set(this.widget, value);
        }
    }

    animate(
        from: AnimatableProperties,
        to: AnimatableProperties,
        transition: Transition,
        onComplete?: () => void,
    ): void {
        if (!this.widget) return;

        this.skipAll();
        this.onComplete = onComplete ?? null;
        this.pendingCompletions.clear();

        const useDefaultTransitions = isEmptyTransition(transition);
        const propertiesToAnimate = new Set([...Object.keys(from), ...Object.keys(to)]);

        for (const key of propertiesToAnimate) {
            if (!isAnimatableProperty(key)) continue;

            const fromValue = from[key];
            const toValue = to[key];
            if (fromValue === undefined && toValue === undefined) continue;

            const accessor = getPropertyAccessor(key);
            const currentValue = fromValue ?? accessor.get(this.widget);
            const targetValue = toValue ?? accessor.get(this.widget);

            if (currentValue === targetValue) continue;

            const effectiveTransition = useDefaultTransitions ? getDefaultTransition(key) : transition;

            this.pendingCompletions.add(key);
            this.startPropertyAnimation(key, currentValue, targetValue, effectiveTransition);
        }

        if (this.pendingCompletions.size === 0 && this.onComplete) {
            this.onComplete();
            this.onComplete = null;
        }
    }

    private startPropertyAnimation(
        property: AnimatableProperty,
        from: number,
        to: number,
        transition: Transition,
    ): void {
        if (!this.widget) return;

        const accessor = getPropertyAccessor(property);
        const widget = this.widget;

        const animation = createAnimation(widget, from, to, transition, (value) => {
            accessor.set(widget, value);
        });

        const connectionId = animation.connect("done", () => {
            this.onAnimationDone(property);
        });

        this.activeAnimations.set(property, { animation, connectionId });
        animation.play();
    }

    private onAnimationDone(property: AnimatableProperty): void {
        this.activeAnimations.delete(property);
        this.pendingCompletions.delete(property);

        if (this.pendingCompletions.size === 0 && this.onComplete) {
            const callback = this.onComplete;
            this.onComplete = null;
            callback();
        }
    }

    skipAll(): void {
        this.onComplete = null;
        this.pendingCompletions.clear();
        for (const { animation } of this.activeAnimations.values()) {
            animation.skip();
        }
        this.activeAnimations.clear();
    }

    dispose(): void {
        this.skipAll();
        if (this.widget) {
            unregisterWidget(this.widget);
        }
        this.widget = null;
    }
}
