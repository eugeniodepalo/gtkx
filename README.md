<p align="center">
  <img src="https://raw.githubusercontent.com/eugeniodepalo/gtkx/HEAD/logo.svg" alt="GTKX Logo" width="128" height="128">
</p>

<h1 align="center">GTKX</h1>

<p align="center">
  <strong>Build native GTK4 desktop apps with React</strong>
</p>

<p align="center">
  <a href="https://eugeniodepalo.github.io/gtkx">Documentation</a> ·
  <a href="#quick-start">Quick Start</a> ·
  <a href="#examples">Examples</a> ·
  <a href="#contributing">Contributing</a>
</p>

---

GTKX lets you build native Linux desktop applications using React and TypeScript. Write familiar React code that renders as native GTK4 widgets—no Electron, no web views.

## Features

- **React** — Hooks, state, props, and components you already know
- **Hot Reload** — Edit code and see changes instantly via Vite
- **Native** — Direct FFI bindings to GTK4 via Rust and libffi
- **CLI** — `npx @gtkx/cli@latest create` scaffolds a ready-to-go project
- **CSS-in-JS** — Emotion-style `css` template literals for GTK styling
- **Testing** — Testing Library-style `screen`, `userEvent`, and queries

## Quick Start

```bash
npx @gtkx/cli@latest create my-app
cd my-app
npm run dev
```

Edit your code and see changes instantly—no restart needed.

### Example

```tsx
import { useState } from "react";
import { Orientation } from "@gtkx/ffi/gtk";
import { render, ApplicationWindow, Box, Button, Label, quit } from "@gtkx/react";

const App = () => {
    const [count, setCount] = useState(0);

    return (
        <ApplicationWindow title="Counter" defaultWidth={400} defaultHeight={300} onCloseRequest={quit}>
            <Box orientation={Orientation.VERTICAL} spacing={12} marginTop={20} marginStart={20} marginEnd={20}>
                <Label.Root label={`Count: ${count}`} />
                <Button label="Increment" onClicked={() => setCount((c) => c + 1)} />
            </Box>
        </ApplicationWindow>
    );
};

render(<App />, "org.example.counter");
```

## Widgets

GTKX provides React components for GTK4 widgets:

**Layout**: `Box`, `Grid`, `Stack`, `Notebook`, `Paned`, `FlowBox`, `Overlay`

**Lists**: `ListView`, `GridView`, `ColumnView`, `DropDown`, `ListBox`

**Input**: `Entry`, `TextView`, `CheckButton`, `ToggleButton`, `Switch`, `Scale`, `SpinButton`

**Display**: `Label`, `Button`, `Image`, `Spinner`, `ProgressBar`, `LevelBar`

**Menus**: `ApplicationMenu`, `PopoverMenu`, `MenuButton`, `Menu.Item`, `Menu.Section`, `Menu.Submenu`

**Windows**: `ApplicationWindow`, `Window`, `AboutDialog`

## Styling

```tsx
import { css } from "@gtkx/css";
import { Button } from "@gtkx/react";

const primary = css`
    padding: 16px 32px;
    border-radius: 24px;
    background: linear-gradient(135deg, #3584e4, #9141ac);
    color: white;
`;

<Button label="Click me" cssClasses={[primary]} />;
```

GTK also provides built-in classes like `suggested-action`, `destructive-action`, `card`, and `heading`.

## Testing

```tsx
import { cleanup, render, screen, userEvent } from "@gtkx/testing";
import { AccessibleRole } from "@gtkx/ffi/gtk";

afterEach(() => cleanup());

test("increments count", async () => {
    await render(<App />);

    const button = await screen.findByRole(AccessibleRole.BUTTON, { name: "Increment" });
    await userEvent.click(button);

    await screen.findByText("Count: 1");
});
```

Queries: `findByRole`, `findByText`, `findByLabelText`, `findByTestId`

User events: `click`, `dblClick`, `type`, `clear`, `tab`, `selectOptions`

## Examples

| Example                         | Description         |
| ------------------------------- | ------------------- |
| [gtk4-demo](examples/gtk4-demo) | Widget showcase     |
| [todo](examples/todo)           | Todo app with tests |

```bash
cd examples/gtk4-demo && pnpm dev
```

## Packages

| Package                           | Description                    |
| --------------------------------- | ------------------------------ |
| [@gtkx/react](packages/react)     | React components for GTK4      |
| [@gtkx/ffi](packages/ffi)         | TypeScript bindings for GTK4   |
| [@gtkx/css](packages/css)         | CSS-in-JS styling              |
| [@gtkx/testing](packages/testing) | Testing utilities              |
| [@gtkx/cli](packages/cli)         | CLI with HMR dev server        |

## Requirements

- Node.js 20+
- GTK4 (`gtk4` on Fedora, `libgtk-4-1` on Ubuntu)
- Linux

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

- [Report a bug](https://github.com/eugeniodepalo/gtkx/issues/new?template=bug_report.md)
- [Request a feature](https://github.com/eugeniodepalo/gtkx/issues/new?template=feature_request.md)

## License

[MPL-2.0](LICENSE)
