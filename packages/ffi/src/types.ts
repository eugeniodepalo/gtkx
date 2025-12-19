/**
 * Signal parameter metadata for type-safe signal connections.
 * Used by generated connect methods to wrap signal handler arguments.
 * @private
 */
export type SignalMeta = Record<
    string,
    { params: import("@gtkx/native").Type[]; returnType?: import("@gtkx/native").Type }
>;
