import type * as Gtk from "@gtkx/ffi/gtk";
import type { GtkDrawingAreaProps } from "../jsx.js";
import type { Node } from "../node.js";
import { ContainerSlotNode } from "./container-slot.js";
import { EventControllerNode } from "./event-controller.js";
import { filterProps, hasChanged } from "./internal/props.js";
import { SlotNode } from "./slot.js";
import { WidgetNode } from "./widget.js";

const OWN_PROPS = ["onDraw"] as const;

type DrawFunc = (self: Gtk.DrawingArea, cr: import("@gtkx/ffi/cairo").Context, width: number, height: number) => void;
type DrawingAreaProps = Pick<GtkDrawingAreaProps, (typeof OWN_PROPS)[number]>;
type PendingDrawFunc = { container: Gtk.DrawingArea; fn: DrawFunc };

const pendingDrawFuncs: PendingDrawFunc[] = [];

function ensurePendingBatch(): PendingDrawFunc[] {
    if (pendingDrawFuncs.length === 0) {
        queueMicrotask(flushPendingDrawFuncs);
    }

    return pendingDrawFuncs;
}

function flushPendingDrawFuncs(): void {
    const batch = pendingDrawFuncs.splice(0);

    for (const { container, fn } of batch) {
        container.setDrawFunc(fn);
    }
}

type DrawingAreaChild = EventControllerNode | SlotNode | ContainerSlotNode;

export class DrawingAreaNode extends WidgetNode<Gtk.DrawingArea, DrawingAreaProps, DrawingAreaChild> {
    public override isValidChild(child: Node): boolean {
        return child instanceof EventControllerNode || child instanceof SlotNode || child instanceof ContainerSlotNode;
    }

    public override commitUpdate(oldProps: DrawingAreaProps | null, newProps: DrawingAreaProps): void {
        super.commitUpdate(oldProps ? filterProps(oldProps, OWN_PROPS) : null, filterProps(newProps, OWN_PROPS));
        this.applyOwnProps(oldProps, newProps);
    }

    private applyOwnProps(oldProps: DrawingAreaProps | null, newProps: DrawingAreaProps): void {
        if (hasChanged(oldProps, newProps, "onDraw")) {
            if (this.container.getAllocatedWidth() > 0) {
                this.container.setDrawFunc(newProps.onDraw);
            } else if (newProps.onDraw) {
                ensurePendingBatch().push({ container: this.container, fn: newProps.onDraw });
            }
        }
    }
}
