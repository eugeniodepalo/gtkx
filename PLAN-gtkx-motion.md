# GTKX Motion: Framer-Motion-Inspired Animation Library

## Overview

This document outlines a plan to build `@gtkx/motion`, a framer-motion-inspired animation API that leverages GTK's native Libadwaita animation system for optimal performance.

## Why Not Direct Framer-Motion Adaptation

Framer-motion is architecturally coupled to web technologies in ways that don't map to GTK:

| Framer-Motion | GTK/GTKX | Mismatch |
|--------------|----------|----------|
| `requestAnimationFrame` in JS thread | GTK main loop in native thread | Threading model |
| CSS transforms (`translateX`, `scale`, etc.) | GObject properties (`opacity`, `margin-start`, etc.) | Property semantics |
| DOM style mutations | FFI calls across process boundary | Performance characteristics |
| MotionValues bypass React | Property updates require reconciler | Update mechanism |

Framer-motion's `NativeAnimation` uses the Web Animations API, which has no equivalent in GTK. Their `JSAnimation` relies on RAF which would require cross-thread synchronization overhead.

## Existing GTK Animation Infrastructure

GTKX already exposes Libadwaita's complete animation system via FFI:

```typescript
// Available in @gtkx/ffi/adw
TimedAnimation           // Duration-based with 35+ easing curves
SpringAnimation          // Physics-based (damping, mass, stiffness)
CallbackAnimationTarget  // Receive values in JS callback
PropertyAnimationTarget  // Direct GObject property binding
SpringParams             // Physics configuration
```

### Key Capabilities

- **35+ easing functions**: LINEAR, EASE_IN_QUAD, EASE_OUT_CUBIC, EASE_IN_OUT_SINE, EASE_IN_BOUNCE, EASE_OUT_ELASTIC, etc.
- **Spring physics**: Configurable damping ratio, mass, stiffness
- **Animation state control**: play(), pause(), resume(), reset(), skip()
- **Completion callbacks**: `done` signal
- **Value querying**: `SpringAnimation.calculateValue(time)` and `calculateVelocity(time)`

## Proposed API

### Basic Usage

```typescript
import { motion, useSpring, useMotionValue } from "@gtkx/motion";

function Example() {
    const opacity = useMotionValue(1);
    const scale = useSpring(1, { damping: 0.8, stiffness: 100 });

    return (
        <motion.Box
            animate={{ opacity: 0.5 }}
            transition={{ type: "spring", damping: 0.7 }}
            whileHover={{ scale: 1.1 }}
        >
            Content
        </motion.Box>
    );
}
```

### Exit Animations

```typescript
import { motion, AnimatePresence } from "@gtkx/motion";

function List({ items }) {
    return (
        <AnimatePresence>
            {items.map(item => (
                <motion.Box
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                />
            ))}
        </AnimatePresence>
    );
}
```

## Implementation Components

### 1. `useMotionValue<T>`

Mutable ref-like value that can be animated without triggering React re-renders.

```typescript
function useMotionValue<T extends number>(initial: T): MotionValue<T>;
```

**Implementation:**
- Internally creates a GTK animation when value changes
- Uses `CallbackAnimationTarget` to receive frame updates
- Updates React refs without triggering reconciliation
- Supports `.get()`, `.set()`, `.onChange()` methods

### 2. `useSpring()` / `useTransition()`

Hooks wrapping `SpringAnimation` and `TimedAnimation`.

```typescript
function useSpring(
    value: number | MotionValue<number>,
    config?: SpringConfig
): MotionValue<number>;

function useTransition(
    value: number | MotionValue<number>,
    config?: TransitionConfig
): MotionValue<number>;
```

**Config mapping:**

| Framer-Motion | GTK SpringParams |
|--------------|------------------|
| `damping` | `dampingRatio` |
| `stiffness` | `stiffness` |
| `mass` | `mass` |
| `velocity` | `setInitialVelocity()` |

### 3. `motion.Widget` Factory

Higher-order component wrapper that intercepts animation props.

```typescript
const motion = {
    Box: createMotionComponent(GtkBox),
    Button: createMotionComponent(GtkButton),
    Label: createMotionComponent(GtkLabel),
    // ...
};
```

**Responsibilities:**
- Intercept `animate`, `initial`, `exit`, `transition` props
- Create animations for prop changes
- Use `PropertyAnimationTarget` for direct GObject property binding
- Handle gesture props (`whileHover`, `whileTap`, `drag`)

### 4. `AnimatePresence`

Coordinates exit animations before unmounting.

```typescript
function AnimatePresence({ children }: { children: React.ReactNode }): JSX.Element;
```

**Implementation:**
- Track children by key
- Delay unmounting until `done` signal fires
- Use existing `scheduleAfterCommit` for deferred cleanup

## Property Mapping

### Direct GObject Properties

| Animation Property | GTK Property | Notes |
|-------------------|--------------|-------|
| `opacity` | `opacity` | Direct 1:1 mapping |
| `visible` | `visible` | Boolean, animate opacity instead |
| `sensitive` | `sensitive` | Boolean |

### Layout Properties

| Animation Property | GTK Approach |
|-------------------|--------------|
| `x` | `margin-start` or Fixed child position |
| `y` | `margin-top` or Fixed child position |
| `width` | `width-request` |
| `height` | `height-request` |

### CSS-Animatable Properties

These properties can be animated via GTK CSS transitions (managed by @gtkx/css):

| Animation Property | CSS Property | Notes |
|-------------------|--------------|-------|
| `backgroundColor` | `background-color` | Full support |
| `color` | `color` | Full support |
| `borderRadius` | `border-radius` | Full support |
| `padding` | `padding` | Full support |
| `margin` | `margin` | Full support |
| `boxShadow` | `box-shadow` | Full support |

### Transform Properties (NOT Available via CSS)

**Important finding:** GTK CSS does **not** support general `transform` properties. Only `-gtk-icon-transform` exists for icon scaling.

| Animation Property | GTK Approach |
|-------------------|--------------|
| `scale` | Gsk.Transform via x.FixedChild |
| `rotate` | Gsk.Transform via x.FixedChild |
| `skew` | Gsk.Transform via x.FixedChild |
| `translateX/Y` | Gsk.Transform or margin properties |

## CSS Integration via @gtkx/css

The @gtkx/css package provides Emotion-based CSS-in-JS that works well for certain animation properties.

### What @gtkx/css Supports

| Feature | Supported | Notes |
|---------|-----------|-------|
| CSS-in-JS styling | ✅ Yes | Emotion-based (`css()`, `cx()`, `injectGlobal()`) |
| Dynamic class updates | ✅ Yes | Via React state + `cssClasses` prop |
| CSS Transitions | ✅ Yes | Standard `transition` property works |
| CSS Animations (@keyframes) | ❌ No | GTK CSS doesn't support @keyframes |
| CSS Transforms | ❌ No | Only `-gtk-icon-transform` for icons |
| GTK CSS variables | ✅ Yes | `@theme_bg_color`, `@accent_bg_color`, etc. |

### CSS Transition Example (Already Works)

```typescript
import { css, injectGlobal } from "@gtkx/css";

const animatedStyle = css`
    background-color: @theme_bg_color;
    transition: background-color 200ms ease, box-shadow 200ms ease;

    &:hover {
        background-color: alpha(@accent_bg_color, 0.1);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
`;

<GtkButton cssClasses={[animatedStyle]} />
```

### Limitation: No Imperative CSS Control

@gtkx/css uses a single global `CssProvider` and generates deterministic class names. It's designed for declarative styling, not per-frame CSS updates. For animation values that change every frame, we need a different approach.

## Transform Animation Strategy

Since CSS transforms aren't available, we have three options for scale/rotate/translate:

### Option A: Gsk.Transform with x.FixedChild (Recommended)

GTKX already exposes `Gsk.Transform` through the `x.FixedChild` component:

```typescript
import { Gsk, Graphene } from "@gtkx/ffi";

function AnimatedBox() {
    const [transform, setTransform] = useState(() => new Gsk.Transform());

    useEffect(() => {
        const target = new CallbackAnimationTarget((value) => {
            const t = new Gsk.Transform()
                .scale(1 + value * 0.1, 1 + value * 0.1)
                .rotate(value * 360);
            setTransform(t);
        });
        const animation = new TimedAnimation(widget, 0, 1, 1000, target);
        animation.play();
    }, []);

    return (
        <GtkFixed>
            <x.FixedChild transform={transform}>
                <GtkBox>Content</GtkBox>
            </x.FixedChild>
        </GtkFixed>
    );
}
```

**Pros:**
- Native GPU-accelerated transforms
- Full 3D transform support (perspective, rotateX/Y/Z)
- Already implemented in GTKX

**Cons:**
- Requires wrapping in `GtkFixed` + `x.FixedChild`
- More verbose than CSS transforms
- Layout doesn't account for transform (similar to CSS `transform`)

### Option B: MotionContainer (Recommended for Animation API)

Create a `<MotionContainer>` component that internally uses GtkFixed + x.FixedChild:

```typescript
<MotionContainer
    scale={scaleValue}
    rotate={rotateValue}
    x={xValue}
    y={yValue}
>
    <GtkButton>Animated</GtkButton>
</MotionContainer>
```

**Why keep both x.FixedChild AND MotionContainer:**

| Component | Purpose | API Style | Parent Requirement |
|-----------|---------|-----------|-------------------|
| `x.FixedChild` | GtkFixed layout primitive | Low-level (`transform: Gsk.Transform`) | Must be inside `GtkFixed` |
| `MotionContainer` | Animation abstraction | Declarative (`scale`, `rotate`, `x`, `y`) | Works anywhere |

**x.FixedChild stays** because:
- 1:1 mapping to GTK's actual API — predictable, no magic
- Has legitimate non-animation uses (absolute positioning, 3D scenes like the cube demo)
- Existing demos depend on it

**MotionContainer is added** because:
- Hides the `GtkFixed` + `Gsk.Transform` boilerplate
- Declarative props instead of imperative `Gsk.Transform` construction
- Integrates with animation lifecycle
- Can be used anywhere — doesn't require manual `GtkFixed` wrapper

**Implementation (Direct FFI, No React State):**

The key insight is that `MotionContainer` should **never use React state for animation values**. Instead, it:
1. Obtains a ref to the `FixedLayoutChild` on mount
2. Uses `CallbackAnimationTarget` to receive animation values
3. Calls `layoutChild.setTransform()` directly via FFI

```typescript
function MotionContainer({
    children,
    scale = 1,
    rotate = 0,
    x = 0,
    y = 0,
    transition,
}: MotionContainerProps) {
    const fixedRef = useRef<Gtk.Fixed>(null);
    const childRef = useRef<Gtk.Widget>(null);
    const layoutChildRef = useRef<Gtk.FixedLayoutChild>(null);

    useEffect(() => {
        if (!fixedRef.current || !childRef.current) return;

        const layoutManager = fixedRef.current.getLayoutManager();
        layoutChildRef.current = layoutManager.getLayoutChild(childRef.current) as Gtk.FixedLayoutChild;
    }, []);

    useEffect(() => {
        const layoutChild = layoutChildRef.current;
        if (!layoutChild || !fixedRef.current) return;

        const target = new CallbackAnimationTarget((value) => {
            const t = new Gsk.Transform()
                .scale(1 + (scale - 1) * value, 1 + (scale - 1) * value)
                .rotate(rotate * value);
            layoutChild.setTransform(t);  // Direct FFI, no setState!
        });

        const animation = new TimedAnimation(fixedRef.current, 0, 1, 300, target);
        animation.play();

        return () => animation.reset();
    }, [scale, rotate]);

    return (
        <GtkFixed ref={fixedRef}>
            <x.FixedChild x={x} y={y}>
                <GtkBox ref={childRef}>{children}</GtkBox>
            </x.FixedChild>
        </GtkFixed>
    );
}
```

**Why this matters:**

| Approach | React Re-renders | FFI Calls/Frame | Performance |
|----------|------------------|-----------------|-------------|
| `setState` in callback | 60/sec | Many (reconciler) | Poor |
| Direct `setTransform()` | 0 | 1 | Optimal |

The animation runs entirely in GTK. React only re-renders when the *target* values (`scale`, `rotate`) change, not on every frame.

### Option C: Margin-Based Position Animation

For simple x/y translations without rotation/scale, animate margin properties:

```typescript
const target = new PropertyAnimationTarget(widget, "margin-start");
const animation = new TimedAnimation(widget, 0, 100, 500, target);
animation.play();
```

**Pros:**
- Uses PropertyAnimationTarget (most efficient)
- No wrapper components needed
- Affects layout (siblings move)

**Cons:**
- Only works for position, not scale/rotate
- Layout reflow on each frame

## Animation Target Strategy

A core architectural decision: **never use React state in animation callbacks**.

### When to Use PropertyAnimationTarget

For animating numeric GObject properties directly — zero React involvement:

```typescript
const target = new PropertyAnimationTarget(widget, "opacity");
const animation = new TimedAnimation(widget, 1.0, 0.0, 300, target);
animation.play();
```

**Supported properties:**
- `opacity` (0.0 - 1.0)
- `margin-start`, `margin-end`, `margin-top`, `margin-bottom`
- `width-request`, `height-request`
- Any numeric GObject property

### When to Use CallbackAnimationTarget

For transforms and complex updates that can't be expressed as a single property:

```typescript
const target = new CallbackAnimationTarget((value) => {
    layoutChild.setTransform(transform);  // Direct FFI
    // OR
    area.queueDraw();  // For DrawingArea
});
```

**Valid use cases:**
- Transform animations via `FixedLayoutChild.setTransform()`
- DrawingArea custom rendering (update ref, call `queueDraw()`)
- Coordinated multi-property updates

**Invalid use case:**
```typescript
// ❌ NEVER DO THIS
const target = new CallbackAnimationTarget((value) => {
    setState(value);  // Triggers 60 re-renders/sec
});
```

### Summary Table

| Animation Type | Target | React Involvement |
|---------------|--------|-------------------|
| Opacity | `PropertyAnimationTarget(widget, "opacity")` | None |
| Position (layout-aware) | `PropertyAnimationTarget(widget, "margin-start")` | None |
| Scale/Rotate | `CallbackAnimationTarget` → `setTransform()` | None |
| DrawingArea | `CallbackAnimationTarget` → ref + `queueDraw()` | None |
| Any prop via setState | ❌ Don't do this | 60 renders/sec |

## Effort Breakdown

| Component | Complexity | Notes |
|-----------|------------|-------|
| `MotionValue` class | Low | Thin wrapper over refs + callbacks |
| `useMotionValue` hook | Low | React hook around MotionValue |
| `useSpring` / `useTransition` | Low | Map configs to SpringParams/Easing |
| `createMotionComponent` factory | Medium | Prop interception, animation lifecycle |
| Direct property animations (`opacity`) | Low | Use PropertyAnimationTarget |
| CSS property animations (`backgroundColor`) | Low | Use @gtkx/css + class toggling |
| Transform animations (`scale`, `rotate`) | Medium | Gsk.Transform + x.FixedChild wrapper |
| `MotionContainer` wrapper | Medium | Abstracts Fixed/FixedChild complexity |
| `AnimatePresence` | Medium | Exit animation coordination |
| Gesture integration | Medium | Connect to GTK gestures for velocity handoff |

## Benefits

- **Native 60fps animations** — Runs entirely in GTK thread
- **Physics-based springs** — Leverages `SpringAnimation`
- **Familiar API** — React developers know framer-motion patterns
- **Velocity handoff** — `SpringAnimation.setInitialVelocity()` enables gesture-to-animation continuity
- **No cross-thread overhead per frame** — Animation values computed natively

## Open Questions

1. Should `@gtkx/motion` be a separate package or part of `@gtkx/react`?
2. How to handle transform-origin for scale/rotate with Gsk.Transform?
3. Should we support variants (named animation states)?
4. Layout animations (animating between layout changes) — feasible with GTK?
5. Should `MotionContainer` be implicit (HOC magic) or explicit (user wraps in Fixed)?
6. How to handle the Gsk.Transform state updates — React state or refs with forceUpdate?

## Recommended Implementation Order

1. **Phase 1: Core Primitives**
   - `MotionValue` class
   - `useMotionValue`, `useSpring`, `useTransition` hooks
   - Basic property animation (opacity, margin)

2. **Phase 2: Motion Components**
   - `createMotionComponent` factory
   - `motion.Box`, `motion.Button`, `motion.Label` etc.
   - `animate`, `initial`, `transition` props

3. **Phase 3: Transforms**
   - `MotionContainer` component (wraps Fixed/FixedChild)
   - `scale`, `rotate`, `x`, `y` props on motion components
   - Transform-origin support

4. **Phase 4: Advanced Features**
   - `AnimatePresence` for exit animations
   - `whileHover`, `whileTap` gesture props
   - Velocity handoff from gestures to animations
   - Variants support

## References

- [Libadwaita Animation Documentation](https://gnome.pages.gitlab.gnome.org/libadwaita/doc/main/class.Animation.html)
- [Framer Motion Documentation](https://motion.dev/docs)
- [GTKX FFI Bindings](/packages/ffi/src/generated/adw/)
