import * as Adw from "@gtkx/ffi/adw";
import type { Node } from "../node.js";
import { registerNodeClass } from "../registry.js";
import type { Container, ContainerClass } from "../types.js";
import { isContainerType } from "./internal/utils.js";
import { NavigationPageNode } from "./navigation-page.js";
import { WidgetNode } from "./widget.js";

class NavigationViewNode extends WidgetNode<Adw.NavigationView> {
    public static override priority = -1;

    public static override matches(_type: string, containerOrClass?: Container | ContainerClass): boolean {
        return isContainerType(Adw.NavigationView, containerOrClass);
    }

    public override appendChild(child: Node): void {
        if (child instanceof NavigationPageNode) {
            child.setParent(this.container);
            return;
        }

        super.appendChild(child);
    }

    public override insertBefore(child: Node, _before: Node): void {
        this.appendChild(child);
    }

    public override removeChild(child: Node): void {
        if (child instanceof NavigationPageNode) {
            child.unmount();
            return;
        }

        super.removeChild(child);
    }
}

registerNodeClass(NavigationViewNode);
