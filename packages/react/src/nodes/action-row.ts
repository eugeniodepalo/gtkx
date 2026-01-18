import type * as Gtk from "@gtkx/ffi/gtk";
import { PREFIX_SUFFIX_INTERFACE_METHODS } from "../generated/internal.js";
import { registerNodeClass } from "../registry.js";
import type { Container, ContainerClass } from "../types.js";
import { PositionalParentNode } from "./abstract/positional-parent.js";
import { matchesInterface } from "./internal/utils.js";

export type PrefixSuffixWidget = Gtk.Widget & {
    addPrefix(child: Gtk.Widget): void;
    addSuffix(child: Gtk.Widget): void;
    remove(child: Gtk.Widget): void;
};

class ActionRowNode extends PositionalParentNode<PrefixSuffixWidget> {
    public static override priority = 0;

    protected acceptedPositionalChildTypes = new Set(["ActionRowPrefix", "ActionRowSuffix"]);
    protected containerTypeName = "ActionRow";

    public static override matches(_type: string, containerOrClass?: Container | ContainerClass | null): boolean {
        return matchesInterface(PREFIX_SUFFIX_INTERFACE_METHODS, containerOrClass);
    }
}

registerNodeClass(ActionRowNode);
