---
sidebar_position: 3
---

# Testing

GTKX provides `@gtkx/testing`, a Testing Library-inspired package for testing GTK components. It offers familiar APIs like `screen`, `userEvent`, and query functions.

## Installation

```bash
pnpm add -D @gtkx/testing
```

## Setup

`@gtkx/testing` works with any test runner (Jest, Vitest, Node's built-in test runner, etc.).

### Display Requirements

Tests require `xvfb-run` because GTK needs a display. On Wayland systems, set `GDK_BACKEND=x11` to ensure windows render offscreen:

```bash
GDK_BACKEND=x11 xvfb-run -a <your-test-command>
```

## Writing Tests

### Basic Test Structure

```tsx
import { cleanup, render, screen } from "@gtkx/testing";
import { App } from "../src/app.js";

// Clean up after each test
afterEach(() => cleanup());

test("renders the title", async () => {
  render(<App />);

  const title = await screen.findByText("Welcome");
  expect(title).toBeDefined();
});
```

GTK is automatically initialized on the first `render()` call—no manual setup required.

### Query Functions

GTKX testing provides several ways to find elements. Each query type comes in multiple variants:

| Variant | Returns | Throws if not found? | Async? |
|---------|---------|----------------------|--------|
| `getBy*` | Single element | Yes | No |
| `getAllBy*` | Array of elements | Yes (if empty) | No |
| `queryBy*` | Single element or `null` | No | No |
| `queryAllBy*` | Array of elements (may be empty) | No | No |
| `findBy*` | Single element | Yes | Yes |
| `findAllBy*` | Array of elements | Yes (if empty) | Yes |

#### By Text

```tsx
// Find by exact text
const label = await screen.findByText("Hello, World!");

// Find by partial text (regex)
const greeting = await screen.findByText(/hello/i);

// Check if element exists without throwing
const maybeLabel = screen.queryByText("Optional");
if (maybeLabel) {
  // Element exists
}

// Find all matching elements
const allLabels = screen.getAllByText(/item/i);
```

#### By Role

GTK widgets have accessibility roles. Use `findByRole` to query by role:

```tsx
import { AccessibleRole } from "@gtkx/ffi/gtk";

// Find a button by role and name
const button = await screen.findByRole(AccessibleRole.BUTTON, {
  name: "Submit",
});

// Find any button
const anyButton = await screen.findByRole(AccessibleRole.BUTTON);

// Find a checked checkbox
const checked = screen.getByRole(AccessibleRole.CHECKBOX, { checked: true });

// Find an expanded expander
const expanded = screen.getByRole(AccessibleRole.BUTTON, { expanded: true });
```

Common roles:
- `AccessibleRole.BUTTON` — Buttons
- `AccessibleRole.LABEL` — Labels
- `AccessibleRole.TEXT_BOX` — Text inputs
- `AccessibleRole.CHECKBOX` — Checkboxes
- `AccessibleRole.RADIO` — Radio buttons
- `AccessibleRole.TOGGLE_BUTTON` — Toggle buttons
- `AccessibleRole.SWITCH` — Switches
- `AccessibleRole.SEARCH_BOX` — Search inputs
- `AccessibleRole.SPIN_BUTTON` — Spin buttons

#### By Label Text

Find form controls by their associated label:

```tsx
const input = await screen.findByLabelText("Email Address");
```

#### By Test ID

Find elements by their widget name (test ID). Set the `name` prop on a widget to use this query:

```tsx
// In your component
<Button name="submit-btn">Submit</Button>

// In your test
const button = screen.getByTestId("submit-btn");
```

### Synchronous Queries

For elements that are immediately available, use `getBy*` variants:

```tsx
// Throws if not found
const button = screen.getByText("Click me");
const input = screen.getByRole(AccessibleRole.TEXT_BOX);

// Returns null if not found (doesn't throw)
const maybeButton = screen.queryByText("Maybe exists");
```

## User Interactions

Use `userEvent` to simulate user actions:

### Clicking

```tsx
import { userEvent } from "@gtkx/testing";

const button = await screen.findByRole(AccessibleRole.BUTTON, {
  name: "Increment",
});
await userEvent.click(button);

// Double-click
await userEvent.dblClick(button);
```

### Typing

```tsx
const input = await screen.findByRole(AccessibleRole.TEXT_BOX);
await userEvent.type(input, "Hello, World!");

// Clear input field
await userEvent.clear(input);
```

### Custom Configuration

Use `userEvent.setup()` to create an instance with custom options:

```tsx
const user = userEvent.setup({ delay: 100 });
await user.click(button);
await user.type(input, "text");
```

## Low-Level Events

For more control, use `fireEvent` to emit GTK signals directly:

```tsx
import { fireEvent } from "@gtkx/testing";

// Fire any signal by name
fireEvent(button, "clicked");

// Convenience methods
fireEvent.click(button);
fireEvent.activate(entry);
fireEvent.toggled(checkbox);
fireEvent.changed(entry);
```

## Waiting for Changes

### `waitFor`

Wait for a condition to be true:

```tsx
import { waitFor } from "@gtkx/testing";

await userEvent.click(submitButton);

await waitFor(() => {
  expect(screen.getByText("Success!")).toBeDefined();
});

// With custom options
await waitFor(
  () => {
    expect(screen.getByText("Done")).toBeDefined();
  },
  { timeout: 2000, interval: 100 }
);
```

### `waitForElementToBeRemoved`

Wait for an element to be removed from the widget tree:

```tsx
import { waitForElementToBeRemoved } from "@gtkx/testing";

const loader = screen.getByText("Loading...");
await waitForElementToBeRemoved(loader);

// Or with a callback
await waitForElementToBeRemoved(() => screen.queryByText("Loading..."));
```

### `findBy*` Queries

`findBy*` queries automatically wait for elements:

```tsx
// Waits up to 1000ms for the element to appear
const message = await screen.findByText("Loading complete");
```

## Complete Example

Here's a full test for a counter component:

```tsx
import { AccessibleRole } from "@gtkx/ffi/gtk";
import { cleanup, render, screen, userEvent } from "@gtkx/testing";
import { Counter } from "../src/counter.js";

afterEach(() => cleanup());

test("renders initial count of zero", async () => {
  render(<Counter />);

  const label = await screen.findByText("Count: 0");
  expect(label).toBeDefined();
});

test("increments count when clicking increment button", async () => {
  render(<Counter />);

  const button = await screen.findByRole(AccessibleRole.BUTTON, {
    name: "Increment",
  });
  await userEvent.click(button);

  await screen.findByText("Count: 1");
});

test("decrements count when clicking decrement button", async () => {
  render(<Counter />);

  const button = await screen.findByRole(AccessibleRole.BUTTON, {
    name: "Decrement",
  });
  await userEvent.click(button);

  await screen.findByText("Count: -1");
});

test("resets count when clicking reset button", async () => {
  render(<Counter />);

  // Increment a few times
  const increment = await screen.findByRole(AccessibleRole.BUTTON, {
    name: "Increment",
  });
  await userEvent.click(increment);
  await userEvent.click(increment);
  await userEvent.click(increment);
  await screen.findByText("Count: 3");

  // Reset
  const reset = await screen.findByRole(AccessibleRole.BUTTON, {
    name: "Reset",
  });
  await userEvent.click(reset);

  await screen.findByText("Count: 0");
});
```

## Render Options

The `render` function accepts an options object:

```tsx
import { render } from "@gtkx/testing";

// With a wrapper component (useful for providers)
const Wrapper = ({ children }) => (
  <ThemeProvider theme="dark">{children}</ThemeProvider>
);

const { container, rerender, unmount, debug } = render(<MyComponent />, {
  wrapper: Wrapper,
});

// Rerender with new props
rerender(<MyComponent newProp="value" />);

// Debug the widget tree
debug();

// Unmount the component
unmount();
```

## API Reference

### Lifecycle Functions

| Function | Description |
|----------|-------------|
| `render(element, options?)` | Render a React element for testing. Returns `RenderResult`. |
| `cleanup()` | Unmount rendered components. Call after each test. |
| `teardown()` | Clean up GTK entirely. Used in global teardown. |

### RenderResult

The object returned by `render()`:

| Property/Method | Description |
|-----------------|-------------|
| `container` | The GTK Application instance |
| `rerender(element)` | Re-render with a new element |
| `unmount()` | Unmount the rendered component |
| `debug()` | Print the widget tree to console |
| `getBy*`, `queryBy*`, `findBy*`, etc. | Query methods bound to the container |

### Screen Queries

All queries are available on the `screen` object and on `RenderResult`:

| Query Type | Variants | Description |
|------------|----------|-------------|
| `*ByRole` | get, getAll, query, queryAll, find, findAll | Find by accessible role |
| `*ByText` | get, getAll, query, queryAll, find, findAll | Find by text content |
| `*ByLabelText` | get, getAll, query, queryAll, find, findAll | Find by label text |
| `*ByTestId` | get, getAll, query, queryAll, find, findAll | Find by widget name |

### Query Options

#### TextMatchOptions

```tsx
screen.getByText("hello", {
  exact: false, // Enable substring matching (default: true)
  normalizer: (text) => text.toLowerCase(), // Custom text normalizer
});
```

#### ByRoleOptions

```tsx
screen.getByRole(AccessibleRole.BUTTON, {
  name: "Submit", // Match by accessible name
  checked: true, // For checkboxes/radios
  expanded: true, // For expanders
  pressed: true, // For toggle buttons
  selected: true, // For selectable items
  level: 2, // For headings
});
```

### User Events

| Function | Description |
|----------|-------------|
| `userEvent.click(element)` | Click an element |
| `userEvent.dblClick(element)` | Double-click an element |
| `userEvent.type(element, text)` | Type text into an input |
| `userEvent.clear(element)` | Clear an input field |
| `userEvent.setup(options?)` | Create instance with custom options |

### Fire Event

| Function | Description |
|----------|-------------|
| `fireEvent(element, signalName)` | Fire any GTK signal |
| `fireEvent.click(element)` | Fire "clicked" signal |
| `fireEvent.activate(element)` | Fire "activate" signal |
| `fireEvent.toggled(element)` | Fire "toggled" signal |
| `fireEvent.changed(element)` | Fire "changed" signal |

### Async Utilities

| Function | Description |
|----------|-------------|
| `waitFor(callback, options?)` | Wait for a condition to be true |
| `waitForElementToBeRemoved(element, options?)` | Wait for element removal |

#### WaitForOptions

```tsx
await waitFor(callback, {
  timeout: 1000, // Max wait time in ms (default: 1000)
  interval: 50, // Poll interval in ms (default: 50)
  onTimeout: (error) => new Error("Custom message"), // Custom timeout error
});
```

## Tips

1. **Always call `cleanup()`** in `afterEach` to prevent test pollution
2. **Prefer `findBy*` queries** for elements that may need time to appear
3. **Use `queryBy*`** when checking that an element does NOT exist
4. **Use roles over text** when possible for more robust tests
5. **Test behavior, not implementation** — focus on what users see and do
6. **Use `debug()`** to inspect the widget tree when tests fail
