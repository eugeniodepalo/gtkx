import { wrapPtr } from "@gtkx/ffi";
import type * as Gio from "@gtkx/ffi/gio";
import * as Gtk from "@gtkx/ffi/gtk";
import type { Props } from "../factory.js";
import { Node } from "../node.js";

const LIST_WIDGETS = ["ListView", "ColumnView", "GridView"];

type RenderItemFn = (item: unknown) => Gtk.Widget;

export class ListViewNode extends Node<Gtk.ListView> {
    static matches(type: string): boolean {
        return LIST_WIDGETS.map((w) => `${w}.Root`).includes(type);
    }

    private stringList: Gtk.StringList;
    private selectionModel: Gtk.SingleSelection;
    private factory: Gtk.SignalListItemFactory;
    private items: unknown[] = [];
    private renderItem: RenderItemFn | null = null;
    private factorySignalHandlers = new Map<string, number>();

    constructor(type: string, props: Props, app: Gtk.Application) {
        super(type, props, app);

        this.stringList = new Gtk.StringList([]);
        this.selectionModel = new Gtk.SingleSelection(this.stringList as unknown as Gio.ListModel);
        this.factory = new Gtk.SignalListItemFactory();
        this.renderItem = props.renderItem as RenderItemFn | null;

        const setupHandlerId = this.factory.connect("setup", (_self, listItemObj) => {
            const listItem = wrapPtr(listItemObj, Gtk.ListItem);

            if (this.renderItem) {
                const widget = this.renderItem(null);
                listItem.setChild(widget);
            }
        });

        this.factorySignalHandlers.set("setup", setupHandlerId);

        const bindHandlerId = this.factory.connect("bind", (_self, listItemObj) => {
            const listItem = wrapPtr(listItemObj, Gtk.ListItem);
            const position = listItem.getPosition();
            const item = this.items[position];

            if (this.renderItem && item !== undefined) {
                const widget = this.renderItem(item);
                listItem.setChild(widget);
            }
        });

        this.factorySignalHandlers.set("bind", bindHandlerId);
        this.widget.setModel(this.selectionModel);
        this.widget.setFactory(this.factory);
    }

    addItem(item: unknown): void {
        this.items.push(item);
        this.stringList.append("");
    }

    removeItem(item: unknown): void {
        const index = this.items.indexOf(item);

        if (index !== -1) {
            this.items.splice(index, 1);
            this.stringList.remove(index);
        }
    }

    protected override consumedProps(): Set<string> {
        const consumed = super.consumedProps();
        consumed.add("renderItem");
        return consumed;
    }

    override updateProps(oldProps: Props, newProps: Props): void {
        if (oldProps.renderItem !== newProps.renderItem) {
            this.renderItem = newProps.renderItem as RenderItemFn | null;
        }

        super.updateProps(oldProps, newProps);
    }

    override dispose(app: Gtk.Application): void {
        super.dispose(app);
        this.widget.setModel(undefined);
        this.widget.setFactory(undefined);
    }
}

export class ListItemNode extends Node {
    static matches(type: string): boolean {
        const dotIndex = type.indexOf(".");
        if (dotIndex === -1) return false;
        const widgetType = type.slice(0, dotIndex);
        const suffix = type.slice(dotIndex + 1);
        return suffix === "Item" && LIST_WIDGETS.includes(widgetType);
    }

    protected override isVirtual(): boolean {
        return true;
    }

    private item: unknown;

    constructor(type: string, props: Props, app: Gtk.Application) {
        super(type, props, app);
        this.item = props.item as unknown;
    }

    getItem(): unknown {
        return this.item;
    }

    override attachToParent(parent: Node): void {
        if (parent instanceof ListViewNode) {
            parent.addItem(this.item);
        }
    }

    override detachFromParent(parent: Node): void {
        if (parent instanceof ListViewNode) {
            parent.removeItem(this.item);
        }
    }
}
