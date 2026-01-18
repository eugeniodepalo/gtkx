const HIDDEN_PROPS: Readonly<Record<string, readonly string[]>> = {
    ListView: ["factory", "model"],
    GridView: ["factory", "model"],
    ColumnView: ["model"],
    DropDown: ["model"],
    ComboRow: ["model"],
    Window: ["onCloseRequest"],
    ApplicationWindow: ["application"],
    NavigationPage: ["child"],
    GraphicsOffload: ["child"],
    Stack: ["visibleChild", "visibleChildName"],
    ViewStack: ["visibleChild", "visibleChildName"],
    Range: ["adjustment"],
    ScaleButton: ["adjustment"],
    VolumeButton: ["adjustment"],
    SpinButton: ["adjustment"],
    TextView: ["buffer"],
};

export const getHiddenPropNames = (widgetName: string): readonly string[] => {
    return HIDDEN_PROPS[widgetName] ?? [];
};
