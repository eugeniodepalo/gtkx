import type * as Gtk from "@gtkx/ffi/gtk";
import type { Props } from "../factory.js";
import { Node } from "../node.js";

export abstract class VirtualSlotNode<TContainer, TProps> extends Node<never> {
    protected override isVirtual(): boolean {
        return true;
    }

    protected childWidget: Gtk.Widget | null = null;
    protected parentContainer: (Node & TContainer) | null = null;
    private _slotProps: TProps | undefined;

    protected get slotProps(): TProps {
        if (this._slotProps === undefined) {
            throw new Error("slotProps accessed before initialization");
        }
        return this._slotProps;
    }

    protected set slotProps(value: TProps) {
        this._slotProps = value;
    }

    protected abstract isValidContainer(parent: Node): parent is Node & TContainer;
    protected abstract addToContainer(container: TContainer, child: Gtk.Widget, props: TProps): void;
    protected abstract insertBeforeInContainer(
        container: TContainer,
        child: Gtk.Widget,
        props: TProps,
        before: Gtk.Widget,
    ): void;
    protected abstract removeFromContainer(container: TContainer, child: Gtk.Widget): void;
    protected abstract updateInContainer(container: TContainer, child: Gtk.Widget, props: TProps): void;
    protected abstract extractSlotProps(props: Props): TProps;

    override initialize(props: Props): void {
        this.slotProps = this.extractSlotProps(props);
        super.initialize(props);
    }

    getChildWidget(): Gtk.Widget | null {
        return this.childWidget;
    }

    getSlotProps(): TProps {
        return this.slotProps;
    }

    setParentContainer(container: Node & TContainer): void {
        this.parentContainer = container;
    }

    getBeforeWidget(before: Node): Gtk.Widget | null {
        if (before instanceof VirtualSlotNode) {
            return before.getChildWidget();
        }
        return before.getWidget() ?? null;
    }

    override appendChild(child: Node): void {
        const childWidget = child.getWidget();
        if (childWidget) {
            this.childWidget = childWidget;
        }
    }

    override unmount(): void {
        this.parentContainer = null;
        super.unmount();
    }

    protected updateSlotPropsIfChanged(oldProps: Props, newProps: Props, propKeys: readonly string[]): boolean {
        const changed = propKeys.some((key) => oldProps[key] !== newProps[key]);

        if (changed) {
            this.slotProps = this.extractSlotProps(newProps);

            if (this.parentContainer && this.childWidget) {
                this.updateInContainer(this.parentContainer, this.childWidget, this.slotProps);
            }
        }

        return changed;
    }
}
