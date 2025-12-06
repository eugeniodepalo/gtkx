import * as GObject from "@gtkx/ffi/gobject";
import * as Gtk from "@gtkx/ffi/gtk";
import type { Props } from "../factory.js";
import { Node } from "../node.js";
import { OverlayNode } from "./overlay.js";

const isFlowBox = (widget: Gtk.Widget): widget is Gtk.FlowBox => widget instanceof Gtk.FlowBox;

const isFlowBoxChild = (widget: Gtk.Widget): widget is Gtk.FlowBoxChild =>
    GObject.typeNameFromInstance(widget.ptr as number) === "GtkFlowBoxChild";

const isListBox = (widget: Gtk.Widget): widget is Gtk.ListBox => widget instanceof Gtk.ListBox;

const isListBoxRow = (widget: Gtk.Widget): widget is Gtk.ListBoxRow =>
    GObject.typeNameFromInstance(widget.ptr as number) === "GtkListBoxRow";

type CombinedPropHandler = {
    props: string[];
    apply: (widget: Gtk.Widget) => (values: Record<string, unknown>) => void;
};

const COMBINED_PROPS: CombinedPropHandler[] = [
    {
        props: ["defaultWidth", "defaultHeight"],
        apply: (widget) => (values) => {
            if (widget instanceof Gtk.Window) {
                const width = (values.defaultWidth as number) ?? -1;
                const height = (values.defaultHeight as number) ?? -1;
                widget.setDefaultSize(width, height);
            }
        },
    },
];

export class WidgetNode extends Node<Gtk.Widget> {
    static matches(_type: string): boolean {
        return true;
    }

    override attachToParent(parent: Node): void {
        if (this.widget instanceof Gtk.AboutDialog) {
            return;
        }

        if (parent instanceof OverlayNode) {
            parent.attachChild(this.widget);
            return;
        }

        const parentWidget = parent.getWidget();

        if (!parentWidget) return;

        if (parentWidget instanceof Gtk.ActionBar) {
            parentWidget.packStart(this.widget);
            return;
        }
        if (parentWidget instanceof Gtk.Notebook) {
            parentWidget.appendPage(this.widget);
            return;
        }
        if (isFlowBox(parentWidget)) {
            parentWidget.append(this.widget);
            return;
        }
        if (isListBox(parentWidget)) {
            parentWidget.append(this.widget);
            return;
        }

        super.attachToParent(parent);
    }

    override attachToParentBefore(parent: Node, before: Node): void {
        if (this.widget instanceof Gtk.AboutDialog) {
            return;
        }

        if (parent instanceof OverlayNode) {
            const beforeWidget = before.getWidget();

            if (beforeWidget) {
                parent.insertChildBefore(this.widget, beforeWidget);
            } else {
                parent.attachChild(this.widget);
            }

            return;
        }

        const parentWidget = parent.getWidget();
        const beforeWidget = before.getWidget();

        if (!parentWidget) return;

        if (parentWidget instanceof Gtk.ActionBar) {
            parentWidget.packStart(this.widget);
            return;
        }

        if (parentWidget instanceof Gtk.Notebook && beforeWidget) {
            const beforePageNum = parentWidget.pageNum(beforeWidget);

            if (beforePageNum >= 0) {
                parentWidget.insertPage(this.widget, beforePageNum);
            } else {
                parentWidget.appendPage(this.widget);
            }

            return;
        }

        if (isFlowBox(parentWidget)) {
            if (beforeWidget) {
                const beforeChild = beforeWidget.getParent();
                if (beforeChild && isFlowBoxChild(beforeChild)) {
                    parentWidget.insert(this.widget, beforeChild.getIndex());
                } else {
                    parentWidget.append(this.widget);
                }
            } else {
                parentWidget.append(this.widget);
            }
            return;
        }

        if (isListBox(parentWidget)) {
            if (beforeWidget && isListBoxRow(beforeWidget)) {
                parentWidget.insert(this.widget, beforeWidget.getIndex());
            } else {
                parentWidget.append(this.widget);
            }
            return;
        }

        super.attachToParentBefore(parent, before);
    }

    override detachFromParent(parent: Node): void {
        if (this.widget instanceof Gtk.Window) {
            this.widget.destroy();
            return;
        }

        if (this.widget instanceof Gtk.AboutDialog) {
            return;
        }

        if (parent instanceof OverlayNode) {
            parent.detachChild(this.widget);
            return;
        }

        const parentWidget = parent.getWidget();

        if (!parentWidget) return;

        if (parentWidget instanceof Gtk.ActionBar) {
            parentWidget.remove(this.widget);
            return;
        }

        if (parentWidget instanceof Gtk.Notebook) {
            const pageNum = parentWidget.pageNum(this.widget);

            if (pageNum >= 0) {
                parentWidget.removePage(pageNum);
            }

            return;
        }

        if (isFlowBox(parentWidget)) {
            const flowBoxChild = this.widget.getParent();
            if (flowBoxChild) {
                parentWidget.remove(flowBoxChild);
            }
            return;
        }

        if (isListBox(parentWidget)) {
            parentWidget.remove(this.widget);
            return;
        }

        super.detachFromParent(parent);
    }

    protected override consumedProps(): Set<string> {
        const consumed = super.consumedProps();

        for (const handler of COMBINED_PROPS) {
            for (const prop of handler.props) {
                consumed.add(prop);
            }
        }

        return consumed;
    }

    override updateProps(oldProps: Props, newProps: Props): void {
        for (const handler of COMBINED_PROPS) {
            const hasAnyChanged = handler.props.some((prop) => oldProps[prop] !== newProps[prop]);

            if (hasAnyChanged) {
                const values: Record<string, unknown> = {};

                for (const prop of handler.props) {
                    values[prop] = newProps[prop];
                }

                handler.apply(this.widget)(values);
            }
        }

        super.updateProps(oldProps, newProps);
    }

    override mount(_app: Gtk.Application): void {
        if (this.widget instanceof Gtk.Window) {
            this.widget.present();
        }
    }
}
