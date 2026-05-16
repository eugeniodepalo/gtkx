import type * as Adw from "@gtkx/ffi/adw";
import type * as Gtk from "@gtkx/ffi/gtk";
import type { AdwViewStackProps, GtkStackProps } from "../jsx.js";
import { filterProps, hasChanged } from "./internal/props.js";
import { WidgetNode } from "./widget.js";

/** Widgets the {@link StackNode} reconciler node specializes. */
export type StackWidget = Gtk.Stack | Adw.ViewStack;

const OWN_PROPS = ["page", "onPageChanged"] as const;

type StackProps = Omit<Pick<GtkStackProps | AdwViewStackProps, (typeof OWN_PROPS)[number]>, "onPageChanged"> & {
    onPageChanged?: ((page: string | null) => void) | null;
};

export class StackNode extends WidgetNode<StackWidget, StackProps> {
    public override commitUpdate(oldProps: StackProps | null, newProps: StackProps): void {
        super.commitUpdate(oldProps ? filterProps(oldProps, OWN_PROPS) : null, filterProps(newProps, OWN_PROPS));
        this.applyOwnProps(oldProps, newProps);
    }

    private applyOwnProps(oldProps: StackProps | null, newProps: StackProps): void {
        if (newProps.page && this.container.getVisibleChildName() !== newProps.page) {
            if (this.container.getChildByName(newProps.page)) {
                this.container.setVisibleChildName(newProps.page);
            }
        }

        if (hasChanged(oldProps, newProps, "onPageChanged")) {
            const { onPageChanged } = newProps;
            this.signalStore.set(
                this,
                this.container,
                "notify::visible-child-name",
                onPageChanged ? () => onPageChanged(this.container.getVisibleChildName()) : undefined,
            );
        }
    }
}
