import * as Gtk from "@gtkx/ffi/gtk";
import type { AdjustableProps } from "../jsx.js";
import type { AdjustableWidget } from "../registry.js";
import { filterProps, hasChanged } from "./internal/props.js";
import { WidgetNode } from "./widget.js";

const OWN_PROPS = ["value", "lower", "upper", "stepIncrement", "pageIncrement", "pageSize", "onValueChanged"] as const;

export class AdjustableNode<T extends AdjustableWidget = AdjustableWidget> extends WidgetNode<T, AdjustableProps> {
    private adjustment: Gtk.Adjustment | null = null;

    public override commitUpdate(oldProps: AdjustableProps | null, newProps: AdjustableProps): void {
        super.commitUpdate(oldProps ? filterProps(oldProps, OWN_PROPS) : null, filterProps(newProps, OWN_PROPS));
        this.applyOwnProps(oldProps, newProps);
    }

    protected ensureAdjustment(props: AdjustableProps): Gtk.Adjustment {
        if (!this.adjustment) {
            this.adjustment = new Gtk.Adjustment(
                props.value ?? 0,
                props.lower ?? 0,
                props.upper ?? 100,
                props.stepIncrement ?? 1,
                props.pageIncrement ?? 10,
                props.pageSize ?? 0,
            );

            this.container.setAdjustment(this.adjustment);
        }

        return this.adjustment;
    }

    protected applyOwnProps(oldProps: AdjustableProps | null, newProps: AdjustableProps): void {
        const adjustment = this.ensureAdjustment(newProps);

        if (hasChanged(oldProps, newProps, "onValueChanged")) {
            const { onValueChanged } = newProps;
            this.signalStore.set(
                this,
                this.container,
                "value-changed",
                onValueChanged ? (self: T) => onValueChanged(self.getValue(), self) : undefined,
            );
        }

        if (!oldProps) return;

        if (hasChanged(oldProps, newProps, "lower")) {
            adjustment.setLower(newProps.lower ?? 0);
        }
        if (hasChanged(oldProps, newProps, "upper")) {
            adjustment.setUpper(newProps.upper ?? 100);
        }
        if (hasChanged(oldProps, newProps, "stepIncrement")) {
            adjustment.setStepIncrement(newProps.stepIncrement ?? 1);
        }
        if (hasChanged(oldProps, newProps, "pageIncrement")) {
            adjustment.setPageIncrement(newProps.pageIncrement ?? 10);
        }
        if (hasChanged(oldProps, newProps, "pageSize")) {
            adjustment.setPageSize(newProps.pageSize ?? 0);
        }
        if (hasChanged(oldProps, newProps, "value") && newProps.value !== undefined) {
            adjustment.setValue(newProps.value);
        }
    }
}
