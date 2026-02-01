import type * as Adw from "@gtkx/ffi/adw";
import type { AdwToggleGroupProps } from "../jsx.js";
import { filterProps, hasChanged } from "./internal/props.js";
import { WidgetNode } from "./widget.js";

const OWN_PROPS = ["onActiveChanged"] as const;

type ToggleGroupProps = Pick<AdwToggleGroupProps, (typeof OWN_PROPS)[number]>;

export class ToggleGroupNode extends WidgetNode<Adw.ToggleGroup, ToggleGroupProps> {
    public override commitUpdate(oldProps: ToggleGroupProps | null, newProps: ToggleGroupProps): void {
        super.commitUpdate(oldProps ? filterProps(oldProps, OWN_PROPS) : null, filterProps(newProps, OWN_PROPS));
        this.applyOwnProps(oldProps, newProps);
    }

    private applyOwnProps(oldProps: ToggleGroupProps | null, newProps: ToggleGroupProps): void {
        if (hasChanged(oldProps, newProps, "onActiveChanged")) {
            const callback = newProps.onActiveChanged;
            this.signalStore.set(
                this,
                this.container,
                "notify::active",
                callback ? () => callback(this.container.getActive(), this.container.getActiveName()) : undefined,
            );
        }
    }
}
