# Lists

GTKX abstracts away the model and selection creation for list and grid widgets provided by GTK (`GtkListView`, `GtkGridView`, `GtkColumnView`, etc.) and provides some additional props to enable easy declarative usage that works in tandem with both React's and GTK's render cycles.

## Props and Callbacks

All list and grid widgets share a common set of props for handling data and selection:

- `items`: An array of data items to display. Each item must have a unique `id` and a `value` that can be of any type.
- `renderItem`: A callback that receives the item value and returns a React node to render for that item.
- `estimatedItemHeight`: An estimate of the item height in pixels, used for virtualization.
- `estimatedItemWidth`: An estimate of the item width in pixels (for horizontal lists and grids), used for virtualization.
- `selectionMode`: Controls how selection works (e.g. single, multiple, none).
- `selected`: An array of selected item IDs (for controlled selection).
- `onSelectionChanged`: A callback that receives the new array of selected item IDs when the selection changes.

## ListView

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

const ContactList = () => {
    const [selected, setSelected] = useState<string[]>([]);

    return (
        <GtkScrolledWindow vexpand>
            <GtkListView
                estimatedItemHeight={48}
                selectionMode={Gtk.SelectionMode.MULTIPLE}
                selected={selected}
                onSelectionChanged={setSelected}
                items={contacts.map((contact) => ({ id: contact.id, value: contact }))}
                renderItem={(contact) => (
                    <GtkBox spacing={12}>
                        <GtkLabel label={contact.name} hexpand halign={Gtk.Align.START} />
                        <GtkLabel label={contact.email} cssClasses={["dim-label"]} />
                    </GtkBox>
                )}
            />
        </GtkScrolledWindow>
    );
};
```

## ColumnView

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
    const [sortOrder, setSortOrder] = useState<Gtk.SortType>(Gtk.SortType.ASCENDING);

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
                    renderCell={(emp: Employee) => <GtkLabel label={emp.name} halign={Gtk.Align.START} />}
                />
                <x.ColumnViewColumn
                    id="department"
                    title="Department"
                    resizable
                    sortable
                    renderCell={(emp: Employee) => <GtkLabel label={emp.department} halign={Gtk.Align.START} />}
                />
                <x.ColumnViewColumn
                    id="salary"
                    title="Salary"
                    resizable
                    sortable
                    renderCell={(emp: Employee) => (
                        <GtkLabel label={`$${emp.salary.toLocaleString()}`} halign={Gtk.Align.END} />
                    )}
                />
            </GtkColumnView>
        </GtkScrolledWindow>
    );
};
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
