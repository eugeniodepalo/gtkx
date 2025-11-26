---
sidebar_position: 4
---

# Working with Lists

This guide covers how to display and manage lists of data in GTKX applications.

## List Components

GTKX provides several components for displaying lists:

| Component | Use Case |
|-----------|----------|
| `ListBox` | Simple selectable lists |
| `ListView` | Large dynamic lists with item factories |
| `DropDown` | Dropdown selection |
| `Notebook` | Tabbed lists |

## ListBox

For simple, static lists:

```tsx
import * as Gtk from "@gtkx/ffi/gtk";

<ListBox selectionMode={Gtk.SelectionMode.SINGLE}>
  <ListBoxRow>
    <Box marginStart={10} marginEnd={10} marginTop={5} marginBottom={5}>
      <Label.Root label="Item 1" />
    </Box>
  </ListBoxRow>
  <ListBoxRow>
    <Box marginStart={10} marginEnd={10} marginTop={5} marginBottom={5}>
      <Label.Root label="Item 2" />
    </Box>
  </ListBoxRow>
  <ListBoxRow>
    <Box marginStart={10} marginEnd={10} marginTop={5} marginBottom={5}>
      <Label.Root label="Item 3" />
    </Box>
  </ListBoxRow>
</ListBox>
```

### Selection Modes

```tsx
import * as Gtk from "@gtkx/ffi/gtk";

// No selection
<ListBox selectionMode={Gtk.SelectionMode.NONE} />

// Single selection (default)
<ListBox selectionMode={Gtk.SelectionMode.SINGLE} />

// Multiple selection
<ListBox selectionMode={Gtk.SelectionMode.MULTIPLE} />
```

### Dynamic ListBox

Generate rows from data:

```tsx
const items = [
  { id: 1, name: "Apple" },
  { id: 2, name: "Banana" },
  { id: 3, name: "Cherry" },
];

<ListBox selectionMode={Gtk.SelectionMode.SINGLE}>
  {items.map(item => (
    <ListBoxRow key={item.id}>
      <Box marginStart={10} marginEnd={10} marginTop={5} marginBottom={5}>
        <Label.Root label={item.name} />
      </Box>
    </ListBoxRow>
  ))}
</ListBox>
```

## ListView

For large lists with virtualization and custom item factories:

```tsx
import * as Gtk from "@gtkx/ffi/gtk";

const [items, setItems] = useState([
  { id: 1, text: "Task 1" },
  { id: 2, text: "Task 2" },
  { id: 3, text: "Task 3" },
]);

<ScrolledWindow vexpand hexpand>
  <ListView.Root
    vexpand
    itemFactory={(item: { id: number; text: string } | null) => {
      // Create GTK widgets for each item
      const box = new Gtk.Box();
      const label = new Gtk.Label(item?.text ?? "");
      box.append(label.ptr);
      box.setMarginStart(10);
      box.setMarginEnd(10);
      box.setMarginTop(5);
      box.setMarginBottom(5);
      return box;
    }}
  >
    {items.map(item => (
      <ListView.Item item={item} key={item.id} />
    ))}
  </ListView.Root>
</ScrolledWindow>
```

### Adding and Removing Items

```tsx
const [items, setItems] = useState([
  { id: 1, text: "Item 1" },
  { id: 2, text: "Item 2" },
]);

const addItem = () => {
  setItems(prev => [
    ...prev,
    { id: Date.now(), text: `Item ${prev.length + 1}` }
  ]);
};

const removeItem = () => {
  setItems(prev => prev.slice(0, -1));
};

<Box spacing={5}>
  <Button label="Add" onClicked={addItem} />
  <Button label="Remove" onClicked={removeItem} sensitive={items.length > 0} />
  <Label.Root label={`Total: ${items.length}`} />
</Box>

<ScrolledWindow vexpand>
  <ListView.Root itemFactory={...}>
    {items.map(item => (
      <ListView.Item item={item} key={item.id} />
    ))}
  </ListView.Root>
</ScrolledWindow>
```

## DropDown

For dropdown selection:

```tsx
<Box spacing={10}>
  <Label.Root label="Select an option:" />
  <DropDown hexpand />
</Box>
```

## Notebook (Tabs)

For tabbed content (acts like a list of pages):

```tsx
<Notebook hexpand vexpand>
  <Box>
    <Label.Root label="Tab 1 Content" />
  </Box>
  <Box>
    <Label.Root label="Tab 2 Content" />
  </Box>
  <Box>
    <Label.Root label="Tab 3 Content" />
  </Box>
</Notebook>
```

## Common Patterns

### Filterable List

```tsx
const allItems = [
  { id: 1, name: "Apple" },
  { id: 2, name: "Banana" },
  { id: 3, name: "Cherry" },
  { id: 4, name: "Date" },
];

const [filter, setFilter] = useState("");

const filteredItems = allItems.filter(item =>
  item.name.toLowerCase().includes(filter.toLowerCase())
);

<Box spacing={10}>
  <SearchEntry
    placeholderText="Filter..."
    onSearchChanged={() => {
      // Update filter state
    }}
  />
  <ListBox>
    {filteredItems.map(item => (
      <ListBoxRow key={item.id}>
        <Label.Root label={item.name} marginStart={10} />
      </ListBoxRow>
    ))}
  </ListBox>
</Box>
```

### Selectable List with State

```tsx
const [items] = useState([
  { id: 1, name: "Option A" },
  { id: 2, name: "Option B" },
  { id: 3, name: "Option C" },
]);

const [selectedId, setSelectedId] = useState<number | null>(null);

<ListBox selectionMode={Gtk.SelectionMode.SINGLE}>
  {items.map(item => (
    <ListBoxRow
      key={item.id}
      onActivated={() => setSelectedId(item.id)}
    >
      <Box marginStart={10} marginEnd={10} marginTop={5} marginBottom={5}>
        <Label.Root label={item.name} />
        {selectedId === item.id && (
          <Label.Root label="✓" marginStart={10} />
        )}
      </Box>
    </ListBoxRow>
  ))}
</ListBox>

<Label.Root label={`Selected: ${selectedId ?? "None"}`} />
```

### List with Actions

```tsx
const [items, setItems] = useState([
  { id: 1, text: "Task 1", done: false },
  { id: 2, text: "Task 2", done: false },
]);

const toggleItem = (id: number) => {
  setItems(prev =>
    prev.map(item =>
      item.id === id ? { ...item, done: !item.done } : item
    )
  );
};

const deleteItem = (id: number) => {
  setItems(prev => prev.filter(item => item.id !== id));
};

<ListBox>
  {items.map(item => (
    <ListBoxRow key={item.id}>
      <Box spacing={10} marginStart={10} marginEnd={10} marginTop={5} marginBottom={5}>
        <CheckButton.Root
          active={item.done}
          onToggled={() => toggleItem(item.id)}
        />
        <Label.Root
          label={item.text}
          hexpand
          cssClasses={item.done ? ["dim-label"] : []}
        />
        <Button
          label="Delete"
          onClicked={() => deleteItem(item.id)}
        />
      </Box>
    </ListBoxRow>
  ))}
</ListBox>
```

## Scrolling

Always wrap large lists in a `ScrolledWindow`:

```tsx
<ScrolledWindow vexpand hexpand minContentHeight={200}>
  <ListBox>
    {/* Many items */}
  </ListBox>
</ScrolledWindow>
```

## Best Practices

1. **Use Keys**: Always provide unique `key` props when mapping arrays
2. **Virtualization**: Use `ListView` for large lists (100+ items)
3. **Scroll Containers**: Wrap lists in `ScrolledWindow` when needed
4. **Empty States**: Handle empty lists gracefully

```tsx
{items.length === 0 ? (
  <Label.Root label="No items" cssClasses={["dim-label"]} />
) : (
  <ListBox>
    {items.map(item => /* ... */)}
  </ListBox>
)}
```
