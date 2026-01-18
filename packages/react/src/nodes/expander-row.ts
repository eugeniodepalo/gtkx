import * as Adw from "@gtkx/ffi/adw";
import type * as Gtk from "@gtkx/ffi/gtk";
import { registerNodeClass } from "../registry.js";
import type { Container, ContainerClass } from "../types.js";
import { PositionalParentNode } from "./abstract/positional-parent.js";
import { matchesAnyClass } from "./internal/utils.js";

export type ExpanderRowWidget = Gtk.Widget & {
    addRow(child: Gtk.Widget): void;
    addAction(child: Gtk.Widget): void;
    remove(child: Gtk.Widget): void;
};

class ExpanderRowNode extends PositionalParentNode<Adw.ExpanderRow> {
    public static override priority = -1;

    protected acceptedPositionalChildTypes = new Set([
        "ExpanderRowRow",
        "ExpanderRowAction",
        "ActionRowPrefix",
        "ActionRowSuffix",
    ]);
    protected containerTypeName = "ExpanderRow";

    public static override matches(_type: string, containerOrClass?: Container | ContainerClass | null): boolean {
        return matchesAnyClass([Adw.ExpanderRow], containerOrClass);
    }
}

registerNodeClass(ExpanderRowNode);
