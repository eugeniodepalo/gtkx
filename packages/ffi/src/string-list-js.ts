import { StringList } from "./generated/gtk/string-list.js";

export class StringListJS<T> {
	private store: StringList;
	private itemMap = new Map<string, T>();
	private itemList: T[] = [];
	private idCounter = 0;

	constructor() {
		this.store = new StringList([]);
	}

	private generateId(): string {
		return `item_${this.idCounter++}`;
	}

	getStorePtr(): unknown {
		return this.store.ptr;
	}

	append(item: T): void {
		const id = this.generateId();
		this.itemMap.set(id, item);
		this.store.append(id);
		this.itemList.push(item);
	}

	insert(position: number, item: T): void {
		const id = this.generateId();
		this.itemMap.set(id, item);
		this.store.splice(position, 0, [id]);
		this.itemList.splice(position, 0, item);
	}

	remove(position: number): void {
		const id = this.store.getString(position);
		this.itemMap.delete(id);
		this.store.remove(position);
		this.itemList.splice(position, 1);
	}

	removeAll(): void {
		const count = this.itemList.length;
		if (count > 0) {
			this.store.splice(0, count, []);
		}
		this.itemMap.clear();
		this.itemList = [];
	}

	getItemById(id: string): T | undefined {
		return this.itemMap.get(id);
	}

	getItemAt(position: number): T | undefined {
		return this.itemList[position];
	}

	findItem(item: T): number {
		return this.itemList.indexOf(item);
	}

	get length(): number {
		return this.itemList.length;
	}
}
