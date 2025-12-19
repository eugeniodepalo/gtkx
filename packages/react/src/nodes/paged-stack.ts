import type * as Gtk from "@gtkx/ffi/gtk";
import type { ChildContainer, StackPageContainer, StackPageProps } from "../containers.js";
import type { Props } from "../factory.js";
import type { Node } from "../node.js";
import { Node as NodeClass } from "../node.js";
import { StackPageNode } from "./stack.js";
import { applyStackPageProps, type StackPageLike } from "./stack-page-props.js";

type StackWidget = Gtk.Widget & {
    getChildByName(name: string): Gtk.Widget | null;
    setVisibleChild(child: Gtk.Widget): void;
    remove(child: Gtk.Widget): void;
    getPage(child: Gtk.Widget): StackPageLike;
};

export abstract class PagedStackNode<T extends StackWidget>
    extends NodeClass<T>
    implements StackPageContainer, ChildContainer
{
    static override consumedPropNames = ["visibleChildName"];

    private pendingVisibleChildName: string | null = null;

    abstract addStackPage(child: Gtk.Widget, props: StackPageProps): void;

    protected abstract addChildToWidget(child: Gtk.Widget): void;

    protected applyPendingVisibleChild(): void {
        if (this.pendingVisibleChildName !== null) {
            const child = this.widget.getChildByName(this.pendingVisibleChildName);
            if (child) {
                this.widget.setVisibleChild(child);
                this.pendingVisibleChildName = null;
            }
        }
    }

    insertStackPageBefore(child: Gtk.Widget, props: StackPageProps, _beforeChild: Gtk.Widget): void {
        this.addStackPage(child, props);
    }

    removeStackPage(child: Gtk.Widget): void {
        this.widget.remove(child);
    }

    updateStackPageProps(child: Gtk.Widget, props: StackPageProps): void {
        const page = this.widget.getPage(child);
        applyStackPageProps(page, props);
    }

    attachChild(child: Gtk.Widget): void {
        this.addChildToWidget(child);
    }

    insertChildBefore(child: Gtk.Widget, _before: Gtk.Widget): void {
        this.addChildToWidget(child);
    }

    detachChild(child: Gtk.Widget): void {
        this.widget.remove(child);
    }

    private setVisibleChildOrDefer(name: string): void {
        const child = this.widget.getChildByName(name);

        if (child) {
            this.widget.setVisibleChild(child);
            this.pendingVisibleChildName = null;
        } else {
            this.pendingVisibleChildName = name;
        }
    }

    override appendChild(child: Node): void {
        if (child instanceof StackPageNode) {
            child.parent = this;
            const childWidget = child.getChildWidget();
            const props = child.getSlotProps();
            if (childWidget) {
                this.addStackPage(childWidget, props);
                child.setParentContainer(this);
            }
            return;
        }
        super.appendChild(child);
    }

    override insertBefore(child: Node, before: Node): void {
        if (child instanceof StackPageNode) {
            child.parent = this;
            const childWidget = child.getChildWidget();
            const props = child.getSlotProps();
            if (childWidget) {
                const beforeWidget = child.getBeforeWidget(before);
                if (beforeWidget) {
                    this.insertStackPageBefore(childWidget, props, beforeWidget);
                } else {
                    this.addStackPage(childWidget, props);
                }
                child.setParentContainer(this);
            }
            return;
        }
        super.insertBefore(child, before);
    }

    override removeChild(child: Node): void {
        if (child instanceof StackPageNode) {
            const childWidget = child.getChildWidget();
            if (childWidget) {
                this.removeStackPage(childWidget);
            }
            child.unmount();
            child.parent = null;
            return;
        }
        super.removeChild(child);
    }

    override updateProps(oldProps: Props, newProps: Props): void {
        if (newProps.visibleChildName !== undefined) {
            this.setVisibleChildOrDefer(newProps.visibleChildName as string);
        }

        super.updateProps(oldProps, newProps);
    }
}
