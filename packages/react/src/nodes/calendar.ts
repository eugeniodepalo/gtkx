import * as Gtk from "@gtkx/ffi/gtk";
import type { Node } from "../node.js";
import { registerNodeClass } from "../registry.js";
import { CommitPriority, scheduleAfterCommit } from "../scheduler.js";
import type { Container, ContainerClass } from "../types.js";
import { CalendarMarkNode } from "./calendar-mark.js";
import { isContainerType } from "./internal/utils.js";
import { SlotNode } from "./slot.js";
import { WidgetNode } from "./widget.js";

class CalendarNode extends WidgetNode<Gtk.Calendar> {
    public static override priority = 1;

    private markChildren: CalendarMarkNode[] = [];

    public static override matches(_type: string, containerOrClass?: Container | ContainerClass | null): boolean {
        return isContainerType(Gtk.Calendar, containerOrClass);
    }

    public override appendChild(child: Node): void {
        if (child instanceof CalendarMarkNode) {
            child.setCalendar(this.container, () => this.scheduleRebuildAllMarks());
            this.markChildren.push(child);
            scheduleAfterCommit(() => child.addMark());
            return;
        }

        if (child instanceof SlotNode || child instanceof WidgetNode) {
            super.appendChild(child);
            return;
        }

        throw new Error(`Cannot append '${child.typeName}' to 'Calendar': expected x.CalendarMark or Widget`);
    }

    public override insertBefore(child: Node, before: Node): void {
        if (child instanceof CalendarMarkNode) {
            child.setCalendar(this.container, () => this.scheduleRebuildAllMarks());

            const beforeIndex = this.markChildren.indexOf(before as CalendarMarkNode);
            if (beforeIndex >= 0) {
                this.markChildren.splice(beforeIndex, 0, child);
            } else {
                this.markChildren.push(child);
            }

            this.scheduleRebuildAllMarks();
            return;
        }

        if (child instanceof SlotNode || child instanceof WidgetNode) {
            super.insertBefore(child, before);
            return;
        }

        throw new Error(`Cannot insert '${child.typeName}' into 'Calendar': expected x.CalendarMark or Widget`);
    }

    public override removeChild(child: Node): void {
        if (child instanceof CalendarMarkNode) {
            const index = this.markChildren.indexOf(child);
            if (index >= 0) {
                this.markChildren.splice(index, 1);
            }
            this.scheduleRebuildAllMarks(CommitPriority.HIGH);
            return;
        }

        if (child instanceof SlotNode || child instanceof WidgetNode) {
            super.removeChild(child);
            return;
        }

        throw new Error(`Cannot remove '${child.typeName}' from 'Calendar': expected x.CalendarMark or Widget`);
    }

    private scheduleRebuildAllMarks(priority = CommitPriority.NORMAL): void {
        scheduleAfterCommit(() => {
            this.container.clearMarks();
            for (const mark of this.markChildren) {
                mark.addMark();
            }
        }, priority);
    }
}

registerNodeClass(CalendarNode);
