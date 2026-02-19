import * as Gtk from "@gtkx/ffi/gtk";
import {
    AdwPreferencesGroup,
    GtkBox,
    GtkColumnView,
    GtkDropDown,
    GtkFrame,
    GtkGridView,
    GtkLabel,
    GtkListView,
    GtkScrolledWindow,
    x,
} from "@gtkx/react";
import { type ReactNode, useCallback, useMemo, useState } from "react";

type Person = {
    name: string;
    email: string;
    role: string;
    salary: number;
};

type SortColumn = "name" | "email" | "role" | "salary" | null;

type FileItem = {
    name: string;
    isFolder: boolean;
};

const people: Person[] = [
    { name: "Alice Johnson", email: "alice@example.com", role: "Developer", salary: 95000 },
    { name: "Bob Smith", email: "bob@example.com", role: "Designer", salary: 85000 },
    { name: "Charlie Brown", email: "charlie@example.com", role: "Manager", salary: 120000 },
    { name: "Diana Ross", email: "diana@example.com", role: "Developer", salary: 92000 },
    { name: "Eve Wilson", email: "eve@example.com", role: "QA Engineer", salary: 78000 },
    { name: "Frank Miller", email: "frank@example.com", role: "Developer", salary: 105000 },
    { name: "Grace Lee", email: "grace@example.com", role: "Designer", salary: 88000 },
    { name: "Henry Chen", email: "henry@example.com", role: "Manager", salary: 115000 },
];

const files: FileItem[] = [
    { name: "Documents", isFolder: true },
    { name: "Pictures", isFolder: true },
    { name: "readme.txt", isFolder: false },
    { name: "report.pdf", isFolder: false },
    { name: "notes.md", isFolder: false },
];

const ColumnMenu = ({
    column,
    onSort,
    children,
}: {
    column: SortColumn;
    onSort: (column: string | null, order: Gtk.SortType) => void;
    children?: ReactNode;
}) => (
    <>
        <x.MenuSection>
            <x.MenuItem
                id="sort-asc"
                label="Sort Ascending"
                onActivate={() => onSort(column, Gtk.SortType.ASCENDING)}
            />
            <x.MenuItem
                id="sort-desc"
                label="Sort Descending"
                onActivate={() => onSort(column, Gtk.SortType.DESCENDING)}
            />
            <x.MenuItem id="sort-clear" label="Clear Sort" onActivate={() => onSort(null, Gtk.SortType.ASCENDING)} />
        </x.MenuSection>
        {children}
    </>
);

export const ListDemo = () => {
    const [sortColumn, setSortColumn] = useState<SortColumn>(null);
    const [sortOrder, setSortOrder] = useState<Gtk.SortType>(Gtk.SortType.ASCENDING);
    const [hiddenColumns, setHiddenColumns] = useState<Set<SortColumn>>(new Set());

    const handleSortChange = useCallback((column: string | null, order: Gtk.SortType) => {
        setSortColumn(column as SortColumn);
        setSortOrder(order);
    }, []);

    const sortedPeople = useMemo(() => {
        if (!sortColumn) return people;

        return [...people].sort((a, b) => {
            let comparison = 0;
            switch (sortColumn) {
                case "name":
                    comparison = a.name.localeCompare(b.name);
                    break;
                case "email":
                    comparison = a.email.localeCompare(b.email);
                    break;
                case "role":
                    comparison = a.role.localeCompare(b.role);
                    break;
                case "salary":
                    comparison = a.salary - b.salary;
                    break;
            }
            return sortOrder === Gtk.SortType.ASCENDING ? comparison : -comparison;
        });
    }, [sortColumn, sortOrder]);

    return (
        <GtkBox
            orientation={Gtk.Orientation.VERTICAL}
            spacing={24}
            marginTop={24}
            marginBottom={24}
            marginStart={24}
            marginEnd={24}
        >
            <GtkLabel label="List Components" cssClasses={["title-1"]} halign={Gtk.Align.START} />

            <AdwPreferencesGroup title="ListItem" description="Data items for DropDown and simple lists">
                <GtkFrame marginTop={12}>
                    <GtkBox
                        orientation={Gtk.Orientation.VERTICAL}
                        spacing={12}
                        marginTop={12}
                        marginBottom={12}
                        marginStart={12}
                        marginEnd={12}
                    >
                        <GtkLabel label="Select a fruit:" halign={Gtk.Align.START} />
                        <GtkDropDown
                            items={[
                                { id: "apple", value: "Apple" },
                                { id: "banana", value: "Banana" },
                                { id: "cherry", value: "Cherry" },
                                { id: "date", value: "Date" },
                                { id: "elderberry", value: "Elderberry" },
                            ]}
                        />
                    </GtkBox>
                </GtkFrame>
            </AdwPreferencesGroup>

            <AdwPreferencesGroup title="GtkListView" description="Virtualized list with custom item rendering">
                <GtkFrame marginTop={12}>
                    <GtkScrolledWindow heightRequest={280} hscrollbarPolicy={Gtk.PolicyType.NEVER}>
                        <GtkListView
                            estimatedItemHeight={48}
                            items={files.map((file) => ({ id: file.name, value: file }))}
                            renderItem={(item: FileItem) => (
                                <GtkBox spacing={12} marginTop={8} marginBottom={8} marginStart={8} marginEnd={8}>
                                    <GtkLabel label={item.isFolder ? "folder-symbolic" : "text-x-generic-symbolic"} />
                                    <GtkLabel label={item.name} hexpand halign={Gtk.Align.START} />
                                </GtkBox>
                            )}
                        />
                    </GtkScrolledWindow>
                </GtkFrame>
            </AdwPreferencesGroup>

            <AdwPreferencesGroup title="GtkGridView" description="Virtualized grid with custom item rendering">
                <GtkFrame marginTop={12}>
                    <GtkScrolledWindow heightRequest={280} hscrollbarPolicy={Gtk.PolicyType.NEVER}>
                        <GtkGridView
                            estimatedItemHeight={80}
                            items={files.map((file) => ({ id: file.name, value: file }))}
                            renderItem={(item: FileItem) => (
                                <GtkBox
                                    orientation={Gtk.Orientation.VERTICAL}
                                    spacing={6}
                                    marginTop={12}
                                    marginBottom={12}
                                    marginStart={12}
                                    marginEnd={12}
                                    halign={Gtk.Align.CENTER}
                                >
                                    <GtkLabel label={item.isFolder ? "folder" : "file"} cssClasses={["title-3"]} />
                                    <GtkLabel label={item.name} ellipsize={3} maxWidthChars={12} />
                                </GtkBox>
                            )}
                        />
                    </GtkScrolledWindow>
                </GtkFrame>
            </AdwPreferencesGroup>

            <AdwPreferencesGroup
                title="GtkListView (Tree)"
                description="Hierarchical tree with expand/collapse using nested ListItems"
            >
                <GtkFrame marginTop={12}>
                    <GtkScrolledWindow heightRequest={320} hscrollbarPolicy={Gtk.PolicyType.NEVER}>
                        <GtkListView
                            estimatedItemHeight={32}
                            autoexpand
                            items={[
                                {
                                    id: "src",
                                    value: { name: "src" },
                                    children: [
                                        {
                                            id: "components",
                                            value: { name: "components" },
                                            children: [
                                                { id: "button", value: { name: "Button.tsx" } },
                                                { id: "input", value: { name: "Input.tsx" } },
                                                { id: "modal", value: { name: "Modal.tsx" } },
                                            ],
                                        },
                                        {
                                            id: "utils",
                                            value: { name: "utils" },
                                            children: [
                                                { id: "helpers", value: { name: "helpers.ts" } },
                                                { id: "constants", value: { name: "constants.ts" } },
                                            ],
                                        },
                                        { id: "app", value: { name: "App.tsx" } },
                                        { id: "index", value: { name: "index.tsx" } },
                                    ],
                                },
                                {
                                    id: "public",
                                    value: { name: "public" },
                                    children: [
                                        { id: "favicon", value: { name: "favicon.ico" } },
                                        { id: "index-html", value: { name: "index.html" } },
                                    ],
                                },
                                { id: "package", value: { name: "package.json" } },
                                { id: "readme", value: { name: "README.md" } },
                            ]}
                            renderItem={(item: { name: string }) => (
                                <GtkLabel label={item.name} halign={Gtk.Align.START} marginTop={4} marginBottom={4} />
                            )}
                        />
                    </GtkScrolledWindow>
                </GtkFrame>
            </AdwPreferencesGroup>

            <AdwPreferencesGroup
                title="x.ColumnViewColumn"
                description="Table columns with header menus, sorting, and hide/show (right-click header)"
            >
                <GtkFrame marginTop={12}>
                    <GtkScrolledWindow heightRequest={350} hscrollbarPolicy={Gtk.PolicyType.NEVER}>
                        <GtkColumnView
                            estimatedRowHeight={48}
                            sortColumn={sortColumn}
                            sortOrder={sortOrder}
                            onSortChanged={handleSortChange}
                            items={sortedPeople.map((person) => ({ id: person.email, value: person }))}
                        >
                            <x.ColumnViewColumn
                                id="name"
                                title="Name"
                                expand
                                sortable
                                renderCell={(item: Person) => (
                                    <GtkLabel
                                        label={item.name}
                                        halign={Gtk.Align.START}
                                        marginTop={8}
                                        marginBottom={8}
                                        marginStart={8}
                                        marginEnd={8}
                                    />
                                )}
                            >
                                <ColumnMenu column="name" onSort={handleSortChange} />
                            </x.ColumnViewColumn>
                            {!hiddenColumns.has("role") && (
                                <x.ColumnViewColumn
                                    id="role"
                                    title="Role"
                                    fixedWidth={100}
                                    sortable
                                    renderCell={(item: Person) => (
                                        <GtkLabel
                                            label={item.role}
                                            halign={Gtk.Align.START}
                                            marginTop={8}
                                            marginBottom={8}
                                            marginStart={8}
                                            marginEnd={8}
                                        />
                                    )}
                                >
                                    <ColumnMenu column="role" onSort={handleSortChange}>
                                        <x.MenuSection>
                                            <x.MenuItem
                                                id="hide"
                                                label="Hide Column"
                                                onActivate={() => setHiddenColumns((s) => new Set(s).add("role"))}
                                            />
                                        </x.MenuSection>
                                    </ColumnMenu>
                                </x.ColumnViewColumn>
                            )}
                            {!hiddenColumns.has("salary") && (
                                <x.ColumnViewColumn
                                    id="salary"
                                    title="Salary"
                                    fixedWidth={100}
                                    sortable
                                    renderCell={(item: Person) => (
                                        <GtkLabel
                                            label={`$${item.salary.toLocaleString()}`}
                                            halign={Gtk.Align.END}
                                            marginTop={8}
                                            marginBottom={8}
                                            marginStart={8}
                                            marginEnd={8}
                                        />
                                    )}
                                >
                                    <ColumnMenu column="salary" onSort={handleSortChange}>
                                        <x.MenuSection>
                                            <x.MenuItem
                                                id="hide"
                                                label="Hide Column"
                                                onActivate={() => setHiddenColumns((s) => new Set(s).add("salary"))}
                                            />
                                        </x.MenuSection>
                                    </ColumnMenu>
                                </x.ColumnViewColumn>
                            )}
                        </GtkColumnView>
                    </GtkScrolledWindow>
                </GtkFrame>
                <GtkLabel
                    label={`Sorting: ${sortColumn ? `${sortColumn} (${sortOrder === Gtk.SortType.ASCENDING ? "asc" : "desc"})` : "none"}${hiddenColumns.size > 0 ? ` · Hidden: ${[...hiddenColumns].join(", ")}` : ""}`}
                    cssClasses={["dim-label", "monospace"]}
                    marginTop={8}
                />
            </AdwPreferencesGroup>
        </GtkBox>
    );
};
