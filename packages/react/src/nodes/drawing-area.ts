import type * as Gtk from "@gtkx/ffi/gtk";
import type { GtkDrawingAreaProps } from "../jsx.js";
import type { Node } from "../node.js";
import { ContainerSlotNode } from "./container-slot.js";
import { EventControllerNode } from "./event-controller.js";
import { filterProps, hasChanged } from "./internal/props.js";
import { SlotNode } from "./slot.js";
import { WidgetNode } from "./widget.js";

const OWN_PROPS = ["render"] as const;

type DrawFunc = (cr: import("@gtkx/ffi/cairo").Context, width: number, height: number, self: Gtk.DrawingArea) => void;
type DrawingAreaProps = Pick<GtkDrawingAreaProps, (typeof OWN_PROPS)[number]>;

type DrawingAreaChild = EventControllerNode | SlotNode | ContainerSlotNode;

export class DrawingAreaNode extends WidgetNode<Gtk.DrawingArea, DrawingAreaProps, DrawingAreaChild> {
    private currentDrawFunc: DrawFunc | null = null;

    public override isValidChild(child: Node): boolean {
        return child instanceof EventControllerNode || child instanceof SlotNode || child instanceof ContainerSlotNode;
    }

    public override commitUpdate(oldProps: DrawingAreaProps | null, newProps: DrawingAreaProps): void {
        super.commitUpdate(oldProps ? filterProps(oldProps, OWN_PROPS) : null, filterProps(newProps, OWN_PROPS));
        this.applyOwnProps(oldProps, newProps);
    }

    public override detachDeletedInstance(): void {
        this.currentDrawFunc = null;
        this.container.setDrawFunc(undefined);
        super.detachDeletedInstance();
    }

    private applyOwnProps(oldProps: DrawingAreaProps | null, newProps: DrawingAreaProps): void {
        if (hasChanged(oldProps, newProps, "render")) {
            const hadDraw = !!oldProps?.render;
            const hasDraw = !!newProps.render;

            this.currentDrawFunc = newProps.render ?? null;

            if (hasDraw && !hadDraw) {
                this.container.setDrawFunc((self, cr, width, height) => {
                    this.currentDrawFunc?.(cr, width, height, self);
                });
            } else if (!hasDraw && hadDraw) {
                this.container.setDrawFunc(undefined);
            } else if (hasDraw) {
                this.container.queueDraw();
            }
        }
    }
}
