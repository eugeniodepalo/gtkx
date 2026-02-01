import type { Easing } from "@gtkx/ffi/adw";
import * as Adw from "@gtkx/ffi/adw";
import * as Gdk from "@gtkx/ffi/gdk";
import * as Gtk from "@gtkx/ffi/gtk";
import type { ReactNode } from "react";
import type { Node } from "../node.js";
import type { Container } from "../types.js";
import { attachChild, detachChild } from "./internal/utils.js";
import { VirtualNode } from "./virtual.js";
import { WidgetNode } from "./widget.js";

let animationCounter = 0;

const DEFAULT_TIMED_DURATION = 300;
const DEFAULT_SPRING_DAMPING = 1;
const DEFAULT_SPRING_MASS = 1;
const DEFAULT_SPRING_STIFFNESS = 100;

/**
 * A numeric value that can be animated.
 */
type AnimatableValue = number;

/**
 * CSS properties that can be animated on a widget.
 *
 * All transforms are applied via GTK CSS and rendered through the widget's style context.
 */
export type AnimatableProperties = {
    /** Opacity from 0 (fully transparent) to 1 (fully opaque) */
    opacity?: AnimatableValue;
    /** Horizontal translation in pixels (positive moves right) */
    translateX?: AnimatableValue;
    /** Vertical translation in pixels (positive moves down) */
    translateY?: AnimatableValue;
    /** Uniform scale factor (1 = original size, 2 = double size) */
    scale?: AnimatableValue;
    /** Horizontal scale factor */
    scaleX?: AnimatableValue;
    /** Vertical scale factor */
    scaleY?: AnimatableValue;
    /** Rotation angle in degrees (positive rotates clockwise) */
    rotate?: AnimatableValue;
    /** Horizontal skew angle in degrees */
    skewX?: AnimatableValue;
    /** Vertical skew angle in degrees */
    skewY?: AnimatableValue;
};

/**
 * Transition configuration for timed (duration-based) animations.
 *
 * @see {@link https://gnome.pages.gitlab.gnome.org/libadwaita/doc/main/class.TimedAnimation.html Adw.TimedAnimation}
 */
export type TimedTransition = {
    /** Discriminant: duration-based animation with easing curves */
    mode: "timed";
    /** Animation duration in milliseconds (default: 300) */
    duration?: number;
    /** Easing function for the animation curve (default: EASE_OUT_CUBIC) */
    easing?: Easing;
    /** Delay before starting the animation in milliseconds */
    delay?: number;
    /** Number of times to repeat the animation (0 = no repeat, -1 = infinite) */
    repeat?: number;
    /** Whether to play the animation in reverse */
    reverse?: boolean;
    /** Whether to alternate direction on each repeat */
    alternate?: boolean;
};

/**
 * Transition configuration for spring (physics-based) animations.
 *
 * Spring animations simulate a mass attached to a spring, providing natural-feeling motion.
 * The animation settles when the spring reaches equilibrium.
 *
 * @see {@link https://gnome.pages.gitlab.gnome.org/libadwaita/doc/main/class.SpringAnimation.html Adw.SpringAnimation}
 */
export type SpringTransition = {
    /** Discriminant: physics-based spring animation */
    mode: "spring";
    /** Damping ratio controlling oscillation decay (default: 1, critically damped) */
    damping?: number;
    /** Spring stiffness in N/m affecting animation speed (default: 100) */
    stiffness?: number;
    /** Virtual mass in kg affecting momentum (default: 1) */
    mass?: number;
    /** Initial velocity to apply at animation start */
    initialVelocity?: number;
    /** Whether to clamp the animation value to prevent overshooting */
    clamp?: boolean;
    /** Delay before starting the animation in milliseconds */
    delay?: number;
};

/**
 * Discriminated union of all transition configurations.
 *
 * The `mode` field determines the animation type:
 * - `"timed"`: Duration-based animation with easing curves (uses {@link Adw.TimedAnimation})
 * - `"spring"`: Physics-based spring animation (uses {@link Adw.SpringAnimation})
 */
export type AnimationTransition = TimedTransition | SpringTransition;

/**
 * Props for the Animation component.
 *
 * Provides a declarative API for animating widget properties using either
 * timed (duration-based) or spring (physics-based) animations.
 *
 * @example
 * ```tsx
 * <x.Animation
 *   initial={{ opacity: 0, translateY: -20 }}
 *   animate={{ opacity: 1, translateY: 0 }}
 *   exit={{ opacity: 0, translateY: 20 }}
 *   transition={{ mode: "spring", damping: 0.8, stiffness: 200 }}
 *   animateOnMount
 * >
 *   <GtkLabel label="Animated content" />
 * </x.Animation>
 * ```
 */
export type AnimationProps = {
    /** Initial property values before animation starts, or `false` to skip initial state */
    initial?: AnimatableProperties | false;
    /** Target property values to animate towards */
    animate?: AnimatableProperties;
    /** Property values to animate to when the component unmounts */
    exit?: AnimatableProperties;
    /** Transition configuration including animation mode and parameters */
    transition?: AnimationTransition;
    /** Whether to animate from `initial` to `animate` when first mounted (default: false) */
    animateOnMount?: boolean;
    /** Callback fired when an animation begins */
    onAnimationStart?: () => void;
    /** Callback fired when an animation completes */
    onAnimationComplete?: () => void;
    /** The child widget to animate (must be a single GTK widget) */
    children?: ReactNode;
};

export class AnimationNode extends VirtualNode<AnimationProps, WidgetNode, WidgetNode> {
    private className: string;
    private provider: Gtk.CssProvider | null = null;
    private display: Gdk.Display | null = null;
    private currentAnimation: Adw.Animation | null = null;
    private currentValues: AnimatableProperties = {};
    private isExiting = false;
    private detachedParentWidget: Gtk.Widget | null = null;

    constructor(typeName: string, props: AnimationProps, container: undefined, rootContainer: Container) {
        super(typeName, props, container, rootContainer);
        this.className = `gtkx-anim-${animationCounter++}`;
    }

    public override isValidChild(child: Node): boolean {
        return child instanceof WidgetNode;
    }

    public override setParent(parent: WidgetNode | null): void {
        if (!parent && this.parent) {
            this.detachedParentWidget = this.parent.container;
        }

        super.setParent(parent);

        if (parent && this.children[0]) {
            this.onChildChange(null);
        }
    }

    public override appendChild(child: WidgetNode): void {
        const oldChildWidget = this.children[0]?.container ?? null;

        super.appendChild(child);

        if (this.parent) {
            this.onChildChange(oldChildWidget);
        }
    }

    public override removeChild(child: WidgetNode): void {
        const oldChildWidget = child.container;

        super.removeChild(child);

        if (this.parent && oldChildWidget) {
            this.onChildChange(oldChildWidget);
        }
    }

    public override commitUpdate(oldProps: AnimationProps | null, newProps: AnimationProps): void {
        super.commitUpdate(oldProps, newProps);

        if (this.isExiting) {
            return;
        }

        if (oldProps && newProps.animate && !this.areAnimatedPropsEqual(oldProps.animate, newProps.animate)) {
            const target = newProps.animate;
            if (this.children[0] && !this.isExiting) {
                this.animateTo(target);
            }
        }
    }

    public override detachDeletedInstance(): void {
        if (this.isExiting) {
            return;
        }

        if (this.props.exit && this.children[0]) {
            this.isExiting = true;

            this.animateTo(this.props.exit, () => {
                this.detachChildFromParentWidget();
                this.cleanup();
                super.detachDeletedInstance();
            });
        } else {
            this.detachChildFromParentWidget();
            this.cleanup();
            super.detachDeletedInstance();
        }
    }

    private onChildChange(oldChild: Gtk.Widget | null): void {
        const parentWidget = this.parent?.container ?? null;
        const childWidget = this.children[0]?.container ?? null;

        if (oldChild && this.provider) {
            oldChild.removeCssClass(this.className);
        }

        if (oldChild && parentWidget && this.isWidgetAttachedTo(oldChild, parentWidget)) {
            detachChild(oldChild, parentWidget);
        }

        if (childWidget && parentWidget) {
            attachChild(childWidget, parentWidget);

            this.setupCssProvider();
            childWidget.addCssClass(this.className);

            const initial = this.props.initial;
            const animate = this.props.animate;

            if (initial === false || !this.props.animateOnMount) {
                if (animate) {
                    this.currentValues = { ...animate };
                    this.applyValues(this.currentValues);
                }
            } else {
                const initialValues = initial ?? animate ?? {};
                this.currentValues = { ...initialValues };
                this.applyValues(this.currentValues);

                if (this.props.animateOnMount && animate) {
                    this.animateTo(animate);
                }
            }
        }
    }

    private detachChildFromParentWidget(): void {
        const parentWidget = this.parent?.container ?? this.detachedParentWidget;
        const childWidget = this.children[0]?.container ?? null;

        if (childWidget && parentWidget && this.isWidgetAttachedTo(childWidget, parentWidget)) {
            detachChild(childWidget, parentWidget);
        }
    }

    private isWidgetAttachedTo(child: Gtk.Widget | null, parent: Gtk.Widget | null): boolean {
        if (!child || !parent) return false;
        const childParent = child.getParent();
        return childParent !== null && childParent === parent;
    }

    private setupCssProvider(): void {
        const childWidget = this.children[0]?.container ?? null;
        if (this.provider || !childWidget) return;

        this.provider = new Gtk.CssProvider();
        this.display = Gdk.DisplayManager.get().getDefaultDisplay();

        if (this.display) {
            Gtk.StyleContext.addProviderForDisplay(
                this.display,
                this.provider,
                Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION,
            );
        }
    }

    private cleanup(): void {
        const childWidget = this.children[0]?.container ?? null;

        if (this.currentAnimation) {
            this.currentAnimation.skip();
            this.currentAnimation = null;
        }

        if (this.provider && this.display) {
            Gtk.StyleContext.removeProviderForDisplay(this.display, this.provider);
        }

        if (childWidget) {
            childWidget.removeCssClass(this.className);
        }

        this.provider = null;
        this.display = null;
    }

    private animateTo(target: AnimatableProperties, onComplete?: () => void): void {
        const childWidget = this.children[0]?.container ?? null;
        if (!childWidget) return;

        if (this.currentAnimation) {
            this.currentAnimation.skip();
            this.currentAnimation = null;
        }

        const from = { ...this.currentValues };
        const to = { ...target };

        this.props.onAnimationStart?.();

        const callback = new Adw.CallbackAnimationTarget((progress: number) => {
            const interpolated = this.interpolate(from, to, progress);
            this.currentValues = interpolated;
            this.applyValues(interpolated);
        });

        const animation = this.createAnimation(childWidget, callback);

        animation.connect("done", () => {
            this.currentValues = { ...to };
            this.currentAnimation = null;
            this.props.onAnimationComplete?.();
            onComplete?.();
        });

        this.currentAnimation = animation;

        const transition = this.props.transition;
        const delay = transition?.delay ?? 0;

        if (delay > 0) {
            setTimeout(() => {
                if (this.currentAnimation === animation) {
                    animation.play();
                }
            }, delay);
        } else {
            animation.play();
        }
    }

    private createAnimation(widget: Gtk.Widget, target: Adw.CallbackAnimationTarget): Adw.Animation {
        const transition = this.props.transition;

        if (transition?.mode === "spring") {
            return this.createSpringAnimation(widget, target, transition);
        }

        return this.createTimedAnimation(widget, target, transition);
    }

    private createTimedAnimation(
        widget: Gtk.Widget,
        target: Adw.CallbackAnimationTarget,
        transition: TimedTransition | undefined,
    ): Adw.TimedAnimation {
        const duration = transition?.duration ?? DEFAULT_TIMED_DURATION;

        const animation = new Adw.TimedAnimation(widget, 0, 1, duration, target);

        if (transition?.easing !== undefined) {
            animation.setEasing(transition.easing);
        }

        if (transition?.repeat !== undefined) {
            animation.setRepeatCount(transition.repeat);
        }

        if (transition?.reverse !== undefined) {
            animation.setReverse(transition.reverse);
        }

        if (transition?.alternate !== undefined) {
            animation.setAlternate(transition.alternate);
        }

        return animation;
    }

    private createSpringAnimation(
        widget: Gtk.Widget,
        target: Adw.CallbackAnimationTarget,
        transition: SpringTransition,
    ): Adw.SpringAnimation {
        const damping = transition.damping ?? DEFAULT_SPRING_DAMPING;
        const mass = transition.mass ?? DEFAULT_SPRING_MASS;
        const stiffness = transition.stiffness ?? DEFAULT_SPRING_STIFFNESS;

        const springParams = new Adw.SpringParams(damping, mass, stiffness);
        const animation = new Adw.SpringAnimation(widget, 0, 1, springParams, target);

        if (transition.initialVelocity !== undefined) {
            animation.setInitialVelocity(transition.initialVelocity);
        }

        if (transition.clamp !== undefined) {
            animation.setClamp(transition.clamp);
        }

        return animation;
    }

    private applyValues(values: AnimatableProperties): void {
        if (!this.provider) {
            return;
        }

        const childWidget = this.children[0]?.container ?? null;
        if (childWidget && !childWidget.getCssClasses()?.includes(this.className)) {
            childWidget.addCssClass(this.className);
        }

        const css = this.buildCss(this.className, values);
        if (css) {
            this.provider.loadFromString(css);
        }
    }

    private getDefaultValue(property: keyof AnimatableProperties): number {
        switch (property) {
            case "opacity":
            case "scale":
            case "scaleX":
            case "scaleY":
                return 1;
            default:
                return 0;
        }
    }

    private interpolate(from: AnimatableProperties, to: AnimatableProperties, progress: number): AnimatableProperties {
        const result: AnimatableProperties = {};

        const allKeys = new Set([...Object.keys(from), ...Object.keys(to)]) as Set<keyof AnimatableProperties>;

        for (const key of allKeys) {
            const fromVal = from[key] ?? this.getDefaultValue(key);
            const toVal = to[key] ?? this.getDefaultValue(key);
            result[key] = fromVal + (toVal - fromVal) * progress;
        }

        return result;
    }

    private buildCss(className: string, props: AnimatableProperties): string {
        const parts: string[] = [];
        const transforms: string[] = [];

        if (props.opacity !== undefined) {
            parts.push(`opacity: ${props.opacity}`);
        }

        if (props.translateX !== undefined || props.translateY !== undefined) {
            transforms.push(`translate(${props.translateX ?? 0}px, ${props.translateY ?? 0}px)`);
        }

        if (props.scale !== undefined) {
            transforms.push(`scale(${props.scale})`);
        } else if (props.scaleX !== undefined || props.scaleY !== undefined) {
            transforms.push(`scale(${props.scaleX ?? 1}, ${props.scaleY ?? 1})`);
        }

        if (props.rotate !== undefined) {
            transforms.push(`rotate(${props.rotate}deg)`);
        }

        if (props.skewX !== undefined) {
            transforms.push(`skewX(${props.skewX}deg)`);
        }

        if (props.skewY !== undefined) {
            transforms.push(`skewY(${props.skewY}deg)`);
        }

        if (transforms.length > 0) {
            parts.push(`transform: ${transforms.join(" ")}`);
        }

        if (parts.length === 0) {
            return "";
        }

        return `.${className} { ${parts.join("; ")}; }`;
    }

    private areAnimatedPropsEqual<T extends Record<string, unknown>>(a?: T, b?: T): boolean {
        if (a === b) return true;
        if (!a || !b) return false;

        const keysA = Object.keys(a);
        const keysB = Object.keys(b);
        if (keysA.length !== keysB.length) return false;

        for (const key of keysA) {
            if (a[key] !== b[key]) return false;
        }

        return true;
    }
}
