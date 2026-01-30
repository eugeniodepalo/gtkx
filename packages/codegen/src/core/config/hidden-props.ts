const HIDDEN_PROPS: Readonly<Record<string, readonly string[]>> = {
    ListView: ["factory", "model"],
    GridView: ["factory", "model"],
    ColumnView: ["model"],
    DropDown: ["model"],
    ComboRow: ["model"],
    Window: ["onCloseRequest", "onClose"],
    Assistant: ["onClose"],
    Dialog: ["onClose"],
    ShortcutsWindow: ["onClose"],
    ApplicationWindow: ["application"],
    NavigationPage: ["child"],
    GraphicsOffload: ["child"],
    Stack: ["visibleChild", "visibleChildName"],
    ViewStack: ["visibleChild", "visibleChildName"],
    Range: ["adjustment", "onValueChanged"],
    ScaleButton: ["adjustment", "onValueChanged"],
    VolumeButton: ["adjustment"],
    SpinButton: ["adjustment", "onValueChanged"],
    SpinRow: ["adjustment", "onValueChanged"],
    TextView: ["buffer"],
};

export const getHiddenPropNames = (widgetName: string): readonly string[] => {
    return HIDDEN_PROPS[widgetName] ?? [];
};
