import * as Adw from "@gtkx/ffi/adw";
import { registerNodeClass } from "../registry.js";
import type { Container, ContainerClass } from "../types.js";
import { matchesAnyClass } from "./internal/utils.js";
import { WidgetNode } from "./widget.js";

class ToggleGroupNode extends WidgetNode<Adw.ToggleGroup> {
    public static override priority = 1;

    public static override matches(_type: string, containerOrClass?: Container | ContainerClass | null): boolean {
        return matchesAnyClass([Adw.ToggleGroup], containerOrClass);
    }
}

registerNodeClass(ToggleGroupNode);
