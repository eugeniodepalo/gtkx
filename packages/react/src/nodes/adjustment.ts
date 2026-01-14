import * as Gtk from "@gtkx/ffi/gtk";
import { registerNodeClass } from "../registry.js";
import type { AdjustableWidget } from "./internal/predicates.js";
import { signalStore } from "./internal/signal-store.js";
import { VirtualNode } from "./virtual.js";

/**
 * Props for the Adjustment virtual element.
 *
 * Used to declaratively configure the adjustment for adjustable widgets
 * such as Scale, Scrollbar, ScaleButton, SpinButton, and ListBox.
 *
 * @example
 * ```tsx
 * <GtkScale>
 *     <x.Adjustment
 *         value={50}
 *         lower={0}
 *         upper={100}
 *         stepIncrement={1}
 *         onValueChange={(v) => console.log("Value:", v)}
 *     />
 * </GtkScale>
 * ```
 */
export type AdjustmentProps = {
    /** The current value */
    value?: number;
    /** The minimum value */
    lower?: number;
    /** The maximum value */
    upper?: number;
    /** The increment for arrow keys */
    stepIncrement?: number;
    /** The increment for page up/down */
    pageIncrement?: number;
    /** The page size (usually 0 for scales) */
    pageSize?: number;
    /** Callback when the value changes */
    onValueChange?: (value: number) => void;
};

export class AdjustmentNode extends VirtualNode<AdjustmentProps> {
    public static override priority = 1;

    private widget?: AdjustableWidget;
    private adjustment?: Gtk.Adjustment;

    public static override matches(type: string): boolean {
        return type === "Adjustment";
    }

    public setWidget(widget: AdjustableWidget): void {
        this.widget = widget;
        this.setupAdjustment();
    }

    private setupAdjustment(): void {
        if (!this.widget) return;

        const { value = 0, lower = 0, upper = 100, stepIncrement = 1, pageIncrement = 10, pageSize = 0 } = this.props;

        this.adjustment = new Gtk.Adjustment(value, lower, upper, stepIncrement, pageIncrement, pageSize);
        this.widget.setAdjustment(this.adjustment);

        this.updateSignalHandler();
    }

    private updateSignalHandler(): void {
        if (!this.adjustment) return;

        const { onValueChange } = this.props;
        if (onValueChange) {
            const adjustment = this.adjustment;
            signalStore.set(this, adjustment, "value-changed", () => onValueChange(adjustment.getValue()));
        } else {
            signalStore.set(this, this.adjustment, "value-changed", null);
        }
    }

    public override updateProps(oldProps: AdjustmentProps | null, newProps: AdjustmentProps): void {
        super.updateProps(oldProps, newProps);

        if (!this.adjustment) return;

        if (!oldProps || oldProps.lower !== newProps.lower) {
            this.adjustment.setLower(newProps.lower ?? 0);
        }
        if (!oldProps || oldProps.upper !== newProps.upper) {
            this.adjustment.setUpper(newProps.upper ?? 100);
        }
        if (!oldProps || oldProps.stepIncrement !== newProps.stepIncrement) {
            this.adjustment.setStepIncrement(newProps.stepIncrement ?? 1);
        }
        if (!oldProps || oldProps.pageIncrement !== newProps.pageIncrement) {
            this.adjustment.setPageIncrement(newProps.pageIncrement ?? 10);
        }
        if (!oldProps || oldProps.pageSize !== newProps.pageSize) {
            this.adjustment.setPageSize(newProps.pageSize ?? 0);
        }
        if (!oldProps || oldProps.value !== newProps.value) {
            if (newProps.value !== undefined) {
                this.adjustment.setValue(newProps.value);
            }
        }

        if (!oldProps || oldProps.onValueChange !== newProps.onValueChange) {
            this.updateSignalHandler();
        }
    }

    public override unmount(): void {
        this.adjustment = undefined;
        this.widget = undefined;
        super.unmount();
    }
}

registerNodeClass(AdjustmentNode);
