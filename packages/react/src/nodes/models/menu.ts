import { batch, getObjectId } from "@gtkx/ffi";
import * as Gio from "@gtkx/ffi/gio";
import type * as Gtk from "@gtkx/ffi/gtk";
import type { Node } from "../../node.js";
import { VirtualNode } from "../virtual.js";

export type MenuType = "root" | "item" | "section" | "submenu";

export type MenuProps = {
    id?: string;
    label?: string;
    accels?: string | string[];
    onActivate?: () => void;
};

export class Menu extends VirtualNode<MenuProps> {
    private actionMap?: Gio.ActionMap;
    private parent?: Gio.Menu;
    private menu: Gio.Menu;
    private type: MenuType;
    private application?: Gtk.Application;
    private action?: Gio.SimpleAction;
    private children: Menu[] = [];

    constructor(type: MenuType, application?: Gtk.Application) {
        super("", {}, undefined);
        this.type = type;
        this.application = application;
        this.menu = new Gio.Menu();
    }

    private getAccels(): string[] {
        const accels = this.props.accels;

        if (!accels) {
            return [];
        }

        return Array.isArray(accels) ? accels : [accels];
    }

    private getActionName(): string {
        return `${this.application ? "app" : "win"}.${this.props.id}`;
    }

    private getId(): string {
        if (!this.props.id) {
            throw new Error("Expected 'id' prop to be present on MenuItem");
        }

        return this.props.id;
    }

    private getParent(): Gio.Menu {
        if (!this.parent) {
            throw new Error("Expected parent menu to be set on MenuNode");
        }

        return this.parent;
    }

    private getActionMap(): Gio.ActionMap {
        if (!this.actionMap) {
            throw new Error("Expected ActionMap to be set on MenuNode");
        }

        return this.actionMap;
    }

    private createAction(): void {
        if (this.action) {
            this.signalStore.set(this.action, "activate", undefined);
        }

        this.action = new Gio.SimpleAction(this.getId());
        this.signalStore.set(this.action, "activate", this.props.onActivate);
        this.getActionMap().addAction(this.action);

        if (this.application && this.props.accels && this.props.accels.length > 0) {
            this.application.setAccelsForAction(this.getActionName(), this.getAccels());
        }
    }

    private removeAction(): void {
        if (this.application && this.props.accels && this.props.accels.length > 0) {
            this.application.setAccelsForAction(this.getActionName(), []);
        }

        if (this.action && this.actionMap) {
            this.actionMap.removeAction(this.getId());
            this.signalStore.set(this.action, "activate", undefined);
            this.action = undefined;
        }
    }

    private getPosition(): number {
        const parent = this.getParent();

        for (let i = 0; i < parent.getNItems(); i++) {
            if (this.type === "item") {
                const actionName = parent.getItemAttributeValue(i, "action")?.getString();

                if (actionName === this.getActionName()) {
                    return i;
                }
            } else {
                const link = parent.getItemLink(i, this.type);

                if (link && getObjectId(link.id) === getObjectId(this.menu.id)) {
                    return i;
                }
            }
        }

        throw new Error("Unable to find menu item in parent menu");
    }

    private setParent(parent: Gio.Menu | undefined): void {
        this.parent = parent;
    }

    public setActionMap(actionMap: Gio.ActionMap | undefined): void {
        if (this.action) {
            this.removeAction();
        }

        this.actionMap = actionMap;

        if (actionMap) {
            if (this.type === "item") {
                this.createAction();
            }

            for (const child of this.children) {
                child.setActionMap(actionMap);
            }
        }
    }

    public getMenu(): Gio.Menu {
        return this.menu;
    }

    public removeFromParent(): void {
        batch(() => {
            this.getParent().remove(this.getPosition());
        });
    }

    public insertInParentBefore(before: Menu): void {
        batch(() => {
            const parent = this.getParent();
            const beforePosition = before.getPosition();

            switch (this.type) {
                case "item": {
                    parent.insert(beforePosition, this.props.label, this.getActionName());
                    break;
                }
                case "section":
                    parent.insertSection(beforePosition, this.menu, this.props.label);
                    break;
                case "submenu":
                    parent.insertSubmenu(beforePosition, this.menu, this.props.label);
                    break;
            }
        });
    }

    public appendToParent(): void {
        batch(() => {
            const parent = this.getParent();

            switch (this.type) {
                case "item":
                    parent.append(this.props.label, this.getActionName());
                    break;
                case "section":
                    parent.appendSection(this.menu, this.props.label);
                    break;
                case "submenu":
                    parent.appendSubmenu(this.menu, this.props.label);
                    break;
            }
        });
    }

    public override appendChild(child: Node): void {
        if (!(child instanceof Menu)) {
            return;
        }

        this.children.push(child);
        child.setParent(this.menu);
        child.setActionMap(this.actionMap);
        child.appendToParent();
    }

    public override insertBefore(child: Node, before: Node): void {
        if (!(child instanceof Menu) || !(before instanceof Menu)) {
            return;
        }

        const beforeIndex = this.children.indexOf(before);
        if (beforeIndex !== -1) {
            this.children.splice(beforeIndex, 0, child);
        } else {
            this.children.push(child);
        }

        child.setParent(this.menu);
        child.setActionMap(this.actionMap);
        child.insertInParentBefore(before);
    }

    public override removeChild(child: Node): void {
        if (!(child instanceof Menu)) {
            return;
        }

        const index = this.children.indexOf(child);
        if (index !== -1) {
            this.children.splice(index, 1);
        }

        child.removeFromParent();
        child.setParent(undefined);
        child.setActionMap(undefined);
    }

    public override updateProps(oldProps: MenuProps | null, newProps: MenuProps): void {
        super.updateProps(oldProps, newProps);

        if (!this.actionMap) {
            return;
        }

        if (this.type === "item") {
            this.updateItemProps(oldProps, newProps);
        } else if (this.type === "section" || this.type === "submenu") {
            this.updateContainerProps(oldProps, newProps);
        }
    }

    private updateItemProps(oldProps: MenuProps | null, newProps: MenuProps): void {
        if (!this.action) {
            this.createAction();
            return;
        }

        if (!oldProps || oldProps.id !== newProps.id) {
            this.removeAction();
            this.removeFromParent();
            this.createAction();
            batch(() => {
                this.parent?.append(newProps.label, this.getActionName());
            });
            return;
        }

        if (!oldProps || oldProps.label !== newProps.label) {
            batch(() => {
                const position = this.getPosition();
                this.getParent().remove(position);
                this.parent?.insert(position, newProps.label, this.getActionName());
            });
        }

        if (!oldProps || oldProps.onActivate !== newProps.onActivate) {
            this.signalStore.set(this.action, "activate", newProps.onActivate);
        }

        if (!oldProps || oldProps.accels !== newProps.accels) {
            if (this.application) {
                this.application.setAccelsForAction(this.getActionName(), this.getAccels());
            }
        }
    }

    private updateContainerProps(oldProps: MenuProps | null, newProps: MenuProps): void {
        if (!oldProps || oldProps.label !== newProps.label) {
            batch(() => {
                const position = this.getPosition();
                this.getParent().remove(position);

                if (this.type === "section") {
                    this.parent?.insertSection(position, this.menu, newProps.label);
                } else if (this.type === "submenu") {
                    this.parent?.insertSubmenu(position, this.menu, newProps.label);
                }
            });
        }
    }

    public override unmount(): void {
        if (this.type === "item") {
            this.removeAction();
        }

        super.unmount();
    }
}
