import type * as Gtk from "@gtkx/ffi/gtk";
import { CONTROLLER_CLASSES, CONTROLLER_CONSTRUCTOR_PARAMS } from "../generated/internal.js";
import type { Node } from "../node.js";
import { registerNodeClass } from "../registry.js";
import type { Props } from "../types.js";
import type { Attachable } from "./internal/predicates.js";
import { type SignalHandler, signalStore } from "./internal/signal-store.js";
import { propNameToSignalName, resolvePropMeta, resolveSignal } from "./internal/utils.js";
import { VirtualNode } from "./virtual.js";
import { WidgetNode } from "./widget.js";

class EventControllerNode extends VirtualNode<Props> implements Attachable {
    public static override priority = 1;

    public static override matches(type: string): boolean {
        return type in CONTROLLER_CLASSES;
    }

    protected controller: Gtk.EventController | null = null;
    protected parentWidget: Gtk.Widget | null = null;

    public canBeChildOf(parent: Node): boolean {
        return parent instanceof WidgetNode;
    }

    public attachTo(parent: Node): void {
        if (parent instanceof WidgetNode) {
            const widget = parent.container;
            this.parentWidget = widget;
            this.controller = this.createController();
            this.applyProps(null, this.props);
            widget.addController(this.controller);
        }
    }

    public detachFrom(_parent: Node): void {
        if (this.parentWidget && this.controller) {
            this.parentWidget.removeController(this.controller);
        }
        this.controller = null;
        this.parentWidget = null;
    }

    public override updateProps(oldProps: Props | null, newProps: Props): void {
        super.updateProps(oldProps, newProps);
        this.applyProps(oldProps, newProps);
    }

    public override unmount(): void {
        if (this.parentWidget && this.controller) {
            this.parentWidget.removeController(this.controller);
        }
        this.controller = null;
        this.parentWidget = null;
        super.unmount();
    }

    private createController(): Gtk.EventController {
        const typeName = this.typeName as keyof typeof CONTROLLER_CLASSES;
        const ControllerClass = CONTROLLER_CLASSES[typeName];
        const constructorParams = CONTROLLER_CONSTRUCTOR_PARAMS[this.typeName] ?? [];
        const args = constructorParams.map((param) => this.props[param]);

        // biome-ignore lint/suspicious/noExplicitAny: Dynamic constructor invocation
        return new (ControllerClass as any)(...args);
    }

    private applyProps(oldProps: Props | null, newProps: Props): void {
        if (!this.controller) return;

        const propNames = new Set([...Object.keys(oldProps ?? {}), ...Object.keys(newProps ?? {})]);

        for (const name of propNames) {
            if (name === "children" || name === "ref") continue;

            const oldValue = oldProps?.[name];
            const newValue = newProps[name];

            if (oldValue === newValue) continue;

            const signalName = propNameToSignalName(name);

            if (resolveSignal(this.controller, signalName)) {
                const handler = typeof newValue === "function" ? (newValue as SignalHandler) : undefined;
                signalStore.set(this, this.controller, signalName, handler);
            } else if (newValue !== undefined) {
                this.setProperty(name, newValue);
            }
        }

        if (newProps.ref !== oldProps?.ref && typeof newProps.ref === "function") {
            (newProps.ref as (controller: Gtk.EventController) => void)(this.controller);
        }
    }

    private setProperty(name: string, value: unknown): void {
        if (!this.controller) return;

        const propMeta = resolvePropMeta(this.controller, name);

        if (propMeta) {
            const [, setter] = propMeta;
            const setterFn = (this.controller as unknown as Record<string, (v: unknown) => void>)[setter];
            if (typeof setterFn === "function") {
                setterFn.call(this.controller, value);
            }
        }
    }
}

registerNodeClass(EventControllerNode);
