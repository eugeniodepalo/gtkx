import * as Gtk from "@gtkx/ffi/gtk";
import type { Props } from "../factory.js";
import { Node } from "../node.js";
import { getCurrentApp } from "../reconciler.js";
import { OverlayNode } from "./overlay.js";

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

/** Minimal wrapper around an existing widget for portal containers. */
export class WidgetWrapper extends Node<Gtk.Widget> {
    constructor(widget: Gtk.Widget) {
        super("", {});
        this.widget = widget;
    }

    protected override isVirtual(): boolean {
        return true;
    }
}

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

        super.attachToParent(parent);
    }

    override detachFromParent(parent: Node): void {
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

        super.detachFromParent(parent);
    }

    protected override consumedProps(): Set<string> {
        const consumed = super.consumedProps();
        consumed.add("application");

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

    override mount(): void {
        if (this.widget instanceof Gtk.AboutDialog) {
            const app = getCurrentApp();
            const activeWindow = app?.getActiveWindow();

            if (activeWindow) {
                this.widget.setTransientFor(activeWindow);
            }
        }

        if (this.widget instanceof Gtk.Window) {
            this.widget.present();
        }
    }

    override dispose(): void {
        super.dispose();

        if (this.widget instanceof Gtk.Window) {
            this.widget.close();
        }
    }
}
