import type * as Adw from "@gtkx/ffi/adw";
import { hasChanged } from "./internal/props.js";
import { WidgetNode } from "./widget.js";

type SwitchRowProps = {
    onActiveChanged?: ((active: boolean, self: Adw.SwitchRow) => void) | null;
};

export class SwitchRowNode extends WidgetNode<Adw.SwitchRow, SwitchRowProps> {
    public override commitUpdate(oldProps: SwitchRowProps | null, newProps: SwitchRowProps): void {
        super.commitUpdate(oldProps, newProps);
        this.applyOwnProps(oldProps, newProps);
    }

    private applyOwnProps(oldProps: SwitchRowProps | null, newProps: SwitchRowProps): void {
        if (hasChanged(oldProps, newProps, "onActiveChanged")) {
            const { onActiveChanged } = newProps;
            this.signalStore.set(
                this,
                this.container,
                "notify::active",
                onActiveChanged ? (self: Adw.SwitchRow) => onActiveChanged(self.getActive(), self) : undefined,
            );
        }
    }
}
