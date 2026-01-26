# Animations

GTKX provides a declarative animation API through the `x.Animation` component, powered by libadwaita's animation system. It supports both timed (duration-based) and spring (physics-based) animations.

## Basic Usage

Wrap any widget with `x.Animation` to animate its properties:

```tsx
import { x, GtkButton } from "@gtkx/react";

const FadeInButton = () => (
  <x.Animation
    mode="timed"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    animateOnMount
  >
    <GtkButton label="Hello" />
  </x.Animation>
);
```

The `initial` prop sets the starting values, `animate` sets the target values, and `animateOnMount` triggers the animation when the component first renders.

## Animatable Properties

The following CSS properties can be animated:

| Property | Description |
|----------|-------------|
| `opacity` | 0 (transparent) to 1 (opaque) |
| `translateX` | Horizontal offset in pixels |
| `translateY` | Vertical offset in pixels |
| `scale` | Uniform scale factor (1 = normal) |
| `scaleX` | Horizontal scale factor |
| `scaleY` | Vertical scale factor |
| `rotate` | Rotation in degrees |
| `skewX` | Horizontal skew in degrees |
| `skewY` | Vertical skew in degrees |

```tsx
<x.Animation
  mode="spring"
  initial={{ opacity: 0, scale: 0.8, translateY: -20 }}
  animate={{ opacity: 1, scale: 1, translateY: 0 }}
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
    mode="timed"
    initial={{ translateX: -100 }}
    animate={{ translateX: 0 }}
    transition={{
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

### Timed Transition Options

| Option | Description | Default |
|--------|-------------|---------|
| `duration` | Animation length in milliseconds | 300 |
| `easing` | Easing function from `Adw.Easing` | `EASE_OUT_CUBIC` |
| `delay` | Delay before starting in milliseconds | 0 |
| `repeat` | Number of repetitions (0 = none, -1 = infinite) | 0 |
| `reverse` | Play animation backwards | `false` |
| `alternate` | Alternate direction on each repeat | `false` |

## Spring Animations

Spring animations use physics simulation for natural-feeling motion:

```tsx
import { x, GtkButton } from "@gtkx/react";

const SpringExample = () => (
  <x.Animation
    mode="spring"
    initial={{ scale: 0.5 }}
    animate={{ scale: 1 }}
    transition={{
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

### Spring Transition Options

| Option | Description | Default |
|--------|-------------|---------|
| `damping` | Controls oscillation decay (1 = critically damped, <1 = bouncy) | 1 |
| `stiffness` | Spring stiffness affecting speed | 100 |
| `mass` | Virtual mass affecting momentum | 1 |
| `initialVelocity` | Starting velocity | 0 |
| `clamp` | Prevent overshooting the target | `false` |
| `delay` | Delay before starting in milliseconds | 0 |

## Animating on Prop Changes

When `animate` changes, the component automatically transitions to the new values:

```tsx
import { x, GtkButton, GtkBox } from "@gtkx/react";
import { useState } from "react";

const ToggleAnimation = () => {
  const [expanded, setExpanded] = useState(false);

  return (
    <GtkBox>
      <GtkButton
        label={expanded ? "Collapse" : "Expand"}
        onClicked={() => setExpanded(!expanded)}
      />
      <x.Animation
        mode="spring"
        animate={{ scale: expanded ? 1.2 : 1 }}
        transition={{ damping: 0.7, stiffness: 300 }}
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
          mode="timed"
          initial={{ opacity: 0, translateY: -20 }}
          animate={{ opacity: 1, translateY: 0 }}
          exit={{ opacity: 0, translateY: 20 }}
          transition={{ duration: 200 }}
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
  mode="spring"
  animate={{ opacity: 1 }}
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
<x.Animation
  mode="timed"
  initial={false}
  animate={{ opacity: isActive ? 1 : 0.5 }}
>
  <GtkButton label="No mount animation" />
</x.Animation>
```

This is useful when you only want to animate on prop changes, not on mount.
