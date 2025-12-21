export const HIDDEN_PROPS: Record<string, readonly string[]> = {
    ListView: ["factory", "model"],
    GridView: ["factory", "model"],
    ColumnView: ["model"],
    DropDown: ["model"],
    ComboRow: ["model"],
    Window: ["application"],
    ApplicationWindow: ["application"],
    AdwWindow: ["application"],
    AdwApplicationWindow: ["application"],
};

export const LIST_WIDGETS = new Set(["ListView", "GridView"]);
export const DROPDOWN_WIDGETS = new Set(["DropDown"]);
export const GRID_WIDGETS = new Set(["Grid"]);
export const STACK_WIDGETS = new Set(["Stack", "ViewStack", "AdwViewStack"]);
export const COLUMN_VIEW_WIDGET = "ColumnView";
export const NOTEBOOK_WIDGET = "Notebook";
export const POPOVER_MENU_WIDGET = "PopoverMenu";
export const TOOLBAR_VIEW_WIDGET = "ToolbarView";
export const WINDOW_TYPES = new Set(["Window", "ApplicationWindow", "AdwWindow", "AdwApplicationWindow"]);
export const WIDGET_REFERENCE_PROPERTIES = new Set(["mnemonic-widget"]);
