import type { DialogContainer, Props, GtkWidget } from "./types.js";

export class DialogContainerHandler {
	private dialogPropsMap = new WeakMap<GtkWidget, Props>();

	createContainer(dialogType: string, dialog: GtkWidget, props: Props): DialogContainer {
		this.updateProps(dialog, {}, props);
		return {
			_isDialogContainer: true,
			dialogType,
			dialog,
		};
	}

	updateProps(dialog: GtkWidget, oldProps: Props, newProps: Props): void {
		this.dialogPropsMap.set(dialog, newProps);

		const allKeys = new Set([...Object.keys(oldProps), ...Object.keys(newProps)]);

		for (const key of allKeys) {
			if (key === "children" || key === "mode" || key === "parent") {
				continue;
			}

			const oldValue = oldProps[key];
			const newValue = newProps[key];

			if (oldValue === newValue) {
				continue;
			}

			if (key.startsWith("on") && typeof newValue === "function") {
				continue;
			}

			const setterName = `set${key.charAt(0).toUpperCase()}${key.slice(1)}`;
			if (typeof dialog[setterName] === "function") {
				(dialog[setterName] as (value: unknown) => void)(newValue);
			}
		}
	}

	show(dialog: GtkWidget, dialogType: string, props: Props, parentWindow?: unknown): void {
		const mode = props.mode as string | undefined;

		if (dialogType === "FileDialog") {
			if (mode === "open" || !mode) {
				if (typeof dialog.open === "function") {
					(dialog.open as (p: unknown, n1: null, n2: null, n3: null) => void)(parentWindow, null, null, null);
				}
			} else if (mode === "save") {
				if (typeof dialog.save === "function") {
					(dialog.save as (p: unknown, n1: null, n2: null, n3: null) => void)(parentWindow, null, null, null);
				}
			} else if (mode === "selectFolder") {
				if (typeof dialog.selectFolder === "function") {
					(dialog.selectFolder as (p: unknown, n1: null, n2: null, n3: null) => void)(parentWindow, null, null, null);
				}
			} else if (mode === "openMultiple") {
				if (typeof dialog.openMultiple === "function") {
					(dialog.openMultiple as (p: unknown, n1: null, n2: null, n3: null) => void)(parentWindow, null, null, null);
				}
			}
		}
	}
}
