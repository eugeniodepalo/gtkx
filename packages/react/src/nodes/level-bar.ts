import type * as Gtk from "@gtkx/ffi/gtk";
import type { GtkLevelBarProps } from "../jsx.js";
import { filterProps, shallowArrayEqual } from "./internal/props.js";
import { WidgetNode } from "./widget.js";

const OWN_PROPS = ["offsets"] as const;

type LevelBarProps = Pick<GtkLevelBarProps, (typeof OWN_PROPS)[number]>;

export class LevelBarNode extends WidgetNode<Gtk.LevelBar> {
    private appliedOffsetIds = new Set<string>();

    public override commitUpdate(oldProps: LevelBarProps | null, newProps: LevelBarProps): void {
        super.commitUpdate(oldProps ? filterProps(oldProps, OWN_PROPS) : null, filterProps(newProps, OWN_PROPS));
        this.applyOffsetProps(oldProps, newProps);
    }

    private applyOffsetProps(oldProps: LevelBarProps | null, newProps: LevelBarProps): void {
        const newOffsets = newProps.offsets ?? [];

        if (shallowArrayEqual(oldProps?.offsets ?? [], newOffsets)) {
            return;
        }

        for (const id of this.appliedOffsetIds) {
            this.container.removeOffsetValue(id);
        }
        this.appliedOffsetIds.clear();

        for (const offset of newOffsets) {
            this.container.addOffsetValue(offset.id, offset.value);
            this.appliedOffsetIds.add(offset.id);
        }
    }
}
