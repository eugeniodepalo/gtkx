import type * as Gtk from "@gtkx/ffi/gtk";
import type { GtkCalendarProps } from "../jsx.js";
import type { Node } from "../node.js";
import { EventControllerNode } from "./event-controller.js";
import { filterProps, primitiveArrayEqual } from "./internal/props.js";
import { SlotNode } from "./slot.js";
import { WidgetNode } from "./widget.js";

const OWN_PROPS = ["markedDays"] as const;

type CalendarProps = Pick<GtkCalendarProps, (typeof OWN_PROPS)[number]>;

type CalendarChild = EventControllerNode | SlotNode;

export class CalendarNode extends WidgetNode<Gtk.Calendar, CalendarProps, CalendarChild> {
    public override isValidChild(child: Node): boolean {
        return child instanceof EventControllerNode || child instanceof SlotNode;
    }
    private appliedMarks: number[] = [];

    public override commitUpdate(oldProps: CalendarProps | null, newProps: CalendarProps): void {
        super.commitUpdate(oldProps ? filterProps(oldProps, OWN_PROPS) : null, filterProps(newProps, OWN_PROPS));
        this.applyOwnProps(newProps);
    }

    private applyOwnProps(newProps: CalendarProps): void {
        const newMarkedDays = newProps.markedDays ?? [];

        if (primitiveArrayEqual(this.appliedMarks, newMarkedDays)) {
            return;
        }

        this.container.clearMarks();

        for (const day of newMarkedDays) {
            this.container.markDay(day);
        }

        this.appliedMarks = [...newMarkedDays];
    }
}
