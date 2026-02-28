# Animations

GTKX provides a declarative animation API through the `x.Animation` component, powered by Adwaita's animation system. It supports both timed (duration-based) and spring (physics-based) animations.

## Basic Usage

Wrap any widget with `x.Animation` to animate its properties:

```tsx
import { x, GtkButton } from "@gtkx/react";

const FadeInButton = () => (
    <x.Animation initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ mode: "timed" }} animateOnMount>
        <GtkButton label="Hello" />
    </x.Animation>
);
```

The `initial` prop sets the starting values, `animate` sets the target values, and `animateOnMount` triggers the animation when the component first renders.

You can animate properties like `opacity`, `translateX`, `translateY`, `scale`, `scaleX`, `scaleY`, `rotate`, `skewX`, and `skewY`. See the [AnimatableProperties API reference](/api/react/type-aliases/AnimatableProperties.md) for the full list.

```tsx
<x.Animation
    initial={{ opacity: 0, scale: 0.8, translateY: -20 }}
    animate={{ opacity: 1, scale: 1, translateY: 0 }}
    transition={{ mode: "spring" }}
    animateOnMount
>
    <GtkLabel label="Animated!" />
</x.Animation>
```

## Timed Animations

Timed animations run for a fixed duration with an easing curve:

```tsx
import { x, GtkBox } from "@gtkx/react";
import { Easing } from "@gtkx/ffi/adw";

const TimedExample = () => (
    <x.Animation
        initial={{ translateX: -100 }}
        animate={{ translateX: 0 }}
        transition={{
            mode: "timed",
            duration: 500,
            easing: Easing.EASE_OUT_CUBIC,
            delay: 100,
        }}
        animateOnMount
    >
        <GtkBox />
    </x.Animation>
);
```

See the [TimedTransition API reference](/api/react/type-aliases/TimedTransition.md) for all available options.

## Spring Animations

Spring animations use physics simulation for natural-feeling motion:

```tsx
import { x, GtkButton } from "@gtkx/react";

const SpringExample = () => (
    <x.Animation
        initial={{ scale: 0.5 }}
        animate={{ scale: 1 }}
        transition={{
            mode: "spring",
            damping: 0.6,
            stiffness: 200,
            mass: 1,
        }}
        animateOnMount
    >
        <GtkButton label="Bounce!" />
    </x.Animation>
);
```

See the [SpringTransition API reference](/api/react/type-aliases/SpringTransition.md) for all available options.

## Animating on Prop Changes

When `animate` changes, the component automatically transitions to the new values:

```tsx
import { x, GtkButton, GtkBox } from "@gtkx/react";
import { useState } from "react";

const ToggleAnimation = () => {
    const [expanded, setExpanded] = useState(false);

    return (
        <GtkBox>
            <GtkButton label={expanded ? "Collapse" : "Expand"} onClicked={() => setExpanded(!expanded)} />
            <x.Animation
                animate={{ scale: expanded ? 1.2 : 1 }}
                transition={{ mode: "spring", damping: 0.7, stiffness: 300 }}
            >
                <GtkButton label="Animated" />
            </x.Animation>
        </GtkBox>
    );
};
```

## Exit Animations

Use the `exit` prop to animate when the component unmounts:

```tsx
import { x, GtkButton, GtkBox } from "@gtkx/react";
import { useState } from "react";

const ExitExample = () => {
    const [visible, setVisible] = useState(true);

    return (
        <GtkBox>
            <GtkButton label="Toggle" onClicked={() => setVisible(!visible)} />
            {visible && (
                <x.Animation
                    initial={{ opacity: 0, translateY: -20 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    exit={{ opacity: 0, translateY: 20 }}
                    transition={{ mode: "timed", duration: 200 }}
                    animateOnMount
                >
                    <GtkLabel label="I fade in and out!" />
                </x.Animation>
            )}
        </GtkBox>
    );
};
```

The component stays mounted during the exit animation and is removed after it completes.

## Animation Callbacks

Monitor animation state with callbacks:

```tsx
<x.Animation
    animate={{ opacity: 1 }}
    transition={{ mode: "spring" }}
    onAnimationStart={() => console.log("Started")}
    onAnimationComplete={() => console.log("Finished")}
    animateOnMount
>
    <GtkButton label="Watch console" />
</x.Animation>
```

## Skipping Initial Animation

Set `initial={false}` to skip the initial state and start at the `animate` values:

```tsx
<x.Animation initial={false} animate={{ opacity: isActive ? 1 : 0.5 }} transition={{ mode: "timed" }}>
    <GtkButton label="No mount animation" />
</x.Animation>
```

This is useful when you only want to animate on prop changes, not on mount.
