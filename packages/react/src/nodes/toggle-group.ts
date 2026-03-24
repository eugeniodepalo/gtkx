import * as Adw from "@gtkx/ffi/adw";
import type { AdwToggleGroupProps, ToggleProps } from "../jsx.js";
import { filterProps, hasChanged } from "./internal/props.js";
import { WidgetNode } from "./widget.js";

const OWN_PROPS = ["onActiveChanged", "toggles"] as const;

type Props = Pick<AdwToggleGroupProps, (typeof OWN_PROPS)[number]>;

export class ToggleGroupNode extends WidgetNode<Adw.ToggleGroup, Props> {
    private managedToggles: Adw.Toggle[] = [];

    public override commitUpdate(oldProps: Props | null, newProps: Props): void {
        super.commitUpdate(oldProps ? filterProps(oldProps, OWN_PROPS) : null, filterProps(newProps, OWN_PROPS));
        this.applyOwnProps(oldProps, newProps);
    }

    public override detachDeletedInstance(): void {
        this.clearToggles();
        super.detachDeletedInstance();
    }

    private applyOwnProps(oldProps: Props | null, newProps: Props): void {
        if (hasChanged(oldProps, newProps, "onActiveChanged")) {
            const callback = newProps.onActiveChanged;
            this.signalStore.set(
                this,
                this.container,
                "notify::active",
                callback ? () => callback(this.container.getActive(), this.container.getActiveName()) : undefined,
            );
        }

        if (hasChanged(oldProps, newProps, "toggles")) {
            this.syncToggles(newProps.toggles ?? []);
        }
    }

    private syncToggles(newToggles: ToggleProps[]): void {
        this.clearToggles();

        for (const toggleProps of newToggles) {
            const toggle = new Adw.Toggle();
            applyToggleProps(toggle, toggleProps);
            this.container.add(toggle);
            this.managedToggles.push(toggle);
        }
    }

    private clearToggles(): void {
        for (const toggle of this.managedToggles) {
            this.container.remove(toggle);
        }
        this.managedToggles = [];
    }
}

function applyToggleProps(toggle: Adw.Toggle, props: ToggleProps): void {
    if (props.id != null) toggle.setName(props.id);
    if (props.label != null) toggle.setLabel(props.label);
    if (props.iconName != null) toggle.setIconName(props.iconName);
    if (props.tooltip !== undefined) toggle.setTooltip(props.tooltip);
    if (props.enabled !== undefined) toggle.setEnabled(props.enabled);
    if (props.useUnderline !== undefined) toggle.setUseUnderline(props.useUnderline);
}
