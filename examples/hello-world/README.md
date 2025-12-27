# Hello World

A minimal GTKX example demonstrating the basics of building a GTK4 application with React.

## Features

- Simple counter with state management using `useState`
- Pure GTK4 widgets (no Adwaita dependencies)
- Button click handling with `onClicked`

## Running

```bash
# Install dependencies
pnpm install

# Start development server with hot reload
pnpm dev

# Build for production
pnpm build

# Run production build
pnpm start
```

## Structure

```
src/
├── app.tsx     # Main App component with counter logic
├── dev.tsx     # Development entry point (exports appId for HMR)
└── index.tsx   # Production entry point
```

## Key Concepts

### Application Window

Every GTKX app needs a `GtkApplicationWindow` as the root:

```tsx
<GtkApplicationWindow title="My App" onCloseRequest={quit}>
  {/* content */}
</GtkApplicationWindow>
```

### Layout with GtkBox

Use `GtkBox` for vertical or horizontal layouts:

```tsx
<GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={10}>
  <GtkLabel label="Hello" />
  <GtkButton label="Click me" />
</GtkBox>
```

### State Management

Standard React hooks work as expected:

```tsx
const [count, setCount] = useState(0);
<GtkButton onClicked={() => setCount(c => c + 1)} />
```
