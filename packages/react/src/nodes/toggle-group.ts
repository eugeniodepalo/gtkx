import type * as Adw from "@gtkx/ffi/adw";
import type * as GObject from "@gtkx/ffi/gobject";
import type { AdwToggleGroupProps } from "../jsx.js";
import { filterProps, hasChanged } from "./internal/props.js";
import type { SignalHandler } from "./internal/signal-store.js";
import { WidgetNode } from "./widget.js";

const OWN_PROPS = ["onActiveChanged"] as const;

type ToggleGroupProps = Pick<AdwToggleGroupProps, (typeof OWN_PROPS)[number]>;

export class ToggleGroupNode extends WidgetNode<Adw.ToggleGroup, ToggleGroupProps> {
    private notifyHandler: SignalHandler | null = null;

    public override commitUpdate(oldProps: ToggleGroupProps | null, newProps: ToggleGroupProps): void {
        super.commitUpdate(oldProps ? filterProps(oldProps, OWN_PROPS) : null, filterProps(newProps, OWN_PROPS));

        if (hasChanged(oldProps, newProps, "onActiveChanged")) {
            this.setActiveChanged(newProps.onActiveChanged);
        }
    }

    private setActiveChanged(callback?: ((active: number, activeName: string | null) => void) | null): void {
        if (this.notifyHandler) {
            this.signalStore.set(this, this.container, "notify", undefined);
            this.notifyHandler = null;
        }

        if (callback) {
            this.notifyHandler = (pspec: GObject.ParamSpec) => {
                if (pspec.getName() === "active") {
                    callback(this.container.getActive(), this.container.getActiveName());
                }
            };
            this.signalStore.set(this, this.container, "notify", this.notifyHandler);
        }
    }

    public override detachDeletedInstance(): void {
        if (this.notifyHandler) {
            this.signalStore.set(this, this.container, "notify", undefined);
            this.notifyHandler = null;
        }
        super.detachDeletedInstance();
    }
}
