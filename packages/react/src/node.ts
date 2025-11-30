import * as GObject from "@gtkx/ffi/gobject";
import * as Gtk from "@gtkx/ffi/gtk";
import type { Props } from "./factory.js";
import { CONSTRUCTOR_PARAMS } from "./generated/jsx.js";
import { isAppendable, isRemovable, isSingleChild } from "./predicates.js";

type WidgetConstructor = new (...args: unknown[]) => Gtk.Widget;

const extractConstructorArgs = (type: string, props: Props): unknown[] => {
    const params = CONSTRUCTOR_PARAMS[type];
    if (!params) return [];
    return params.map((p: { name: string; hasDefault: boolean }) => props[p.name]);
};

export abstract class Node<T extends Gtk.Widget | undefined = Gtk.Widget | undefined> {
    static matches(_type: string): boolean {
        return false;
    }

    protected signalHandlers = new Map<string, number>();
    protected widget: T;

    protected isVirtual(): boolean {
        return false;
    }

    constructor(type: string, props: Props, app: Gtk.Application) {
        this.widget = (this.isVirtual() ? undefined : this.createWidget(type, props, app)) as T;
        this.updateProps({}, props);
    }

    protected createWidget(type: string, props: Props, app: Gtk.Application): T {
        const normalizedType = type.split(".")[0] || type;
        // biome-ignore lint/performance/noDynamicNamespaceImportAccess: dynamic widget creation
        const WidgetClass = Gtk[normalizedType as keyof typeof Gtk] as WidgetConstructor | undefined;

        if (!WidgetClass) {
            throw new Error(`Unknown GTK widget type: ${normalizedType}`);
        }

        if (normalizedType === "ApplicationWindow") {
            return new WidgetClass(app) as T;
        }

        return new WidgetClass(...extractConstructorArgs(normalizedType, props)) as T;
    }

    getWidget(): T {
        return this.widget;
    }

    appendChild(child: Node): void {
        child.attachToParent(this);
    }

    removeChild(child: Node): void {
        child.detachFromParent(this);
    }

    insertBefore(child: Node, _before: Node): void {
        this.appendChild(child);
    }

    attachToParent(parent: Node): void {
        const parentWidget = parent.getWidget();
        const widget = this.getWidget();

        if (!parentWidget || !widget) return;

        if (isAppendable(parentWidget)) {
            parentWidget.append(widget);
        } else if (isSingleChild(parentWidget)) {
            parentWidget.setChild(widget);
        }
    }

    detachFromParent(parent: Node): void {
        const parentWidget = parent.getWidget();
        const widget = this.getWidget();

        if (!parentWidget || !widget) return;

        if (isRemovable(parentWidget)) {
            parentWidget.remove(widget);
        } else if (isSingleChild(parentWidget)) {
            parentWidget.setChild(null);
        }
    }

    protected consumedProps(): Set<string> {
        return new Set(["children"]);
    }

    updateProps(oldProps: Props, newProps: Props): void {
        const widget = this.getWidget();

        if (!widget) return;

        const consumed = this.consumedProps();
        const allKeys = new Set([...Object.keys(oldProps), ...Object.keys(newProps)]);

        for (const key of allKeys) {
            if (consumed.has(key)) continue;

            const oldValue = oldProps[key];
            const newValue = newProps[key];

            if (oldValue === newValue) continue;

            if (key.startsWith("on")) {
                this.setSignalProperty(widget, key, newValue);
                continue;
            }

            if (newValue === undefined) continue;

            this.setProperty(widget, key, newValue);
        }
    }

    protected setSignalProperty(widget: Gtk.Widget, key: string, handler: unknown): void {
        const eventName = key
            .slice(2)
            .replace(/([A-Z])/g, "-$1")
            .toLowerCase()
            .replace(/^-/, "");

        const oldHandlerId = this.signalHandlers.get(eventName);

        if (oldHandlerId !== undefined) {
            GObject.signalHandlerDisconnect(widget, oldHandlerId);
            this.signalHandlers.delete(eventName);
        }

        if (typeof handler === "function") {
            this.setSignalHandler(widget, eventName, handler as (...args: unknown[]) => unknown);
        }
    }

    protected setSignalHandler(widget: Gtk.Widget, eventName: string, handler: (...args: unknown[]) => unknown): void {
        const handlerId = widget.connect(eventName, handler);
        this.signalHandlers.set(eventName, handlerId);
    }

    protected setProperty(widget: Gtk.Widget, key: string, value: unknown): void {
        const setterName = `set${key.charAt(0).toUpperCase()}${key.slice(1)}`;
        const setter = widget[setterName as keyof typeof widget];

        if (typeof setter === "function") {
            (setter as (value: unknown) => void).call(widget, value);
        }
    }

    mount(_app: Gtk.Application): void {}

    dispose(_app: Gtk.Application): void {}
}
