export type SignalMeta = Record<
    string,
    { params: import("@gtkx/native").Type[]; returnType?: import("@gtkx/native").Type }
>;
