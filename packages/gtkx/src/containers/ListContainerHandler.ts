import * as gtk from "@gtkx/ffi/gtk";
import { StringListJS } from "@gtkx/ffi";
import type { ListItemContainer, GtkWidget } from "./types.js";

export type ItemFactoryFunction<T> = (item: T | null) => GtkWidget;

export class ListContainerHandler {
	private listStores = new WeakMap<GtkWidget, StringListJS<unknown>>();
	private selectionModels = new WeakMap<GtkWidget, gtk.SingleSelection>();
	private itemFactories = new WeakMap<GtkWidget, ItemFactoryFunction<unknown>>();

	parseListItemType(type: string): { parentType: string } | null {
		if (!type.includes(".")) return null;
		const [parentType, itemType] = type.split(".");
		if (itemType !== "Item") return null;

		return { parentType };
	}

	createContainer<T>(parentType: string, item: T): ListItemContainer<T> {
		return {
			_isListItemContainer: true,
			parentType,
			item,
		};
	}

	getOrCreateListStore<T>(widget: GtkWidget): StringListJS<T> {
		let store = this.listStores.get(widget) as StringListJS<T> | undefined;
		if (!store) {
			store = new StringListJS<T>();
			this.listStores.set(widget, store as StringListJS<unknown>);
		}
		return store;
	}

	getOrCreateSelectionModel(widget: GtkWidget, store: StringListJS<unknown>): gtk.SingleSelection {
		let selectionModel = this.selectionModels.get(widget);
		if (!selectionModel) {
			selectionModel = new gtk.SingleSelection(store.getStorePtr());
			this.selectionModels.set(widget, selectionModel);
		}
		return selectionModel;
	}

	setupItemFactory<T>(
		widget: GtkWidget,
		factory: ItemFactoryFunction<T>
	): void {
		this.itemFactories.set(widget, factory as ItemFactoryFunction<unknown>);

		const signalFactory = new gtk.SignalListItemFactory();

		signalFactory.connect("setup", (...args: unknown[]) => {
			const listItemPtr = args[1];
			const childWidget = factory(null);
			gtk.ListItem.prototype.setChild.call({ ptr: listItemPtr }, childWidget.ptr);
		});

		signalFactory.connect("bind", () => {});

		signalFactory.connect("unbind", () => {});
		signalFactory.connect("teardown", () => {});

		if (typeof widget.setFactory === "function") {
			(widget.setFactory as (ptr: unknown) => void)(signalFactory.ptr);
		}

		const store = this.getOrCreateListStore(widget);
		const selectionModel = this.getOrCreateSelectionModel(widget, store);
		if (typeof widget.setModel === "function") {
			(widget.setModel as (ptr: unknown) => void)(selectionModel.ptr);
		}
	}

	appendChild(parent: GtkWidget, child: ListItemContainer): void {
		const store = this.getOrCreateListStore(parent);
		store.append(child.item);
	}

	removeChild(parent: GtkWidget, child: ListItemContainer): void {
		const store = this.listStores.get(parent);
		if (store) {
			const position = store.findItem(child.item);
			if (position !== -1) {
				store.remove(position);
			}
		}
	}

	insertBefore(parent: GtkWidget, child: ListItemContainer, beforeChild: ListItemContainer): void {
		const store = this.getOrCreateListStore(parent);
		const beforePosition = store.findItem(beforeChild.item);
		if (beforePosition !== -1) {
			store.insert(beforePosition, child.item);
		} else {
			store.append(child.item);
		}
	}
}
