import type * as Gtk from "@gtkx/ffi/gtk";
import type { Props } from "../factory.js";
import { Node } from "../node.js";

export class SlotNode extends Node<never> {
    static matches(type: string): boolean {
        if (!type.includes(".")) return false;
        const parts = type.split(".");
        if (parts.length !== 2) return false;
        const suffix = parts[1];
        return suffix !== "Root";
    }

    protected override isVirtual(): boolean {
        return true;
    }

    private child: Node | null = null;
    private slotName: string;

    constructor(type: string, props: Props, app: Gtk.Application) {
        super(type, props, app);

        const dotIndex = type.indexOf(".");

        if (dotIndex === -1) {
            throw new Error(`Invalid slot type: ${type}`);
        }

        this.slotName = type.substring(dotIndex + 1);
    }

    override appendChild(child: Node): void {
        if (child.getWidget()) {
            this.child = child;
        }
    }

    override removeChild(_child: Node): void {
        this.child = null;
    }

    override attachToParent(parent: Node): void {
        const parentWidget = parent.getWidget();
        const childWidget = this.child?.getWidget();

        if (!parentWidget || !childWidget) return;

        const setterName = `set${this.slotName}`;
        const setter = parentWidget[setterName as keyof Gtk.Widget];

        if (typeof setter === "function") {
            (setter as (ptr: unknown) => void).call(parentWidget, childWidget.ptr);
        }
    }

    override detachFromParent(parent: Node): void {
        const parentWidget = parent.getWidget();

        if (!parentWidget) return;

        const setterName = `set${this.slotName}`;
        const setter = parentWidget[setterName as keyof Gtk.Widget];

        if (typeof setter === "function") {
            (setter as (ptr: null) => void).call(parentWidget, null);
        }
    }
}
