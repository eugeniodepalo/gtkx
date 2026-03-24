# Animations

GTKX provides a declarative animation API through the `AdwTimedAnimation` and `AdwSpringAnimation` components, powered by Adwaita's animation system.

## Basic Usage

Wrap any widget with `AdwTimedAnimation` or `AdwSpringAnimation` to animate its properties:

```tsx
import { AdwTimedAnimation, GtkButton } from "@gtkx/react";

const FadeInButton = () => (
    <AdwTimedAnimation initial={{ opacity: 0 }} animate={{ opacity: 1 }} animateOnMount>
        <GtkButton label="Hello" />
    </AdwTimedAnimation>
);
```

The `initial` prop sets the starting values, `animate` sets the target values, and `animateOnMount` triggers the animation when the component first renders.

You can animate properties like `opacity`, `translateX`, `translateY`, `scale`, `scaleX`, `scaleY`, `rotate`, `skewX`, and `skewY`. See the [AnimatableProperties API reference](/api/react/type-aliases/AnimatableProperties.md) for the full list.

```tsx
<AdwSpringAnimation
    initial={{ opacity: 0, scale: 0.8, translateY: -20 }}
    animate={{ opacity: 1, scale: 1, translateY: 0 }}
    animateOnMount
>
    <GtkLabel label="Animated!" />
</AdwSpringAnimation>
```

## Timed Animations

Timed animations run for a fixed duration with an easing curve:

```tsx
import { AdwTimedAnimation, GtkBox } from "@gtkx/react";
import { Easing } from "@gtkx/ffi/adw";

const TimedExample = () => (
    <AdwTimedAnimation
        initial={{ translateX: -100 }}
        animate={{ translateX: 0 }}
        duration={500}
        easing={Easing.EASE_OUT_CUBIC}
        delay={100}
        animateOnMount
    >
        <GtkBox />
    </AdwTimedAnimation>
);
```

See the [AdwTimedAnimationProps API reference](/api/react/type-aliases/AdwTimedAnimationProps.md) for all available options.

## Spring Animations

Spring animations use physics simulation for natural-feeling motion:

```tsx
import { AdwSpringAnimation, GtkButton } from "@gtkx/react";

const SpringExample = () => (
    <AdwSpringAnimation
        initial={{ scale: 0.5 }}
        animate={{ scale: 1 }}
        damping={0.6}
        stiffness={200}
        mass={1}
        animateOnMount
    >
        <GtkButton label="Bounce!" />
    </AdwSpringAnimation>
);
```

See the [AdwSpringAnimationProps API reference](/api/react/type-aliases/AdwSpringAnimationProps.md) for all available options.

## Animating on Prop Changes

When `animate` changes, the component automatically transitions to the new values:

```tsx
import { AdwSpringAnimation, GtkButton, GtkBox } from "@gtkx/react";
import { useState } from "react";

const ToggleAnimation = () => {
    const [expanded, setExpanded] = useState(false);

    return (
        <GtkBox>
            <GtkButton label={expanded ? "Collapse" : "Expand"} onClicked={() => setExpanded(!expanded)} />
            <AdwSpringAnimation animate={{ scale: expanded ? 1.2 : 1 }} damping={0.7} stiffness={300}>
                <GtkButton label="Animated" />
            </AdwSpringAnimation>
        </GtkBox>
    );
};
```

## Exit Animations

Use the `exit` prop to animate when the component unmounts:

```tsx
import { AdwTimedAnimation, GtkButton, GtkBox } from "@gtkx/react";
import { useState } from "react";

const ExitExample = () => {
    const [visible, setVisible] = useState(true);

    return (
        <GtkBox>
            <GtkButton label="Toggle" onClicked={() => setVisible(!visible)} />
            {visible && (
                <AdwTimedAnimation
                    initial={{ opacity: 0, translateY: -20 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    exit={{ opacity: 0, translateY: 20 }}
                    duration={200}
                    animateOnMount
                >
                    <GtkLabel label="I fade in and out!" />
                </AdwTimedAnimation>
            )}
        </GtkBox>
    );
};
```

The component stays mounted during the exit animation and is removed after it completes.

## Animation Callbacks

Monitor animation state with callbacks:

```tsx
<AdwSpringAnimation
    animate={{ opacity: 1 }}
    onAnimationStart={() => console.log("Started")}
    onAnimationComplete={() => console.log("Finished")}
    animateOnMount
>
    <GtkButton label="Watch console" />
</AdwSpringAnimation>
```

## Skipping Initial Animation

Set `initial={false}` to skip the initial state and start at the `animate` values:

```tsx
<AdwTimedAnimation initial={false} animate={{ opacity: isActive ? 1 : 0.5 }}>
    <GtkButton label="No mount animation" />
</AdwTimedAnimation>
```

This is useful when you only want to animate on prop changes, not on mount.
