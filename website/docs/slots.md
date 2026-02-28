# Slots

GTK widgets sometimes have designated "slots" — named positions where you place child widgets. Unlike regular children that append to a container, slots set specific widget properties.

## Understanding Slots

In GTK, some widgets have properties that accept a single widget rather than a list of children. For example:

- `GtkMenuButton` has a `popover` property for its popup content
- `GtkHeaderBar` has a `titleWidget` property for a custom title
- `GtkPaned` has `startChild` and `endChild` properties

GTKX provides `x.Slot` to set these properties declaratively.

## Basic Usage

```tsx
import { x, GtkHeaderBar, GtkLabel } from "@gtkx/react";

<GtkHeaderBar>
    <x.Slot for={GtkHeaderBar} id="titleWidget">
        <GtkLabel label="Custom Title" cssClasses={["title"]} />
    </x.Slot>
</GtkHeaderBar>;
```

The `x.Slot` component:

1. Takes a `for` prop specifying the widget type
2. Takes an `id` prop specifying the slot name (camelCase)
3. Accepts a single child widget

## Container Slots

Some widgets add children through specific methods rather than single-widget properties. Use `x.ContainerSlot` for these cases. The `for` prop provides TypeScript type-narrowing for valid `id` values per parent widget type.

### Basic Usage

```tsx
import { x, GtkHeaderBar, GtkButton, GtkMenuButton } from "@gtkx/react";

<GtkHeaderBar>
    <x.ContainerSlot for={GtkHeaderBar} id="packStart">
        <GtkButton iconName="go-previous-symbolic" />
    </x.ContainerSlot>
    <x.Slot for={GtkHeaderBar} id="titleWidget">
        <GtkLabel label="Title" cssClasses={["title"]} />
    </x.Slot>
    <x.ContainerSlot for={GtkHeaderBar} id="packEnd">
        <GtkMenuButton iconName="open-menu-symbolic" />
    </x.ContainerSlot>
</GtkHeaderBar>;
```

## When to Use Slots

Use `x.Slot` when:

- A widget has a named property that accepts a single widget (like `popover`, `titleWidget`)
- You need to place content in a specific position (`startChild`, `endChild`)
- The GTK documentation mentions a widget property rather than child packing

Use `x.ContainerSlot` when:

- A widget adds children through add/pack methods (like `packStart`, `addTopBar`, `addPrefix`)
- You need to pack multiple children into a specific position

Don't use either when:

- Adding regular children to a container (just use JSX children)
- The widget uses standard child packing (`GtkBox`, `GtkListBox`)
