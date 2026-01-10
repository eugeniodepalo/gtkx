import * as Gtk from "@gtkx/ffi/gtk";
import type { Node } from "../node.js";
import { registerNodeClass } from "../registry.js";
import { CommitPriority, scheduleAfterCommit } from "../scheduler.js";
import type { Container, ContainerClass } from "../types.js";
import { isContainerType } from "./internal/utils.js";
import { LevelBarOffsetNode } from "./level-bar-offset.js";
import { SlotNode } from "./slot.js";
import { WidgetNode } from "./widget.js";

class LevelBarNode extends WidgetNode<Gtk.LevelBar> {
    public static override priority = 1;

    private offsetChildren: LevelBarOffsetNode[] = [];
    private appliedOffsetIds = new Set<string>();

    public static override matches(_type: string, containerOrClass?: Container | ContainerClass | null): boolean {
        return isContainerType(Gtk.LevelBar, containerOrClass);
    }

    public override appendChild(child: Node): void {
        if (child instanceof LevelBarOffsetNode) {
            child.setLevelBar(this.container, () => this.scheduleRebuildAllOffsets());
            this.offsetChildren.push(child);
            scheduleAfterCommit(() => {
                const id = child.addOffset();
                if (id) {
                    this.appliedOffsetIds.add(id);
                }
            });
            return;
        }

        if (child instanceof SlotNode || child instanceof WidgetNode) {
            super.appendChild(child);
            return;
        }

        throw new Error(`Cannot append '${child.typeName}' to 'LevelBar': expected x.LevelBarOffset or Widget`);
    }

    public override insertBefore(child: Node, before: Node): void {
        if (child instanceof LevelBarOffsetNode) {
            child.setLevelBar(this.container, () => this.scheduleRebuildAllOffsets());

            const beforeIndex = this.offsetChildren.indexOf(before as LevelBarOffsetNode);
            if (beforeIndex >= 0) {
                this.offsetChildren.splice(beforeIndex, 0, child);
            } else {
                this.offsetChildren.push(child);
            }

            this.scheduleRebuildAllOffsets();
            return;
        }

        if (child instanceof SlotNode || child instanceof WidgetNode) {
            super.insertBefore(child, before);
            return;
        }

        throw new Error(`Cannot insert '${child.typeName}' into 'LevelBar': expected x.LevelBarOffset or Widget`);
    }

    public override removeChild(child: Node): void {
        if (child instanceof LevelBarOffsetNode) {
            const index = this.offsetChildren.indexOf(child);
            if (index >= 0) {
                this.offsetChildren.splice(index, 1);
            }
            this.scheduleRebuildAllOffsets(CommitPriority.HIGH);
            return;
        }

        if (child instanceof SlotNode || child instanceof WidgetNode) {
            super.removeChild(child);
            return;
        }

        throw new Error(`Cannot remove '${child.typeName}' from 'LevelBar': expected x.LevelBarOffset or Widget`);
    }

    private scheduleRebuildAllOffsets(priority = CommitPriority.NORMAL): void {
        scheduleAfterCommit(() => {
            for (const id of this.appliedOffsetIds) {
                this.container.removeOffsetValue(id);
            }
            this.appliedOffsetIds.clear();

            for (const offset of this.offsetChildren) {
                const id = offset.addOffset();
                if (id) {
                    this.appliedOffsetIds.add(id);
                }
            }
        }, priority);
    }
}

registerNodeClass(LevelBarNode);
