import type * as Gtk from "@gtkx/ffi/gtk";
import { PACK_INTERFACE_METHODS } from "../generated/internal.js";
import { registerNodeClass } from "../registry.js";
import type { Container, ContainerClass } from "../types.js";
import { PositionalParentNode } from "./abstract/positional-parent.js";
import { matchesInterface } from "./internal/utils.js";

export type PackableWidget = Gtk.Widget & {
    packStart(child: Gtk.Widget): void;
    packEnd(child: Gtk.Widget): void;
    remove(child: Gtk.Widget): void;
};

class PackNode extends PositionalParentNode<PackableWidget> {
    public static override priority = 0;

    protected acceptedPositionalChildTypes = new Set(["PackStart", "PackEnd"]);
    protected containerTypeName = "Pack";

    public static override matches(_type: string, containerOrClass?: Container | ContainerClass | null): boolean {
        return matchesInterface(PACK_INTERFACE_METHODS, containerOrClass);
    }
}

registerNodeClass(PackNode);
