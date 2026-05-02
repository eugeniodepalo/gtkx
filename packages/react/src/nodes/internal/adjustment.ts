import * as Gtk from "@gtkx/ffi/gtk";
import type { AdjustableProps } from "../../jsx.js";
import { hasChanged } from "./props.js";

export const ADJUSTMENT_PROPS = [
    "value",
    "lower",
    "upper",
    "stepIncrement",
    "pageIncrement",
    "pageSize",
    "onValueChanged",
] as const;

export class AdjustmentController {
    private adjustment: Gtk.Adjustment | null = null;

    constructor(private readonly container: { setAdjustment: (a: Gtk.Adjustment) => void }) {}

    apply(oldProps: AdjustableProps | null, newProps: AdjustableProps): Gtk.Adjustment {
        if (!this.adjustment) {
            this.adjustment = new Gtk.Adjustment(
                newProps.value ?? 0,
                newProps.lower ?? 0,
                newProps.upper ?? 100,
                newProps.stepIncrement ?? 1,
                newProps.pageIncrement ?? 10,
                newProps.pageSize ?? 0,
            );
            this.container.setAdjustment(this.adjustment);
            return this.adjustment;
        }

        if (!oldProps) return this.adjustment;

        const adjustment = this.adjustment;
        if (hasChanged(oldProps, newProps, "lower")) adjustment.setLower(newProps.lower ?? 0);
        if (hasChanged(oldProps, newProps, "upper")) adjustment.setUpper(newProps.upper ?? 100);
        if (hasChanged(oldProps, newProps, "stepIncrement")) adjustment.setStepIncrement(newProps.stepIncrement ?? 1);
        if (hasChanged(oldProps, newProps, "pageIncrement")) adjustment.setPageIncrement(newProps.pageIncrement ?? 10);
        if (hasChanged(oldProps, newProps, "pageSize")) adjustment.setPageSize(newProps.pageSize ?? 0);
        if (hasChanged(oldProps, newProps, "value") && newProps.value !== undefined) {
            adjustment.setValue(newProps.value);
        }
        return adjustment;
    }
}
