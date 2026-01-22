# Event Controllers

GTKX provides two ways to handle user input events: gesture props on widgets and event controller child elements. This guide covers both approaches.

## Gesture Props

The simplest way to handle events is through gesture props directly on widgets. All widgets support these callbacks:

```tsx
import { GtkBox, GtkLabel } from "@gtkx/react";
import { useState } from "react";

const HoverLabel = () => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <GtkBox
      onEnter={() => setIsHovered(true)}
      onLeave={() => setIsHovered(false)}
    >
      <GtkLabel label={isHovered ? "Hovering!" : "Hover over me"} />
    </GtkBox>
  );
};
```

### Available Gesture Props

#### Pointer Events

| Prop | Signature | Description |
| ---- | --------- | ----------- |
| `onEnter` | `(x, y, event?) => void` | Pointer enters widget |
| `onLeave` | `(event?) => void` | Pointer leaves widget |
| `onMotion` | `(x, y, event?) => void` | Pointer moves over widget |

#### Click Events

| Prop | Signature | Description |
| ---- | --------- | ----------- |
| `onPressed` | `(nPress, x, y, event?) => void` | Button pressed |
| `onReleased` | `(nPress, x, y, event?) => void` | Button released |

#### Keyboard Events

| Prop | Signature | Description |
| ---- | --------- | ----------- |
| `onKeyPressed` | `(keyval, keycode, state, event?) => boolean` | Key pressed (return true to stop propagation) |
| `onKeyReleased` | `(keyval, keycode, state, event?) => void` | Key released |

#### Scroll Events

| Prop | Signature | Description |
| ---- | --------- | ----------- |
| `onScroll` | `(dx, dy, event?) => void` | Scroll wheel moved |

#### Drag Gestures

| Prop | Signature | Description |
| ---- | --------- | ----------- |
| `onGestureDragBegin` | `(startX, startY) => void` | Drag started |
| `onGestureDragUpdate` | `(offsetX, offsetY) => void` | Drag moved |
| `onGestureDragEnd` | `(offsetX, offsetY) => void` | Drag ended |

#### Advanced Gestures

| Prop | Signature | Description |
| ---- | --------- | ----------- |
| `onStylusDown` | `(x, y) => void` | Stylus touched surface |
| `onStylusMotion` | `(x, y) => void` | Stylus moved |
| `onStylusUp` | `(x, y) => void` | Stylus lifted |
| `onStylusProximity` | `(x, y) => void` | Stylus entered proximity |
| `onRotateAngleChanged` | `(angle, angleDelta) => void` | Rotation gesture |
| `onSwipe` | `(velocityX, velocityY, event?) => void` | Swipe gesture |
| `onLongPressPressed` | `(x, y) => void` | Long press detected |
| `onLongPressCancelled` | `() => void` | Long press cancelled |
| `onZoomScaleChanged` | `(scale, event?) => void` | Pinch zoom gesture |

## Event Controller Elements

For more control over event handling, you can add event controllers as child elements to any widget. This approach is useful when you need to:

- Configure controller-specific properties
- Add multiple controllers of the same type
- Access controller refs for advanced use cases

```tsx
import {
  GtkBox,
  GtkLabel,
  GtkEventControllerMotion,
  GtkEventControllerKey,
} from "@gtkx/react";
import { useState } from "react";

const InteractiveBox = () => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [lastKey, setLastKey] = useState<string | null>(null);

  return (
    <GtkBox focusable>
      <GtkEventControllerMotion
        onEnter={(x, y) => console.log("Entered at", x, y)}
        onMotion={(x, y) => setPosition({ x, y })}
        onLeave={() => console.log("Left")}
      />
      <GtkEventControllerKey
        onKeyPressed={(keyval, keycode, state) => {
          setLastKey(String.fromCharCode(keyval));
          return false;
        }}
      />
      <GtkLabel label={`Position: ${Math.round(position.x)}, ${Math.round(position.y)}`} />
      {lastKey && <GtkLabel label={`Last key: ${lastKey}`} />}
    </GtkBox>
  );
};
```

### Available Event Controllers

| Controller | Description |
| ---------- | ----------- |
| `GtkEventControllerMotion` | Pointer enter/leave/motion events |
| `GtkEventControllerKey` | Keyboard input events |
| `GtkEventControllerScroll` | Scroll wheel events |
| `GtkEventControllerFocus` | Focus enter/leave events |
| `GtkGestureClick` | Click/tap gestures with button detection |
| `GtkGestureDrag` | Drag gestures with start position tracking |
| `GtkGestureLongPress` | Long press detection with configurable delay |
| `GtkGestureZoom` | Pinch-to-zoom gestures |
| `GtkGestureRotate` | Two-finger rotation gestures |
| `GtkGestureSwipe` | Swipe gestures with velocity |
| `GtkGestureStylus` | Stylus/pen input with pressure and tilt |

## Examples

### Keyboard Navigation

```tsx
import { GtkBox, GtkLabel, GtkEventControllerKey } from "@gtkx/react";
import * as Gdk from "@gtkx/ffi/gdk";
import { useState } from "react";

const KeyboardNav = () => {
  const [index, setIndex] = useState(0);
  const items = ["First", "Second", "Third"];

  return (
    <GtkBox focusable>
      <GtkEventControllerKey
        onKeyPressed={(keyval) => {
          if (keyval === Gdk.KEY_Up) {
            setIndex((i) => Math.max(0, i - 1));
            return true;
          }
          if (keyval === Gdk.KEY_Down) {
            setIndex((i) => Math.min(items.length - 1, i + 1));
            return true;
          }
          return false;
        }}
      />
      {items.map((item, i) => (
        <GtkLabel
          key={item}
          label={item}
          cssClasses={i === index ? ["selected"] : []}
        />
      ))}
    </GtkBox>
  );
};
```

### Interactive Drawing Canvas

```tsx
import { GtkDrawingArea } from "@gtkx/react";
import type { Context } from "@gtkx/ffi/cairo";
import * as Gtk from "@gtkx/ffi/gtk";
import { useRef, useState } from "react";

interface Point {
  x: number;
  y: number;
}

const DrawingCanvas = () => {
  const ref = useRef<Gtk.DrawingArea | null>(null);
  const [points, setPoints] = useState<Point[]>([]);
  const startRef = useRef<Point | null>(null);

  const handleDraw = (
    self: Gtk.DrawingArea,
    cr: Context,
    width: number,
    height: number,
  ) => {
    cr.setSourceRgb(1, 1, 1);
    cr.rectangle(0, 0, width, height);
    cr.fill();

    if (points.length > 1) {
      cr.setSourceRgb(0, 0, 0);
      cr.setLineWidth(2);
      cr.moveTo(points[0].x, points[0].y);
      for (const point of points.slice(1)) {
        cr.lineTo(point.x, point.y);
      }
      cr.stroke();
    }
  };

  return (
    <GtkDrawingArea
      ref={ref}
      contentWidth={400}
      contentHeight={300}
      onDraw={handleDraw}
      onGestureDragBegin={(startX, startY) => {
        startRef.current = { x: startX, y: startY };
        setPoints([{ x: startX, y: startY }]);
      }}
      onGestureDragUpdate={(offsetX, offsetY) => {
        if (startRef.current) {
          const x = startRef.current.x + offsetX;
          const y = startRef.current.y + offsetY;
          setPoints((prev) => [...prev, { x, y }]);
          ref.current?.queueDraw();
        }
      }}
      onGestureDragEnd={() => {
        startRef.current = null;
      }}
    />
  );
};
```

### Hover Effects

```tsx
import { GtkBox, GtkLabel, GtkEventControllerMotion } from "@gtkx/react";
import { css, cx } from "@gtkx/css";
import { useState } from "react";

const baseStyle = css`
  padding: 16px;
  border-radius: 8px;
  background: @theme_bg_color;
  transition: background 200ms;
`;

const hoverStyle = css`
  background: alpha(@theme_fg_color, 0.1);
`;

const HoverCard = ({ title }: { title: string }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <GtkBox cssClasses={cx(baseStyle, isHovered && hoverStyle)}>
      <GtkEventControllerMotion
        onEnter={() => setIsHovered(true)}
        onLeave={() => setIsHovered(false)}
      />
      <GtkLabel label={title} />
    </GtkBox>
  );
};
```

### Gesture Refs

For advanced use cases, you can access gesture controller refs:

```tsx
import { GtkBox, GtkLabel } from "@gtkx/react";
import * as Gtk from "@gtkx/ffi/gtk";
import { useRef } from "react";

const GestureRefExample = () => {
  const rotateRef = useRef<Gtk.GestureRotate | null>(null);
  const zoomRef = useRef<Gtk.GestureZoom | null>(null);

  return (
    <GtkBox
      gestureRotateRef={rotateRef}
      gestureZoomRef={zoomRef}
      onRotateAngleChanged={(angle, delta) => {
        console.log("Rotation:", angle, "Delta:", delta);
      }}
      onZoomScaleChanged={(scale) => {
        console.log("Zoom scale:", scale);
      }}
    >
      <GtkLabel label="Pinch and rotate" />
    </GtkBox>
  );
};
```

## When to Use Which Approach

**Use gesture props when:**
- You need simple event handling
- One handler per event type is sufficient
- You don't need controller-specific configuration

**Use event controller elements when:**
- You need multiple controllers of the same type
- You need to configure controller-specific properties
- You want clearer separation of concerns in complex widgets
- You need access to the controller instance via ref

Both approaches work with any widget and can be mixed in the same component.
