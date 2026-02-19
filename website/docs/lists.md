# Lists

GTKX provides several list components for different use cases, from simple static lists to high-performance virtualized collections.

## Choosing a List Component

- **`GtkListView`** — Large lists (1000+ items) with virtual scrolling
- **`GtkGridView`** — Photo galleries, icon grids with virtual scrolling
- **`GtkColumnView`** — Data tables with sorting and virtual scrolling
- **`GtkListView` (tree mode)** — Hierarchical data, file trees with virtual scrolling
- **`GtkDropDown`** — Small selection lists (no virtual scrolling)
- **`GtkListBox`** — Medium lists with complex rows (no virtual scrolling)
- **`GtkFlowBox`** — Tag clouds, reflowing grids (no virtual scrolling)

## ListView

High-performance virtualized list for large datasets. Only visible items are rendered.

```tsx
import { GtkBox, GtkLabel, GtkListView, GtkScrolledWindow } from "@gtkx/react";
import * as Gtk from "@gtkx/ffi/gtk";

interface Contact {
  id: string;
  name: string;
  email: string;
}

const contacts: Contact[] = [
  { id: "1", name: "Alice Johnson", email: "alice@example.com" },
  { id: "2", name: "Bob Smith", email: "bob@example.com" },
  // ... hundreds more
];

const ContactList = () => (
  <GtkScrolledWindow vexpand>
    <GtkListView
      estimatedItemHeight={48}
      items={contacts.map((contact) => ({ id: contact.id, value: contact }))}
      renderItem={(contact) => (
        <GtkBox spacing={12}>
          <GtkLabel
            label={contact.name}
            hexpand
            halign={Gtk.Align.START}
          />
          <GtkLabel label={contact.email} cssClasses={["dim-label"]} />
        </GtkBox>
      )}
    />
  </GtkScrolledWindow>
);
```

### Selection

```tsx
const [selected, setSelected] = useState<string[]>([]);

<GtkListView
  estimatedItemHeight={48}
  selectionMode={Gtk.SelectionMode.MULTIPLE}
  selected={selected}
  onSelectionChanged={setSelected}
  items={items.map((item) => ({ id: item.id, value: item }))}
  renderItem={(item) => item.name}
/>;
```

## GridView

Grid layout with virtual scrolling. Ideal for photo galleries and icon views.

```tsx
import { GtkBox, GtkGridView, GtkLabel, GtkScrolledWindow } from "@gtkx/react";
import { css } from "@gtkx/css";

interface Photo {
  id: string;
  title: string;
  color: string;
}

const photoTile = (color: string) => css`
  background: ${color};
  border-radius: 8px;
`;

const PhotoGallery = ({ photos }: { photos: Photo[] }) => (
  <GtkScrolledWindow vexpand hexpand>
    <GtkGridView
      estimatedItemHeight={130}
      minColumns={2}
      maxColumns={6}
      items={photos.map((photo) => ({ id: photo.id, value: photo }))}
      renderItem={(photo) => (
        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={4}>
          <GtkBox
            orientation={Gtk.Orientation.VERTICAL}
            heightRequest={100}
            cssClasses={[photoTile(photo.color)]}
          />
          {photo.title}
        </GtkBox>
      )}
    />
  </GtkScrolledWindow>
);
```

## ColumnView

Data table with sortable columns.

```tsx
import { x, GtkColumnView, GtkLabel, GtkScrolledWindow } from "@gtkx/react";
import * as Gtk from "@gtkx/ffi/gtk";
import { useState } from "react";

interface Employee {
  id: string;
  name: string;
  department: string;
  salary: number;
}

const EmployeeTable = ({ employees }: { employees: Employee[] }) => {
  const [sortColumn, setSortColumn] = useState<string | null>("name");
  const [sortOrder, setSortOrder] = useState<Gtk.SortType>(
    Gtk.SortType.ASCENDING,
  );

  const handleSortChange = (column: string | null, order: Gtk.SortType) => {
    setSortColumn(column);
    setSortOrder(order);
  };

  const sortedEmployees = [...employees].sort((a, b) => {
    if (!sortColumn) return 0;
    const aVal = a[sortColumn as keyof Employee];
    const bVal = b[sortColumn as keyof Employee];
    const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    return sortOrder === Gtk.SortType.ASCENDING ? cmp : -cmp;
  });

  return (
    <GtkScrolledWindow vexpand hexpand>
      <GtkColumnView
        estimatedRowHeight={48}
        sortColumn={sortColumn}
        sortOrder={sortOrder}
        onSortChanged={handleSortChange}
        items={sortedEmployees.map((emp) => ({ id: emp.id, value: emp }))}
      >
        <x.ColumnViewColumn
          id="name"
          title="Name"
          expand
          resizable
          sortable
          renderCell={(emp: Employee) => (
            <GtkLabel label={emp.name} halign={Gtk.Align.START} />
          )}
        />
        <x.ColumnViewColumn
          id="department"
          title="Department"
          resizable
          sortable
          renderCell={(emp: Employee) => (
            <GtkLabel label={emp.department} halign={Gtk.Align.START} />
          )}
        />
        <x.ColumnViewColumn
          id="salary"
          title="Salary"
          resizable
          sortable
          renderCell={(emp: Employee) => (
            <GtkLabel
              label={`$${emp.salary.toLocaleString()}`}
              halign={Gtk.Align.END}
            />
          )}
        />
      </GtkColumnView>
    </GtkScrolledWindow>
  );
};
```

## DropDown

Simple selection from a small list.

```tsx
import { GtkDropDown, GtkBox } from "@gtkx/react";
import { useState } from "react";

const frameworks = [
  { id: "react", name: "React" },
  { id: "vue", name: "Vue" },
  { id: "angular", name: "Angular" },
  { id: "svelte", name: "Svelte" },
];

const FrameworkSelector = () => {
  const [selectedId, setSelectedId] = useState<string | null>("react");

  return (
    <GtkBox spacing={12}>
      Framework:
      <GtkDropDown
        selectedId={selectedId}
        onSelectionChanged={setSelectedId}
        items={frameworks.map((fw) => ({ id: fw.id, value: fw.name }))}
      />
    </GtkBox>
  );
};
```

## ListBox

For medium-sized lists with complex row content.

```tsx
import {
  GtkListBox,
  GtkBox,
  GtkCheckButton,
  GtkLabel,
  GtkButton,
} from "@gtkx/react";
import * as Gtk from "@gtkx/ffi/gtk";

const TaskList = ({ tasks, onToggle, onDelete }) => (
  <GtkListBox
    selectionMode={Gtk.SelectionMode.NONE}
    cssClasses={["boxed-list"]}
  >
    {tasks.map((task) => (
      <GtkBox key={task.id} spacing={12}>
        <GtkCheckButton
          active={task.completed}
          onToggled={() => onToggle(task.id)}
        />
        <GtkLabel label={task.title} hexpand halign={Gtk.Align.START} />
        <GtkButton
          label="Delete"
          cssClasses={["flat"]}
          onClicked={() => onDelete(task.id)}
        />
      </GtkBox>
    ))}
  </GtkListBox>
);
```

## FlowBox

Responsive grid that reflows based on available width.

```tsx
import { GtkFlowBox, GtkLabel, GtkScrolledWindow } from "@gtkx/react";
import { css } from "@gtkx/css";
import * as Gtk from "@gtkx/ffi/gtk";

const tagStyle = css`
  background: @theme_selected_bg_color;
  color: @theme_selected_fg_color;
  padding: 4px 8px;
  border-radius: 4px;
`;

const TagCloud = ({ tags }: { tags: string[] }) => (
  <GtkScrolledWindow>
    <GtkFlowBox
      selectionMode={Gtk.SelectionMode.NONE}
      maxChildrenPerLine={8}
      minChildrenPerLine={2}
      columnSpacing={8}
      rowSpacing={8}
    >
      {tags.map((tag, i) => (
        <GtkLabel key={i} label={tag} cssClasses={[tagStyle]} />
      ))}
    </GtkFlowBox>
  </GtkScrolledWindow>
);
```

## Tree Lists

Hierarchical tree display with expand/collapse functionality and virtual scrolling. Use `GtkListView` with nested `children` arrays in the `items` prop for file browsers, settings panels, or any nested data structure. The `renderItem` callback receives an optional second parameter `row` of type `Gtk.TreeListRow | null`.

```tsx
import { GtkBox, GtkLabel, GtkImage, GtkListView, GtkScrolledWindow } from "@gtkx/react";
import * as Gtk from "@gtkx/ffi/gtk";

interface Category {
  type: "category";
  id: string;
  name: string;
  icon: string;
}

interface Setting {
  type: "setting";
  id: string;
  title: string;
}

type TreeItem = Category | Setting;

interface CategoryWithChildren extends Category {
  children: Setting[];
}

const categories: CategoryWithChildren[] = [
  {
    type: "category",
    id: "appearance",
    name: "Appearance",
    icon: "preferences-desktop-appearance-symbolic",
    children: [
      { type: "setting", id: "dark-mode", title: "Dark Mode" },
      { type: "setting", id: "animations", title: "Animations" },
    ],
  },
  {
    type: "category",
    id: "privacy",
    name: "Privacy",
    icon: "preferences-system-privacy-symbolic",
    children: [
      { type: "setting", id: "location", title: "Location Services" },
      { type: "setting", id: "camera", title: "Camera Access" },
    ],
  },
];

const SettingsTree = () => (
  <GtkScrolledWindow vexpand>
    <GtkListView
      estimatedItemHeight={48}
      autoexpand
      items={categories.map((category) => ({
        id: category.id,
        value: category as TreeItem,
        children: category.children.map((setting) => ({
          id: setting.id,
          value: setting as TreeItem,
          hideExpander: true,
        })),
      }))}
      renderItem={(item: TreeItem, row?: Gtk.TreeListRow | null) => {
        if (item.type === "category") {
          return (
            <GtkBox spacing={12}>
              <GtkImage iconName={item.icon} pixelSize={20} />
              <GtkLabel label={item.name} cssClasses={["heading"]} />
            </GtkBox>
          );
        }

        return <GtkLabel label={item.title} />;
      }}
    />
  </GtkScrolledWindow>
);
```

Items with nested `children` arrays trigger tree behavior automatically. Tree-specific properties on items: `indentForDepth`, `indentForIcon`, `hideExpander`.

### Selection

```tsx
const [selected, setSelected] = useState<string[]>([]);

<GtkListView
  estimatedItemHeight={48}
  autoexpand
  selected={selected}
  onSelectionChanged={setSelected}
  items={items.map((item) => ({
    id: item.id,
    value: item,
    children: item.children?.map((child) => ({ id: child.id, value: child })),
  }))}
  renderItem={(item, row) => <GtkLabel label={item.name} />}
/>;
```
