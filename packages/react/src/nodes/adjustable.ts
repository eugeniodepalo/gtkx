import type * as Gtk from "@gtkx/ffi/gtk";
import type { AdjustableProps } from "../jsx.js";
import type { AdjustableWidget } from "../registry.js";
import { ADJUSTMENT_PROPS, AdjustmentController } from "./internal/adjustment.js";
import { filterProps, hasChanged } from "./internal/props.js";
import { WidgetNode } from "./widget.js";

export class AdjustableNode<T extends AdjustableWidget = AdjustableWidget> extends WidgetNode<T, AdjustableProps> {
    private adjustmentController = new AdjustmentController(this.container);

    public override commitUpdate(oldProps: AdjustableProps | null, newProps: AdjustableProps): void {
        super.commitUpdate(
            oldProps ? filterProps(oldProps, ADJUSTMENT_PROPS) : null,
            filterProps(newProps, ADJUSTMENT_PROPS),
        );
        this.applyOwnProps(oldProps, newProps);
    }

    protected ensureAdjustment(props: AdjustableProps): Gtk.Adjustment {
        return this.adjustmentController.apply(null, props);
    }

    protected applyOwnProps(oldProps: AdjustableProps | null, newProps: AdjustableProps): void {
        if (hasChanged(oldProps, newProps, "onValueChanged")) {
            const { onValueChanged } = newProps;
            this.signalStore.set(
                this,
                this.container,
                "value-changed",
                onValueChanged ? (self: T) => onValueChanged(self.getValue(), self) : undefined,
            );
        }

        this.adjustmentController.apply(oldProps, newProps);
    }
}
