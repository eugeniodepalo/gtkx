import * as Gtk from "@gtkx/ffi/gtk";
import { Box, ColumnView, Label, ScrolledWindow } from "@gtkx/react";
import { useState } from "react";

interface Person {
    id: number;
    name: string;
    email: string;
    department: string;
    status: "active" | "away" | "offline";
}

type ColumnId = "name" | "email" | "department" | "status";

const people: Person[] = [
    { id: 1, name: "Alice Johnson", email: "alice@example.com", department: "Engineering", status: "active" },
    { id: 2, name: "Bob Smith", email: "bob@example.com", department: "Design", status: "away" },
    { id: 3, name: "Carol Williams", email: "carol@example.com", department: "Marketing", status: "active" },
    { id: 4, name: "David Brown", email: "david@example.com", department: "Engineering", status: "offline" },
    { id: 5, name: "Eva Martinez", email: "eva@example.com", department: "Sales", status: "active" },
    { id: 6, name: "Frank Lee", email: "frank@example.com", department: "Engineering", status: "active" },
    { id: 7, name: "Grace Chen", email: "grace@example.com", department: "Design", status: "away" },
    { id: 8, name: "Henry Wilson", email: "henry@example.com", department: "Marketing", status: "active" },
];

const statusConfig = {
    active: { icon: "\u25cf", text: "Active", order: 0 },
    away: { icon: "\u25cf", text: "Away", order: 1 },
    offline: { icon: "\u25cb", text: "Offline", order: 2 },
};

const sortByColumn = (a: Person, b: Person, columnId: ColumnId): number => {
    switch (columnId) {
        case "name":
            return a.name.localeCompare(b.name);
        case "email":
            return a.email.localeCompare(b.email);
        case "department":
            return a.department.localeCompare(b.department);
        case "status":
            return statusConfig[a.status].order - statusConfig[b.status].order;
    }
};

export const ColumnViewDemo = () => {
    const [items] = useState(people);
    const [sortColumn, setSortColumn] = useState<ColumnId | null>("name");
    const [sortOrder, setSortOrder] = useState<Gtk.SortType>(Gtk.SortType.ASCENDING);

    const handleSortChange = (column: ColumnId | null, order: Gtk.SortType) => {
        setSortColumn(column);
        setSortOrder(order);
    };

    return (
        <Box
            orientation={Gtk.Orientation.VERTICAL}
            spacing={8}
            marginStart={16}
            marginEnd={16}
            marginTop={16}
            marginBottom={16}
        >
            <Label.Root label="ColumnView - Team Directory" cssClasses={["title-2"]} halign={Gtk.Align.START} />
            <Label.Root
                label="A sortable multi-column table view. Click column headers to sort."
                cssClasses={["dim-label"]}
                halign={Gtk.Align.START}
                wrap
            />
            <ScrolledWindow vexpand>
                <ColumnView.Root<Person, ColumnId>
                    sortColumn={sortColumn}
                    sortOrder={sortOrder}
                    onSortChange={handleSortChange}
                    sortFn={sortByColumn}
                >
                    <ColumnView.Column<Person>
                        id="name"
                        title="Name"
                        expand
                        renderCell={(person) => (
                            <Label.Root
                                label={person?.name ?? ""}
                                halign={Gtk.Align.START}
                                marginStart={8}
                                marginEnd={8}
                                marginTop={4}
                                marginBottom={4}
                            />
                        )}
                    />
                    <ColumnView.Column<Person>
                        id="email"
                        title="Email"
                        expand
                        renderCell={(person) => (
                            <Label.Root
                                label={person?.email ?? ""}
                                cssClasses={["dim-label"]}
                                halign={Gtk.Align.START}
                                marginStart={8}
                                marginEnd={8}
                                marginTop={4}
                                marginBottom={4}
                            />
                        )}
                    />
                    <ColumnView.Column<Person>
                        id="department"
                        title="Department"
                        fixedWidth={120}
                        renderCell={(person) => (
                            <Label.Root
                                label={person?.department ?? ""}
                                halign={Gtk.Align.START}
                                marginStart={8}
                                marginEnd={8}
                                marginTop={4}
                                marginBottom={4}
                            />
                        )}
                    />
                    <ColumnView.Column<Person>
                        id="status"
                        title="Status"
                        fixedWidth={100}
                        renderCell={(person) => {
                            const config = person ? statusConfig[person.status] : null;
                            return (
                                <Label.Root
                                    label={config ? `${config.icon} ${config.text}` : ""}
                                    cssClasses={person?.status === "offline" ? ["dim-label"] : []}
                                    halign={Gtk.Align.START}
                                    marginStart={8}
                                    marginEnd={8}
                                    marginTop={4}
                                    marginBottom={4}
                                />
                            );
                        }}
                    />
                    {items.map((person) => (
                        <ColumnView.Item key={person.id} item={person} />
                    ))}
                </ColumnView.Root>
            </ScrolledWindow>
        </Box>
    );
};
