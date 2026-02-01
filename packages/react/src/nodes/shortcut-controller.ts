import type * as Gtk from "@gtkx/ffi/gtk";
import type { Node } from "../node.js";
import { EventControllerNode } from "./event-controller.js";
import { ShortcutNode } from "./shortcut.js";

export class ShortcutControllerNode extends EventControllerNode<Gtk.ShortcutController, ShortcutNode> {
    public override isValidChild(child: Node): boolean {
        return child instanceof ShortcutNode;
    }

    public override appendChild(child: ShortcutNode): void {
        super.appendChild(child);
        child.createShortcut();
        const shortcut = child.getShortcut();
        if (shortcut) {
            this.container.addShortcut(shortcut);
        }
    }

    public override removeChild(child: ShortcutNode): void {
        const shortcut = child.getShortcut();
        if (shortcut) {
            this.container.removeShortcut(shortcut);
        }
        super.removeChild(child);
    }
}
