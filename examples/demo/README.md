# GTKx Kitchen Sink Demo

This demo showcases **ALL** major reconciler features and common GTK widgets in a single application.

## Features Demonstrated

### Reconciler Capabilities

1. **Named Child Slots** - CenterBox, Paned, and Grid use special named slots for positioning children
2. **ListView with ItemFactory** - Dynamic lists with custom rendering and reconciler-managed items
3. **createPortal()** - Render content into different parts of the widget tree
4. **Typed Refs** - Full TypeScript support for widget refs
5. **Signal Handlers** - Event handling with onClicked, onToggled, etc.

### Common GTK Widgets

- **Layout**: Box, CenterBox, Grid, Paned, Frame, ScrolledWindow
- **Buttons**: Button, ToggleButton, CheckButton, Switch
- **Input**: Entry
- **Display**: Label, ProgressBar, Spinner, Separator
- **Lists**: ListView with dynamic data

## Running the Demo

### Build the project

```bash
pnpm build
```

### Run the kitchen sink

```bash
pnpm --filter demo kitchen-sink
```

Or from the examples/demo directory:

```bash
pnpm kitchen-sink
```

## Code Structure

The kitchen-sink example (`src/kitchen-sink.tsx`) is organized into clear sections:

- **State Management** - React hooks for component state
- **Typed Refs** - Examples of accessing GTK widgets via refs
- **Effects** - useEffect hooks for lifecycle management
- **Event Handlers** - Callbacks for user interactions
- **Render** - JSX demonstrating all features

Each feature is clearly labeled with comments showing what reconciler capability or widget type is being demonstrated.

## Note on TypeScript

While the reconciler fully supports all features at runtime, some TypeScript declarations for named slots (like `CenterBox.StartWidget`) are not yet fully integrated into the type system. The code works perfectly at runtime but may show TypeScript errors during compilation.

To run with TypeScript checking disabled:

```bash
pnpm tsx --tsconfig '{"compilerOptions":{"noEmit":true}}' src/kitchen-sink.tsx
```

## Key Examples

### Named Slots (CenterBox)

```tsx
<CenterBox>
  <CenterBox.StartWidget>
    <Label label="Left" />
  </CenterBox.StartWidget>
  <CenterBox.CenterWidget>
    <Label label="Center" />
  </CenterBox.CenterWidget>
  <CenterBox.EndWidget>
    <Button label="Right" />
  </CenterBox.EndWidget>
</CenterBox>
```

### ListView with ItemFactory

```tsx
<ListView
  itemFactory={(item: TodoItem | null) =>
    item ? (
      <Box spacing={10}>
        <CheckButton active={item.completed} />
        <Label label={item.text} />
      </Box>
    ) : (
      <Label label="Loading..." />
    )
  }
>
  {todos.map((todo) => (
    <ListView.Item item={todo} key={todo.id} />
  ))}
</ListView>
```

### createPortal

```tsx
{portalContainerRef.current &&
  createPortal(
    <Box spacing={5}>
      <Label label="✨ Portaled content!" />
      <Button label="Click me" />
    </Box>,
    portalContainerRef.current
  )}
```

### Typed Refs

```tsx
const labelRef = useRef<Gtk.Label>(null);

// Later...
<Label label="Hello" ref={labelRef} />

// Access in useEffect
useEffect(() => {
  if (labelRef.current) {
    // TypeScript knows all Label methods are available
    console.log("Label:", labelRef.current);
  }
}, []);
```

## Learning More

- See `src/index.tsx` for a simple "Hello World" example
- See `packages/gtkx/src/example.tsx` for more focused examples of each feature
- See `packages/gtkx/src/ref-example.tsx` for detailed ref usage
