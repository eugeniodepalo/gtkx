import * as Gtk from "@gtkx/ffi/gtk";
import type { Node } from "../node.js";
import { registerNodeClass } from "../registry.js";
import { CommitPriority, scheduleAfterCommit } from "../scheduler.js";
import type { Container, ContainerClass } from "../types.js";
import { isContainerType } from "./internal/utils.js";
import { ScaleMarkNode } from "./scale-mark.js";
import { WidgetNode } from "./widget.js";

class ScaleNode extends WidgetNode<Gtk.Scale> {
    public static override priority = 1;

    private markChildren: ScaleMarkNode[] = [];

    public static override matches(_type: string, containerOrClass?: Container | ContainerClass | null): boolean {
        return isContainerType(Gtk.Scale, containerOrClass);
    }

    public override appendChild(child: Node): void {
        if (child instanceof ScaleMarkNode) {
            child.setScale(this.container, () => this.scheduleRebuildAllMarks());
            this.markChildren.push(child);
            scheduleAfterCommit(() => child.addMark());
            return;
        }

        super.appendChild(child);
    }

    public override insertBefore(child: Node, before: Node): void {
        if (child instanceof ScaleMarkNode) {
            child.setScale(this.container, () => this.scheduleRebuildAllMarks());

            const beforeIndex = this.markChildren.indexOf(before as ScaleMarkNode);
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
        if (child instanceof ScaleMarkNode) {
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

registerNodeClass(ScaleNode);
