import type * as Gtk from "@gtkx/ffi/gtk";
import type { GtkDrawingAreaProps } from "../jsx.js";
import type { Node } from "../node.js";
import { EventControllerNode } from "./event-controller.js";
import { filterProps, hasChanged } from "./internal/props.js";
import { WidgetNode } from "./widget.js";

const OWN_PROPS = ["onDraw"] as const;

type DrawFunc = (self: Gtk.DrawingArea, cr: import("@gtkx/ffi/cairo").Context, width: number, height: number) => void;
type DrawingAreaProps = Pick<GtkDrawingAreaProps, (typeof OWN_PROPS)[number]>;

type PendingDrawFunc = { container: Gtk.DrawingArea; fn: DrawFunc };

let pendingDrawFuncs: PendingDrawFunc[] | null = null;

function ensurePendingBatch(): PendingDrawFunc[] {
    if (pendingDrawFuncs === null) {
        pendingDrawFuncs = [];
        queueMicrotask(flushPendingDrawFuncs);
    }
    return pendingDrawFuncs;
}

function flushPendingDrawFuncs(): void {
    const batch = pendingDrawFuncs;
    pendingDrawFuncs = null;
    if (!batch) return;
    for (const { container, fn } of batch) {
        container.setDrawFunc(fn);
    }
}

export class DrawingAreaNode extends WidgetNode<Gtk.DrawingArea, DrawingAreaProps, EventControllerNode> {
    public override isValidChild(child: Node): boolean {
        return child instanceof EventControllerNode;
    }

    public override commitUpdate(oldProps: DrawingAreaProps | null, newProps: DrawingAreaProps): void {
        super.commitUpdate(oldProps ? filterProps(oldProps, OWN_PROPS) : null, filterProps(newProps, OWN_PROPS));
        this.applyOwnProps(oldProps, newProps);
    }

    private applyOwnProps(oldProps: DrawingAreaProps | null, newProps: DrawingAreaProps): void {
        if (hasChanged(oldProps, newProps, "onDraw") && newProps.onDraw) {
            if (this.container.getAllocatedWidth() > 0) {
                this.container.setDrawFunc(newProps.onDraw);
            } else {
                ensurePendingBatch().push({ container: this.container, fn: newProps.onDraw });
            }
        }
    }
}
