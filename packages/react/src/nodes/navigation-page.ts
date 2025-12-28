import * as Adw from "@gtkx/ffi/adw";
import type * as Gtk from "@gtkx/ffi/gtk";
import type { AdwNavigationPageProps } from "../jsx.js";
import type { Node } from "../node.js";
import { registerNodeClass } from "../registry.js";
import { scheduleAfterCommit } from "../scheduler.js";
import { VirtualNode } from "./virtual.js";
import { WidgetNode } from "./widget.js";

type Props = Partial<AdwNavigationPageProps>;

export class NavigationPageNode extends VirtualNode<Props> {
    public static override priority = -1;

    private parent?: Adw.NavigationView;
    private child?: Gtk.Widget;
    private page?: Adw.NavigationPage;

    public static override matches(type: string): boolean {
        return type === "AdwNavigationPage";
    }

    public setParent(parent?: Adw.NavigationView): void {
        this.parent = parent;
    }

    public override appendChild(child: Node): void {
        if (!(child instanceof WidgetNode)) {
            throw new Error(`Cannot append '${child.typeName}' to 'NavigationPage': expected Widget`);
        }

        const oldChild = this.child;
        this.child = child.container;

        scheduleAfterCommit(() => {
            if (this.parent) {
                this.onChildChange(oldChild);
            }
        });
    }

    public override removeChild(): void {
        const oldChild = this.child;

        scheduleAfterCommit(() => {
            if (oldChild === this.child) {
                this.child = undefined;
            }

            if (this.parent) {
                this.onChildChange(oldChild);
            }
        });
    }

    public override unmount(): void {
        if (this.parent && this.child) {
            const oldChild = this.child;
            this.child = undefined;
            this.onChildChange(oldChild);
        }

        this.parent = undefined;
        super.unmount();
    }

    public override updateProps(oldProps: Props | null, newProps: Props): void {
        super.updateProps(oldProps, newProps);

        if (!this.page) {
            return;
        }

        if (newProps.title && (!oldProps || oldProps.title !== newProps.title)) {
            this.page.setTitle(newProps.title);
        }

        if (!oldProps || oldProps.tag !== newProps.tag) {
            this.page.setTag(newProps.tag);
        }

        if (!oldProps || oldProps.canPop !== newProps.canPop) {
            this.page.setCanPop(newProps.canPop ?? true);
        }
    }

    private onChildChange(oldChild?: Gtk.Widget): void {
        if (oldChild) {
            this.removePage();
        }

        if (this.child) {
            this.addPage();
        }
    }

    private addPage(): void {
        if (!this.child || !this.parent) {
            return;
        }

        let page: Adw.NavigationPage;

        if (this.props.tag) {
            page = Adw.NavigationPage.pageNewWithTag(this.child, this.props.title ?? "", this.props.tag);
        } else {
            page = new Adw.NavigationPage(this.child, this.props.title ?? "");
        }

        this.page = page;
        this.parent.add(page);
        this.updateProps(null, this.props);
    }

    private removePage(): void {
        if (!this.page || !this.parent) {
            return;
        }

        this.parent.remove(this.page);
        this.page = undefined;
    }
}

registerNodeClass(NavigationPageNode);
