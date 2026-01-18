import * as Gtk from "@gtkx/ffi/gtk";
import { registerNodeClass } from "../registry.js";
import type { Container, ContainerClass, Props } from "../types.js";
import { filterProps, matchesAnyClass, shallowArrayEqual } from "./internal/utils.js";
import { WidgetNode } from "./widget.js";

type LevelBarOffset = {
    id: string;
    value: number;
};

type LevelBarProps = Props & {
    offsets?: LevelBarOffset[] | null;
};

const OWN_PROPS = ["offsets"] as const;

class LevelBarNode extends WidgetNode<Gtk.LevelBar> {
    public static override priority = 1;

    private appliedOffsetIds = new Set<string>();

    public static override matches(_type: string, containerOrClass?: Container | ContainerClass | null): boolean {
        return matchesAnyClass([Gtk.LevelBar], containerOrClass);
    }

    public override updateProps(oldProps: LevelBarProps | null, newProps: LevelBarProps): void {
        super.updateProps(
            oldProps ? (filterProps(oldProps, OWN_PROPS) as LevelBarProps) : null,
            filterProps(newProps, OWN_PROPS) as LevelBarProps,
        );
        this.applyOwnProps(oldProps, newProps);
    }

    protected applyOwnProps(oldProps: LevelBarProps | null, newProps: LevelBarProps): void {
        this.applyOffsets(oldProps, newProps);
    }

    private applyOffsets(oldProps: LevelBarProps | null, newProps: LevelBarProps): void {
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

registerNodeClass(LevelBarNode);
