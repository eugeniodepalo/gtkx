# Kitchen Sink Example - Debugging Version

This is a comprehensive example that demonstrates all GTKx features. We're building it incrementally to identify any issues.

## Running

```bash
pnpm install
pnpm build
pnpm start
```

## Debugging Strategy

The `src/index.tsx` file starts with a minimal working example. To find the source of any segfaults:

1. Verify the minimal example works
2. Uncomment sections one at a time from the full example below
3. Rebuild and test after each change
4. When a segfault occurs, the last uncommented section is the culprit

## Full Kitchen Sink Features to Add

As you uncomment, add these features in order:

1. ✅ **Basic UI** - Label, Button, Counter (already included)
2. ⬜ **CenterBox** - Named child slots
3. ⬜ **ListView** - With itemFactory and dynamic data
4. ⬜ **ScrolledWindow** - Scrollable containers
5. ⬜ **Portal** - createPortal() for out-of-tree rendering
6. ⬜ **Refs** - Typed refs with useRef
7. ⬜ **Paned Layout** - Split panes with draggable divider
8. ⬜ **Grid Layout** - 2D grid with row/column positioning
9. ⬜ **More Widgets** - ProgressBar, Spinner, Entry, ToggleButton, etc.

## Common Issues

- **Segfault on startup**: Check widget initialization order
- **Segfault on interaction**: Check signal handlers
- **Segfault with ListView**: Check itemFactory implementation
- **Segfault with Portal**: Check ref initialization timing
