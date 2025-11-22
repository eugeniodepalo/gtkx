import type * as gtk from "@gtkx/ffi/gtk";
import type { GtkWidget, Props } from "./types.js";

export class WidgetFactory {
	private widgetClasses: Record<string, unknown> = {};
	private dialogClasses: Record<string, unknown> = {};
	private currentApp: unknown = null;

	constructor(private gtkModule: typeof gtk) {
		this.buildWidgetClasses();
		this.buildDialogClasses();
	}

	setApp(app: unknown): void {
		this.currentApp = app;
	}

	private buildWidgetClasses(): void {
		const Widget = (this.gtkModule as Record<string, unknown>).Widget;

		for (const [name, value] of Object.entries(this.gtkModule)) {
			if (
				typeof value === "function" &&
				value.prototype &&
				Widget &&
				(value.prototype instanceof (Widget as new () => unknown) || value === Widget)
			) {
				this.widgetClasses[name] = value;
			}
		}
	}

	private buildDialogClasses(): void {
		const dialogTypes = ["AlertDialog", "ColorDialog", "FileDialog", "FontDialog", "PrintDialog"];

		for (const dialogType of dialogTypes) {
			const dialogClass = (this.gtkModule as Record<string, unknown>)[dialogType];
			if (dialogClass) {
				this.dialogClasses[dialogType] = dialogClass;
			}
		}
	}

	getDialogClass(type: string): (new () => GtkWidget) | null {
		const DialogClass = this.dialogClasses[type];
		return DialogClass ? (DialogClass as new () => GtkWidget) : null;
	}

	createWidget(type: string, props: Props): GtkWidget {
		const WidgetClass = this.widgetClasses[type] as (new (...args: unknown[]) => GtkWidget) | undefined;
		if (!WidgetClass) {
			throw new Error(`Unknown widget type: ${type}`);
		}

		if (type === "ApplicationWindow") {
			return new WidgetClass(this.currentApp);
		}

		if (type === "Box") {
			const Orientation = (this.gtkModule as Record<string, unknown>).Orientation as Record<string, number>;
			const spacing = (props.spacing as number) ?? 0;
			const orientation = (props.orientation as number) ?? Orientation.VERTICAL;
			return new WidgetClass(orientation, spacing);
		}

		if (type === "Separator") {
			const Orientation = (this.gtkModule as Record<string, unknown>).Orientation as Record<string, number>;
			const orientation = (props.orientation as number) ?? Orientation.HORIZONTAL;
			return new WidgetClass(orientation);
		}

		if (type === "ListView") {
			return new WidgetClass();
		}

		if (type === "Button" && typeof props.label === "string") {
			const buttonClass = WidgetClass as { newWithLabel?: (label: string) => GtkWidget };
			if (typeof buttonClass.newWithLabel === "function") {
				return buttonClass.newWithLabel(String(props.label));
			}
		}

		if (type === "Label" && typeof props.label === "string") {
			return new WidgetClass(String(props.label));
		}

		return new WidgetClass();
	}
}
