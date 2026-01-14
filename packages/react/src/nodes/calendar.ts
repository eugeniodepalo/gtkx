import * as Gtk from "@gtkx/ffi/gtk";
import type { Node } from "../node.js";
import { registerNodeClass } from "../registry.js";
import { CommitPriority, scheduleAfterCommit } from "../scheduler.js";
import type { Container, ContainerClass } from "../types.js";
import { CalendarMarkNode } from "./calendar-mark.js";
import { isContainerType } from "./internal/utils.js";
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

        super.appendChild(child);
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

        super.insertBefore(child, before);
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

        super.removeChild(child);
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
