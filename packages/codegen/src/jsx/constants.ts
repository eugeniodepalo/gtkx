export const HIDDEN_PROPS: Record<string, readonly string[]> = {
    ListView: ["factory", "model"],
    GridView: ["factory", "model"],
    ColumnView: ["model"],
    DropDown: ["model"],
    ComboRow: ["model"],
    Window: ["application"],
    ApplicationWindow: ["application"],
    NavigationPage: ["child"],
};

export const LIST_WIDGETS = new Set(["GtkListView", "GtkGridView"]);
export const DROPDOWN_WIDGETS = new Set(["GtkDropDown"]);
export const COLUMN_VIEW_WIDGET = "GtkColumnView";
