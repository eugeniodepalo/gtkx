import type * as gtk from "@gtkx/ffi/gtk";

export interface GtkWidget {
	ptr: unknown;
	setChild?: (ptr: unknown) => void;
	append?: (ptr: unknown) => void;
	add?: (ptr: unknown) => void;
	remove?: (ptr: unknown) => void;
	insertChildAfter?: (childPtr: unknown, beforePtr: unknown) => void;
	connect?: (signal: string, handler: unknown) => void;
	present?: () => void;
	constructor: { name: string };
	[key: string]: unknown;
}

export interface SlotContainer {
	_isSlotContainer: true;
	parentType: string;
	slotName: string;
	propertyName: string;
	child: GtkWidget | null;
}

export interface ListItemContainer<T = unknown> {
	_isListItemContainer: true;
	parentType: string;
	item: T;
}

export interface DialogContainer {
	_isDialogContainer: true;
	dialogType: string;
	dialog: GtkWidget;
}

export type Instance = GtkWidget | SlotContainer | ListItemContainer | DialogContainer;

export type Props = Record<string, unknown>;

export function isSlotContainer(instance: Instance): instance is SlotContainer {
	return (instance as SlotContainer)._isSlotContainer === true;
}

export function isListItemContainer(instance: Instance): instance is ListItemContainer {
	return (instance as ListItemContainer)._isListItemContainer === true;
}

export function isDialogContainer(instance: Instance): instance is DialogContainer {
	return (instance as DialogContainer)._isDialogContainer === true;
}

export function isGtkWidget(instance: Instance): instance is GtkWidget {
	return !isSlotContainer(instance) && !isListItemContainer(instance) && !isDialogContainer(instance);
}
