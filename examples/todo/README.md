# Todo App

A full-featured todo application demonstrating GTKX with Adwaita integration and comprehensive integration tests.

## Features

- Add, complete, and delete tasks
- Filter by all/active/completed
- Clear all completed tasks
- Toast notifications for actions
- Modern Adwaita styling with `AdwApplicationWindow`

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

# Run tests
pnpm test
```

## Structure

```
src/
├── app.tsx                 # Main App component
├── dev.tsx                 # Development entry point
├── index.tsx               # Production entry point
├── types.ts                # TypeScript interfaces
├── components/
│   ├── todo-input.tsx      # Input field + Add button
│   ├── todo-row.tsx        # Individual todo item
│   └── filter-bar.tsx      # All/Active/Completed filters
└── hooks/
    └── use-todos.ts        # Todo state management

tests/
└── app.test.tsx            # Integration tests
```

## Key Concepts

### Adwaita Integration

The app uses Adwaita components for a modern GNOME look:

```tsx
<AdwApplicationWindow title="Tasks" onCloseRequest={quit}>
  <AdwToolbarView>
    <Toolbar.Top>
      <AdwHeaderBar />
    </Toolbar.Top>
    <AdwToastOverlay>
      {/* content */}
    </AdwToastOverlay>
  </AdwToolbarView>
</AdwApplicationWindow>
```

### Action Rows

Todo items use `AdwActionRow` with `ActionRow.Prefix` and `ActionRow.Suffix`:

```tsx
<AdwActionRow title={todo.text}>
  <ActionRow.Prefix>
    <GtkCheckButton active={todo.completed} />
  </ActionRow.Prefix>
  <ActionRow.Suffix>
    <GtkButton iconName="edit-delete-symbolic" />
  </ActionRow.Suffix>
</AdwActionRow>
```

### Toast Notifications

Toasts provide feedback for user actions:

```tsx
const toastRef = useRef<Adw.ToastOverlay>(null);

const showToast = (message: string) => {
  const toast = new Adw.Toast(message);
  toastRef.current?.addToast(toast);
};
```

### Testing with @gtkx/testing

Integration tests use a Testing Library-like API:

```tsx
import { render, screen, userEvent, cleanup } from "@gtkx/testing";

it("adds a todo", async () => {
  await render(<App />);

  const input = await screen.findByTestId("todo-input");
  await userEvent.type(input, "Buy milk");

  const addButton = await screen.findByTestId("add-button");
  await userEvent.click(addButton);

  expect(await screen.findByText("Buy milk")).toBeDefined();
});
```

## Adwaita CSS Classes

The app uses semantic Adwaita classes:

- `boxed-list` - Rounded list container
- `dim-label` - Dimmed text for secondary info
- `suggested-action` - Highlighted primary button
- `flat` - Borderless button
- `circular` - Circular button
- `linked` - Connected button group
- `title` - Header title styling
