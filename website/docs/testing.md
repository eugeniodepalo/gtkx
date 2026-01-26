# Testing

GTKX provides testing utilities through `@gtkx/testing`, offering an API similar to Testing Library for React.

## Setup

Install the testing and vitest packages:

```bash
npm install -D @gtkx/testing @gtkx/vitest vitest
```

Create a `vitest.config.ts` file:

```typescript
import gtkx from "@gtkx/vitest";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [gtkx()],
  test: {
    include: ["tests/**/*.test.{ts,tsx}"],
  },
});
```

Configure your test script in `package.json`:

```json
{
  "scripts": {
    "test": "vitest run"
  }
}
```

The `@gtkx/vitest` plugin automatically:

- Starts Xvfb instances for headless display
- Sets required GTK environment variables (`GDK_BACKEND`, `GSK_RENDERER`, etc.)
- Ensures proper display isolation between test workers

The `render()` function from `@gtkx/testing` handles GTK application lifecycle automatically, so no additional setup is needed.

## Basic Test

```tsx
import * as Gtk from "@gtkx/ffi/gtk";
import { cleanup, render, screen, userEvent } from "@gtkx/testing";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "../src/app.js";

describe("App", () => {
  afterEach(async () => {
    await cleanup();
  });

  it("renders the window", async () => {
    await render(<App />, { wrapper: false });

    const window = await screen.findByRole(Gtk.AccessibleRole.WINDOW, {
      name: "My App",
    });
    expect(window).toBeDefined();
  });
});
```

## Testing Hooks

Use `renderHook` to test custom React hooks in isolation:

```tsx
import { cleanup, renderHook } from "@gtkx/testing";
import { afterEach, describe, expect, it } from "vitest";
import { useCounter } from "../src/hooks/useCounter.js";

describe("useCounter", () => {
  afterEach(async () => {
    await cleanup();
  });

  it("increments the counter", async () => {
    const { result, rerender } = await renderHook(() => useCounter(0));

    expect(result.current.count).toBe(0);

    result.current.increment();
    await rerender();

    expect(result.current.count).toBe(1);
  });

  it("accepts initial value", async () => {
    const { result } = await renderHook(() => useCounter(10));
    expect(result.current.count).toBe(10);
  });
});
```

See the [renderHook API reference](./api/testing/functions/renderHook.md) for full details.

## API Overview

The testing library provides:

- **Query methods** on `screen`: `findByRole`, `findByText`, `findByTestId`, `findByLabelText`, and their `findAll*` variants. See the [screen API reference](./api/testing/variables/screen.md).
- **User interactions** via `userEvent`: `click`, `type`, `clear`, `selectOptions`, and more. See the [userEvent API reference](./api/testing/variables/userEvent.md).
- **Signal emission** via `fireEvent` for testing gesture handlers and custom interactions. See the [fireEvent API reference](./api/testing/functions/fireEvent.md).
- **Scoped queries** via `within` for querying within a widget subtree. See the [within API reference](./api/testing/functions/within.md).
- **Debugging** via `screen.debug()` and `screen.screenshot()`.

## Complete Example

```tsx
import * as Gtk from "@gtkx/ffi/gtk";
import { cleanup, render, screen, userEvent, within } from "@gtkx/testing";
import { afterEach, describe, expect, it } from "vitest";
import { TodoApp } from "../src/app.js";

describe("TodoApp", () => {
  afterEach(async () => {
    await cleanup();
  });

  it("adds a new todo", async () => {
    await render(<TodoApp />, { wrapper: false });

    const input = await screen.findByTestId("todo-input");
    const addButton = await screen.findByTestId("add-button");

    await userEvent.type(input, "Buy groceries");
    await userEvent.click(addButton);

    const todoText = await screen.findByText("Buy groceries");
    expect(todoText).toBeDefined();
  });

  it("toggles todo completion", async () => {
    await render(<TodoApp />, { wrapper: false });

    const input = await screen.findByTestId("todo-input");
    await userEvent.type(input, "Test todo");
    await userEvent.click(await screen.findByTestId("add-button"));

    const checkbox = await screen.findByRole(Gtk.AccessibleRole.CHECKBOX, {
      checked: false,
    });
    await userEvent.click(checkbox);

    const checkedBox = await screen.findByRole(Gtk.AccessibleRole.CHECKBOX, {
      checked: true,
    });
    expect(checkedBox).toBeDefined();
  });

  it("deletes a todo", async () => {
    await render(<TodoApp />, { wrapper: false });

    const input = await screen.findByTestId("todo-input");
    await userEvent.type(input, "Todo to delete");
    await userEvent.click(await screen.findByTestId("add-button"));

    const deleteButton = await screen.findByTestId(/^delete-/);
    await userEvent.click(deleteButton);

    const emptyMessage = await screen.findByText("No tasks yet");
    expect(emptyMessage).toBeDefined();
  });

  it("updates the remaining count", async () => {
    await render(<TodoApp />, { wrapper: false });

    const input = await screen.findByTestId("todo-input");
    const addButton = await screen.findByTestId("add-button");

    await userEvent.type(input, "Todo 1");
    await userEvent.click(addButton);
    await userEvent.type(input, "Todo 2");
    await userEvent.click(addButton);

    let counter = await screen.findByTestId("items-left");
    expect((counter as Gtk.Label).getLabel()).toContain("2");

    const checkboxes = await screen.findAllByRole(Gtk.AccessibleRole.CHECKBOX);
    await userEvent.click(checkboxes[0] as Gtk.Widget);

    counter = await screen.findByTestId("items-left");
    expect((counter as Gtk.Label).getLabel()).toContain("1");
  });
});
```

