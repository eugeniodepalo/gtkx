# Animations

GTKX provides declarative animations through the `x.Animation` wrapper component, offering a Framer Motion-like API that uses libadwaita's native animation primitives under the hood.

## Basic Usage

Wrap any widget in `x.Animation` to animate it:

```tsx
import { x, GtkBox, GtkLabel } from "@gtkx/react";

const FadeIn = () => (
  <x.Animation
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
  >
    <GtkLabel label="Hello, World!" />
  </x.Animation>
);
```

The widget will animate from the `initial` state to the `animate` state when it mounts.

## Animatable Properties

The following properties can be animated:

| Property  | Type   | Description                    |
| --------- | ------ | ------------------------------ |
| `opacity` | number | Transparency (0 to 1)          |
| `x`       | number | Horizontal translation (pixels) |
| `y`       | number | Vertical translation (pixels)  |
| `scale`   | number | Uniform scale factor           |
| `scaleX`  | number | Horizontal scale factor        |
| `scaleY`  | number | Vertical scale factor          |
| `rotate`  | number | Rotation angle (degrees)       |

## Transition Types

### Spring Transitions

Spring animations provide natural, physics-based motion:

```tsx
<x.Animation
  initial={{ scaleX: 0.5, scaleY: 0.5 }}
  animate={{ scaleX: 1, scaleY: 1 }}
  transition={{
    type: "spring",
    stiffness: 300,
    damping: 20,
  }}
>
  <GtkButton label="Bounce In" />
</x.Animation>
```

**Spring parameters:**

| Parameter   | Type   | Default | Description                                      |
| ----------- | ------ | ------- | ------------------------------------------------ |
| `stiffness` | number | 100     | Spring stiffness (higher = faster)               |
| `damping`   | number | 10      | Damping ratio (higher = less oscillation)        |

### Timed Transitions

Timed animations use a fixed duration with an easing function:

```tsx
<x.Animation
  initial={{ opacity: 0, y: -20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{
    type: "timed",
    duration: 300,
    easing: "ease-out",
  }}
>
  <GtkBox>...</GtkBox>
</x.Animation>
```

**Timed parameters:**

| Parameter  | Type   | Default  | Description                          |
| ---------- | ------ | -------- | ------------------------------------ |
| `duration` | number | 250      | Duration in milliseconds             |
| `easing`   | string | "linear" | Easing function                      |

**Available easing functions:**
- `"linear"` - Constant speed
- `"ease"` - Slow start and end
- `"ease-in"` - Slow start
- `"ease-out"` - Slow end
- `"ease-in-out"` - Slow start and end (smoother than `ease`)

## Animation Lifecycle

### onAnimationComplete

Callback fired when the animation finishes:

```tsx
const [isVisible, setIsVisible] = useState(true);

<x.Animation
  animate={{ opacity: isVisible ? 1 : 0 }}
  onAnimationComplete={() => {
    if (!isVisible) {
      console.log("Element has faded out");
    }
  }}
>
  <GtkLabel label="Fading..." />
</x.Animation>
```

## Common Patterns

### Fade and Scale

A common pattern for modal or popup entrances:

```tsx
<x.Animation
  initial={{ opacity: 0, scaleX: 0.95, scaleY: 0.95 }}
  animate={{ opacity: 1, scaleX: 1, scaleY: 1 }}
  transition={{ type: "spring", stiffness: 400, damping: 25 }}
>
  <GtkBox cssClasses={["card"]}>
    <GtkLabel label="Card content" />
  </GtkBox>
</x.Animation>
```

### Slide In

Slide content in from the side:

```tsx
<x.Animation
  initial={{ x: -100, opacity: 0 }}
  animate={{ x: 0, opacity: 1 }}
  transition={{ type: "timed", duration: 200, easing: "ease-out" }}
>
  <GtkBox>
    <GtkLabel label="Sliding content" />
  </GtkBox>
</x.Animation>
```

### State-Driven Animation

Animate based on state changes:

```tsx
const [isExpanded, setIsExpanded] = useState(false);

<GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={12}>
  <GtkButton
    label={isExpanded ? "Collapse" : "Expand"}
    onClicked={() => setIsExpanded(!isExpanded)}
  />
  <x.Animation
    animate={{
      scaleY: isExpanded ? 1 : 0,
      opacity: isExpanded ? 1 : 0,
    }}
    transition={{ type: "spring", stiffness: 300, damping: 25 }}
  >
    <GtkBox cssClasses={["card"]}>
      <GtkLabel label="Expandable content" />
    </GtkBox>
  </x.Animation>
</GtkBox>
```

### Staggered Animations

Animate list items with delays (using separate Animation wrappers):

```tsx
const items = ["First", "Second", "Third"];

<GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8}>
  {items.map((item, index) => (
    <x.Animation
      key={item}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        type: "timed",
        duration: 200,
        easing: "ease-out",
      }}
    >
      <GtkLabel label={item} />
    </x.Animation>
  ))}
</GtkBox>
```

### Rotation Animation

Spin or rotate elements:

```tsx
const [isSpinning, setIsSpinning] = useState(false);

<x.Animation
  animate={{ rotate: isSpinning ? 360 : 0 }}
  transition={{ type: "timed", duration: 500, easing: "ease-in-out" }}
  onAnimationComplete={() => setIsSpinning(false)}
>
  <GtkImage iconName="view-refresh-symbolic" pixelSize={24} />
</x.Animation>
```

## API Reference

### x.Animation Props

| Prop                  | Type                | Description                              |
| --------------------- | ------------------- | ---------------------------------------- |
| `initial`             | AnimatableProperties | Initial state (applied immediately)      |
| `animate`             | AnimatableProperties | Target state to animate to               |
| `transition`          | Transition          | Animation configuration                  |
| `onAnimationComplete` | () => void          | Callback when animation completes        |
| `children`            | ReactNode           | Single widget child to animate           |

### AnimatableProperties

```typescript
type AnimatableProperties = {
  opacity?: number;
  x?: number;
  y?: number;
  scale?: number;
  scaleX?: number;
  scaleY?: number;
  rotate?: number;
};
```

### SpringTransition

```typescript
type SpringTransition = {
  type: "spring";
  stiffness?: number;
  damping?: number;
};
```

### TimedTransition

```typescript
type TimedTransition = {
  type: "timed";
  duration?: number;
  easing?: "linear" | "ease" | "ease-in" | "ease-out" | "ease-in-out";
};
```

## Notes

- The `x.Animation` component wraps a single child widget
- Animations use libadwaita's `Adw.Animation` primitives for native performance
- Properties not specified in `initial` will use their current values
- When `animate` changes, a new animation starts from the current state
- Spring animations continue until they settle; timed animations have a fixed duration
