import * as gtk from "@gtkx/ffi/gtk";
import React from "react";
import Reconciler from "react-reconciler";
import {
	type Instance,
	type Props,
	type GtkWidget,
	isSlotContainer,
	isListItemContainer,
	isDialogContainer,
	isGtkWidget,
} from "./containers/types.js";
import { DialogContainerHandler } from "./containers/DialogContainerHandler.js";
import { SlotContainerHandler } from "./containers/SlotContainerHandler.js";
import { ListContainerHandler } from "./containers/ListContainerHandler.js";
import { WidgetFactory } from "./containers/WidgetFactory.js";

type Container = unknown;
type TextInstance = never;
type SuspenseInstance = never;
type HydratableInstance = never;
type PublicInstance = Instance;
type HostContext = Record<string, never>;
type ChildSet = never;
type TimeoutHandle = number;
type NoTimeout = -1;
type TransitionStatus = number;
type FormInstance = never;

export class GtkReconciler {
	private dialogHandler = new DialogContainerHandler();
	private slotHandler = new SlotContainerHandler();
	private listHandler = new ListContainerHandler();
	private widgetFactory = new WidgetFactory(gtk);
	private reconciler: Reconciler.Reconciler<Container, Instance, TextInstance, SuspenseInstance, FormInstance, PublicInstance>;

	constructor() {
		this.reconciler = Reconciler(this.createHostConfig());
	}

	setAppForRendering(app: unknown): void {
		this.widgetFactory.setApp(app);
	}

	getReconciler(): typeof this.reconciler {
		return this.reconciler;
	}

	private createHostConfig(): Reconciler.HostConfig<
		string,
		Props,
		Container,
		Instance,
		TextInstance,
		SuspenseInstance,
		HydratableInstance,
		FormInstance,
		PublicInstance,
		HostContext,
		ChildSet,
		TimeoutHandle,
		NoTimeout,
		TransitionStatus
	> {
		return {
			supportsMutation: true,
			supportsPersistence: false,
			supportsHydration: false,
			isPrimaryRenderer: true,
			noTimeout: -1 as NoTimeout,

			getRootHostContext: (): HostContext => ({}),
			getChildHostContext: (parentHostContext: HostContext): HostContext => parentHostContext,
			shouldSetTextContent: (): boolean => false,

			createInstance: (type: string, props: Props): Instance => this.createInstance(type, props),
			createTextInstance: (): TextInstance => {
				throw new Error("Text nodes are not supported. Use Label widget instead.");
			},

			appendInitialChild: (parent: Instance, child: Instance): void => this.appendChild(parent, child),
			finalizeInitialChildren: (): boolean => false,

			commitUpdate: (instance: Instance, _type: string, oldProps: Props, newProps: Props): void => {
				this.updateInstanceProps(instance, oldProps, newProps);
			},

			commitMount: (instance: Instance, _type: string, props: Props): void => {
				if (isDialogContainer(instance)) {
					this.dialogHandler.show(instance.dialog, instance.dialogType, props);
				}
			},

			appendChild: (parent: Instance, child: Instance): void => this.appendChild(parent, child),
			removeChild: (parent: Instance, child: Instance): void => this.removeChild(parent, child),
			insertBefore: (parent: Instance, child: Instance, beforeChild: Instance): void =>
				this.insertBefore(parent, child, beforeChild),

			removeChildFromContainer: (container: Container, child: Instance): void => {
				if (typeof container === "object" && container !== null) {
					this.removeChild(container as Instance, child);
				}
			},

			appendChildToContainer: (container: Container, child: Instance): void => {
				if (typeof container === "object" && container !== null) {
					this.appendChild(container as Instance, child);
				} else {
					if (isDialogContainer(child)) {
						return;
					}
					if (isGtkWidget(child) && typeof child.present === "function") {
						(child.present as () => void)();
					}
				}
			},

			insertInContainerBefore: (): void => {},
			prepareForCommit: (): null => null,
			resetAfterCommit: (): void => {},
			commitTextUpdate: (): void => {
				throw new Error("Text nodes are not supported");
			},
			clearContainer: (): void => {},
			preparePortalMount: (): void => {},

			scheduleTimeout: (fn: (...args: unknown[]) => unknown, delay?: number): TimeoutHandle => {
				const timeoutId = setTimeout(fn, delay ?? 0);
				return typeof timeoutId === "number" ? timeoutId : Number(timeoutId);
			},

			cancelTimeout: (id: TimeoutHandle): void => {
				clearTimeout(id);
			},

			getPublicInstance: (instance: Instance | TextInstance): PublicInstance => instance as PublicInstance,
			getCurrentUpdatePriority: () => 2,
			setCurrentUpdatePriority: (): void => {},
			resolveUpdatePriority: () => 2,
			NotPendingTransition: null,
			HostTransitionContext: this.createReconcilerContext<TransitionStatus>(0),
			getInstanceFromNode: () => null,
			beforeActiveInstanceBlur: () => {},
			afterActiveInstanceBlur: () => {},
			prepareScopeUpdate: () => {},
			getInstanceFromScope: () => null,
			detachDeletedInstance: () => {},
			resetFormInstance: (): void => {},
			requestPostPaintCallback: (): void => {},
			shouldAttemptEagerTransition: () => false,
			trackSchedulerEvent: (): void => {},
			resolveEventType: (): null | string => null,
			resolveEventTimeStamp: (): number => Date.now(),
			maySuspendCommit: (): boolean => false,
			preloadInstance: (): boolean => false,
			startSuspendingCommit: (): void => {},
			suspendInstance: (): void => {},
			waitForCommitToBeReady: (): null => null,
		};
	}

	private createReconcilerContext<T>(value: T): Reconciler.ReactContext<T> {
		const context = React.createContext<T>(value);
		return context as unknown as Reconciler.ReactContext<T>;
	}

	private createInstance(type: string, props: Props): Instance {
		let normalizedType = type;
		if (type.endsWith(".Root")) {
			normalizedType = type.slice(0, -5);
		}

		const listItemInfo = this.listHandler.parseListItemType(type);
		if (listItemInfo) {
			return this.listHandler.createContainer(listItemInfo.parentType, props.item);
		}

		const slotInfo = this.slotHandler.parseSlotType(type);
		if (slotInfo) {
			return this.slotHandler.createContainer(slotInfo.parentType, slotInfo.slotName);
		}

		const DialogClass = this.widgetFactory.getDialogClass(normalizedType);
		if (DialogClass) {
			const dialog = new DialogClass();
			return this.dialogHandler.createContainer(normalizedType, dialog, props);
		}

		const instance = this.widgetFactory.createWidget(normalizedType, props);

		const propsToApply = { ...props };
		if (type === "Button" && props.label) delete propsToApply.label;
		if (type === "Label" && props.label) delete propsToApply.label;

		this.updateInstanceProps(instance, {}, propsToApply);

		return instance;
	}

	private updateInstanceProps(instance: Instance, oldProps: Props, newProps: Props): void {
		if (isSlotContainer(instance) || isListItemContainer(instance)) {
			return;
		}

		if (isDialogContainer(instance)) {
			this.dialogHandler.updateProps(instance.dialog, oldProps, newProps);
			return;
		}

		if (newProps.itemFactory && typeof newProps.itemFactory === "function") {
			if (!oldProps.itemFactory || oldProps.itemFactory !== newProps.itemFactory) {
				this.listHandler.setupItemFactory(
					instance,
					newProps.itemFactory as (item: unknown) => GtkWidget
				);
			}
		}

		const allKeys = new Set([...Object.keys(oldProps), ...Object.keys(newProps)]);

		for (const key of allKeys) {
			if (key === "children" || key === "orientation" || key === "spacing" || key === "application" || key === "itemFactory") {
				continue;
			}

			const oldValue = oldProps[key];
			const newValue = newProps[key];

			if (oldValue === newValue) {
				continue;
			}

			if (key.startsWith("on") && typeof newValue === "function") {
				const eventName = key
					.slice(2)
					.replace(/([A-Z])/g, "-$1")
					.toLowerCase()
					.replace(/^-/, "");
				if (instance.connect) {
					(instance.connect as (signal: string, handler: unknown) => void)(eventName, newValue);
				}
				continue;
			}

			const setterName = `set${key.charAt(0).toUpperCase()}${key.slice(1)}`;
			if (typeof instance[setterName] === "function") {
				(instance[setterName] as (value: unknown) => void)(newValue);
			}
		}
	}

	private appendChild(parent: Instance, child: Instance): void {
		if (isDialogContainer(child)) {
			return;
		}

		if (isSlotContainer(parent)) {
			if (isGtkWidget(child)) {
				parent.child = child;
			} else {
				throw new Error("Slot containers can only contain GTK widgets");
			}
			return;
		}

		if (isSlotContainer(child)) {
			if (!isGtkWidget(parent)) {
				throw new Error("Cannot add slot to non-widget parent");
			}
			this.slotHandler.appendChild(parent, child);
			return;
		}

		if (isListItemContainer(child)) {
			if (!isGtkWidget(parent)) {
				throw new Error("Cannot add list item to non-widget parent");
			}
			this.listHandler.appendChild(parent, child);
			return;
		}

		if (!isGtkWidget(parent) || !isGtkWidget(child)) {
			return;
		}

		const childPtr = child.ptr;

		if (typeof parent.setChild === "function") {
			(parent.setChild as (ptr: unknown) => void)(childPtr);
		} else if (typeof parent.append === "function") {
			(parent.append as (ptr: unknown) => void)(childPtr);
		} else if (typeof parent.add === "function") {
			(parent.add as (ptr: unknown) => void)(childPtr);
		} else {
			console.warn(`Cannot append child to ${parent.constructor.name}`);
		}
	}

	private removeChild(parent: Instance, child: Instance): void {
		if (isDialogContainer(child)) {
			return;
		}

		if (isSlotContainer(parent)) {
			parent.child = null;
			return;
		}

		if (isSlotContainer(child)) {
			if (!isGtkWidget(parent)) {
				return;
			}
			this.slotHandler.removeChild(parent, child);
			return;
		}

		if (isListItemContainer(child)) {
			if (!isGtkWidget(parent)) {
				return;
			}
			this.listHandler.removeChild(parent, child);
			return;
		}

		if (!isGtkWidget(parent) || !isGtkWidget(child)) {
			return;
		}

		const childPtr = child.ptr;

		if (typeof parent.remove === "function") {
			(parent.remove as (ptr: unknown) => void)(childPtr);
		} else if (typeof parent.setChild === "function") {
			(parent.setChild as (ptr: null) => void)(null);
		}
	}

	private insertBefore(parent: Instance, child: Instance, beforeChild: Instance): void {
		if (isDialogContainer(child)) {
			return;
		}

		if (isSlotContainer(parent) || isSlotContainer(child)) {
			this.appendChild(parent, child);
			return;
		}

		if (isListItemContainer(child) && isGtkWidget(parent)) {
			if (isListItemContainer(beforeChild)) {
				this.listHandler.insertBefore(parent, child, beforeChild);
				return;
			}
			this.listHandler.appendChild(parent, child);
			return;
		}

		if (!isGtkWidget(parent) || !isGtkWidget(child) || !isGtkWidget(beforeChild)) {
			this.appendChild(parent, child);
			return;
		}

		const childPtr = child.ptr;
		const beforePtr = beforeChild.ptr;

		if (typeof parent.insertChildAfter === "function") {
			(parent.insertChildAfter as (c: unknown, b: unknown) => void)(childPtr, beforePtr);
		} else {
			this.appendChild(parent, child);
		}
	}
}

const gtkReconciler = new GtkReconciler();

export const reconciler = gtkReconciler.getReconciler();
export const setAppForRendering = (app: unknown): void => gtkReconciler.setAppForRendering(app);
