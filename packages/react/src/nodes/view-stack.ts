import type * as Adw from "@gtkx/ffi/adw";
import type * as Gtk from "@gtkx/ffi/gtk";
import type { StackPageProps } from "../containers.js";
import { PagedStackNode } from "./paged-stack.js";
import { applyStackPageProps } from "./stack-page-props.js";

export class ViewStackNode extends PagedStackNode<Adw.ViewStack> {
    static matches(type: string): boolean {
        return type === "AdwViewStack" || type === "AdwViewStack.Root";
    }

    addStackPage(child: Gtk.Widget, props: StackPageProps): void {
        const { name, title, iconName } = props;
        let page: Adw.ViewStackPage;

        if (title !== undefined && iconName !== undefined) {
            page = this.widget.addTitledWithIcon(child, title, iconName, name);
        } else if (title !== undefined) {
            page = this.widget.addTitled(child, title, name);
        } else if (name !== undefined) {
            page = this.widget.addNamed(child, name);
        } else {
            page = this.widget.add(child);
        }

        applyStackPageProps(page, props);
        this.applyPendingVisibleChild();
    }

    protected override addChildToWidget(child: Gtk.Widget): void {
        this.widget.add(child);
    }
}
