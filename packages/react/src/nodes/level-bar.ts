import type * as Gtk from "@gtkx/ffi/gtk";
import type { GtkLevelBarProps } from "../jsx.js";
import { filterProps, shallowArrayEqual } from "./internal/props.js";
import { WidgetNode } from "./widget.js";

const OWN_PROPS = ["offsets"] as const;

type LevelBarProps = Pick<GtkLevelBarProps, (typeof OWN_PROPS)[number]>;
type Offset = { id: string; value: number };

export class LevelBarNode extends WidgetNode<Gtk.LevelBar, LevelBarProps> {
    private appliedOffsets: Offset[] = [];

    public override commitUpdate(oldProps: LevelBarProps | null, newProps: LevelBarProps): void {
        super.commitUpdate(oldProps ? filterProps(oldProps, OWN_PROPS) : null, filterProps(newProps, OWN_PROPS));
        this.applyOwnProps(newProps);
    }

    private applyOwnProps(newProps: LevelBarProps): void {
        const newOffsets = newProps.offsets ?? [];

        if (shallowArrayEqual(this.appliedOffsets, newOffsets)) {
            return;
        }

        for (const offset of this.appliedOffsets) {
            this.container.removeOffsetValue(offset.id);
        }

        for (const offset of newOffsets) {
            this.container.addOffsetValue(offset.id, offset.value);
        }

        this.appliedOffsets = [...newOffsets];
    }
}
