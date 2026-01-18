import * as Gtk from "@gtkx/ffi/gtk";
import { registerNodeClass } from "../registry.js";
import type { Container, ContainerClass, Props } from "../types.js";
import { AdjustableNode } from "./adjustable.js";
import { matchesAnyClass, shallowArrayEqual } from "./internal/utils.js";

type ScaleMark = {
    value: number;
    position?: Gtk.PositionType;
    label?: string | null;
};

type ScaleProps = Props & {
    marks?: ScaleMark[] | null;
};

class ScaleNode extends AdjustableNode<Gtk.Scale> {
    public static override priority = 1;

    private appliedMarks: ScaleMark[] = [];

    public static override matches(_type: string, containerOrClass?: Container | ContainerClass | null): boolean {
        return matchesAnyClass([Gtk.Scale], containerOrClass);
    }

    protected override applyOwnProps(oldProps: ScaleProps | null, newProps: ScaleProps): void {
        super.applyOwnProps(oldProps, newProps);
        this.applyMarks(newProps);
    }

    private applyMarks(newProps: ScaleProps): void {
        const newMarks = newProps.marks ?? [];

        if (shallowArrayEqual(this.appliedMarks, newMarks)) {
            return;
        }

        this.container.clearMarks();

        for (const mark of newMarks) {
            this.container.addMark(mark.value, mark.position ?? Gtk.PositionType.BOTTOM, mark.label);
        }

        this.appliedMarks = [...newMarks];
    }
}

registerNodeClass(ScaleNode);
