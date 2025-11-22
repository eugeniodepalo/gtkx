import { format } from "prettier";
import type {
	GirClass,
	GirNamespace,
	GirParameter,
	GirProperty,
	GirSignal,
} from "@gtkx/gir";
import type { TypeMapper } from "@gtkx/ffi/codegen";

export interface JsxGeneratorOptions {
	prettierConfig?: unknown;
}

export interface WidgetChildInfo {
	propertyName: string;
	slotName: string; // e.g., "StartWidget" for startWidget property
}

export interface ContainerMetadata {
	supportsMultipleChildren: boolean; // has append() method
	supportsSingleChild: boolean; // has setChild() method
	namedChildSlots: WidgetChildInfo[]; // properties that accept Gtk.Widget
}

export class JsxGenerator {
	constructor(
		private typeMapper: TypeMapper,
		private options: JsxGeneratorOptions = {},
	) {}

	async generate(
		namespace: GirNamespace,
		classMap: Map<string, GirClass>,
	): Promise<string> {
		// Find all widgets (classes that inherit from Widget)
		const widgets = this.findWidgets(namespace, classMap);

		// Find all dialogs (classes ending with "Dialog" that don't inherit from Widget)
		const dialogs = this.findDialogs(namespace, classMap, widgets);

		let code = `import type { ReactNode } from "react";\n`;
		code += `import type { Ref } from "react";\n`;
		code += `import type * as Gtk from "@gtkx/ffi/gtk";\n\n`;

		// Generate container metadata type
		code += `// Metadata about how widgets handle children\n`;
		code += `export interface WidgetChildInfo {\n`;
		code += `\tpropertyName: string;\n`;
		code += `\tslotName: string;\n`;
		code += `}\n\n`;
		code += `export interface ContainerMetadata {\n`;
		code += `\tsupportsMultipleChildren: boolean;\n`;
		code += `\tsupportsSingleChild: boolean;\n`;
		code += `\tnamedChildSlots: WidgetChildInfo[];\n`;
		code += `}\n\n`;

		code += `// Common widget props that all GTK widgets share\n`;
		code += `interface WidgetProps {\n`;
		code += `\t// Layout properties\n`;
		code += `\thalign?: "fill" | "start" | "end" | "center" | "baseline";\n`;
		code += `\tvalign?: "fill" | "start" | "end" | "center" | "baseline";\n`;
		code += `\thexpand?: boolean;\n`;
		code += `\tvexpand?: boolean;\n`;
		code += `\tmarginStart?: number;\n`;
		code += `\tmarginEnd?: number;\n`;
		code += `\tmarginTop?: number;\n`;
		code += `\tmarginBottom?: number;\n`;
		code += `\twidthRequest?: number;\n`;
		code += `\theightRequest?: number;\n`;
		code += `\n`;
		code += `\t// Visual properties\n`;
		code += `\tvisible?: boolean;\n`;
		code += `\tsensitive?: boolean;\n`;
		code += `\tcanFocus?: boolean;\n`;
		code += `\tcanTarget?: boolean;\n`;
		code += `\tfocusOnClick?: boolean;\n`;
		code += `\topacity?: number;\n`;
		code += `\n`;
		code += `\t// CSS\n`;
		code += `\tcssClasses?: string[];\n`;
		code += `\n`;
		code += `\t// Tooltip\n`;
		code += `\ttooltipText?: string;\n`;
		code += `\ttooltipMarkup?: string;\n`;
		code += `\n`;
		code += `\t// Common signals\n`;
		code += `\tonDestroy?: () => void;\n`;
		code += `\tonShow?: () => void;\n`;
		code += `\tonHide?: () => void;\n`;
		code += `\tonMap?: () => void;\n`;
		code += `\tonUnmap?: () => void;\n`;
		code += `\n`;
		code += `\tchildren?: ReactNode;\n`;
		code += `}\n\n`;

		// Build container metadata for all widgets
		const containerMetadata = new Map<string, ContainerMetadata>();
		for (const widget of widgets) {
			const metadata = this.analyzeContainerCapabilities(widget, classMap);
			containerMetadata.set(widget.name, metadata);
		}

		// Generate prop interfaces for each widget (skip Widget itself)
		for (const widget of widgets) {
			if (widget.name === "Widget") {
				continue; // WidgetProps is already defined above
			}
			const metadata = containerMetadata.get(widget.name)!;
			const propsInterface = this.generateWidgetProps(widget, metadata);
			code += propsInterface;
			code += `\n`;

			// Generate nested child slot interfaces
			if (metadata.namedChildSlots.length > 0) {
				for (const slot of metadata.namedChildSlots) {
					const widgetName = this.toPascalCase(widget.name);
					const slotInterface = `interface ${widgetName}_${slot.slotName}_Props {\n`;
					code += slotInterface;
					code += `\tchildren?: ReactNode;\n`;
					code += `}\n\n`;
				}
			}

			// Generate Item interface for list widgets
			if (this.isListWidget(widget.name)) {
				const widgetName = this.toPascalCase(widget.name);
				code += `interface ${widgetName}_Item_Props<T> {\n`;
				code += `\titem: T;\n`;
				code += `}\n\n`;
			}
		}

		// Generate prop interfaces for dialogs
		code += `// Dialog props (for non-widget dialogs like FileDialog)\n`;
		for (const dialog of dialogs) {
			const dialogName = this.toPascalCase(dialog.name);
			const propsInterface = this.generateDialogProps(dialog);
			code += propsInterface;
			code += `\n`;
		}

		// Generate exports for widget names
		code += `// Export widgets as JSX element types\n`;
		code += `// Widgets with multiple named child slots are exported as objects with .Root property\n`;
		code += `// Widgets with only a single 'Child' slot are exported as simple string constants\n`;
		for (const widget of widgets) {
			const widgetName = this.toPascalCase(widget.name);
			const metadata = containerMetadata.get(widget.name)!;

			// Check if widget has meaningful named slots (not just a single "Child" slot)
			const nonChildSlots = metadata.namedChildSlots.filter(
				(slot) => slot.slotName !== "Child",
			);
			const hasOnlyChildSlot =
				metadata.namedChildSlots.length === 1 &&
				metadata.namedChildSlots[0].slotName === "Child";
			const hasMeaningfulSlots = nonChildSlots.length > 0 || this.isListWidget(widget.name);

			// If widget has meaningful named child slots or is a list widget, export as object with Root
			if (hasMeaningfulSlots) {
				code += `export const ${widgetName} = {\n`;

				// Add Root property for the widget itself
				code += `\tRoot: "${widgetName}" as any,\n`;

				// Add named child slots as properties
				for (const slot of metadata.namedChildSlots) {
					code += `\t${slot.slotName}: "${widgetName}.${slot.slotName}" as any,\n`;
				}

				// Add Item property for list widgets
				if (this.isListWidget(widget.name)) {
					code += `\tItem: "${widgetName}.Item" as any,\n`;
				}

				code += `};\n`;
			} else {
				// Simple string export for widgets without meaningful slots, typed as any to allow JSX usage
				code += `export const ${widgetName}: any = "${widgetName}";\n`;
			}
		}

		// Export dialog names
		for (const dialog of dialogs) {
			const dialogName = this.toPascalCase(dialog.name);
			code += `export const ${dialogName}: any = "${dialogName}";\n`;
		}
		code += `\n`;

		// Generate JSX namespace declarations (skip Widget - it's not a JSX element)
		code += `// Declare JSX intrinsic elements\n`;
		code += `declare module "react" {\n`;
		code += `\tnamespace JSX {\n`;
		code += `\t\tinterface IntrinsicElements {\n`;
		for (const widget of widgets) {
			if (widget.name === "Widget") {
				continue; // Widget is not a JSX element
			}
			const widgetName = this.toPascalCase(widget.name);
			const propsName = `${widgetName}Props`;
			const metadata = containerMetadata.get(widget.name)!;

			// Check if widget has meaningful named slots (not just a single "Child" slot)
			const nonChildSlots = metadata.namedChildSlots.filter(
				(slot) => slot.slotName !== "Child",
			);
			const hasMeaningfulSlots = nonChildSlots.length > 0 || this.isListWidget(widget.name);

			// For widgets with meaningful named child slots or list items, they're exported as objects
			// so we need to add .Root to IntrinsicElements instead of the widget name directly
			if (hasMeaningfulSlots) {
				const rootElementName = `${widgetName}.Root`;
				code += `\t\t\t"${rootElementName}": ${propsName};\n`;
			} else {
				code += `\t\t\t${widgetName}: ${propsName};\n`;
			}

			// Add nested child slot elements
			for (const slot of metadata.namedChildSlots) {
				const slotElementName = `${widgetName}.${slot.slotName}`;
				const slotPropsName = `${widgetName}_${slot.slotName}_Props`;
				code += `\t\t\t"${slotElementName}": ${slotPropsName};\n`;
			}

			// Add Item element for list widgets
			if (this.isListWidget(widget.name)) {
				const itemElementName = `${widgetName}.Item`;
				const itemPropsName = `${widgetName}_Item_Props<any>`;
				code += `\t\t\t"${itemElementName}": ${itemPropsName};\n`;
			}
		}

		// Add dialog elements
		for (const dialog of dialogs) {
			const dialogName = this.toPascalCase(dialog.name);
			const propsName = `${dialogName}Props`;
			code += `\t\t\t${dialogName}: ${propsName};\n`;
		}

		code += `\t\t}\n`;
		code += `\t}\n`;
		code += `}\n`;
		code += `\n`;

		// Export container metadata
		code += `// Container metadata for use by reconciler\n`;
		code += `export const CONTAINER_METADATA: Record<string, ContainerMetadata> = {\n`;
		for (const widget of widgets) {
			const widgetName = this.toPascalCase(widget.name);
			const metadata = containerMetadata.get(widget.name)!;
			code += `\t${widgetName}: {\n`;
			code += `\t\tsupportsMultipleChildren: ${metadata.supportsMultipleChildren},\n`;
			code += `\t\tsupportsSingleChild: ${metadata.supportsSingleChild},\n`;
			code += `\t\tnamedChildSlots: [\n`;
			for (const slot of metadata.namedChildSlots) {
				code += `\t\t\t{ propertyName: "${slot.propertyName}", slotName: "${slot.slotName}" },\n`;
			}
			code += `\t\t],\n`;
			code += `\t},\n`;
		}
		code += `};\n\n`;

		code += `export {};\n`;

		return this.formatCode(code);
	}

	private findWidgets(
		namespace: GirNamespace,
		classMap: Map<string, GirClass>,
	): GirClass[] {
		const widgets: GirClass[] = [];
		const widgetCache = new Map<string, boolean>();

		const isWidget = (className: string): boolean => {
			// Check cache first
			if (widgetCache.has(className)) {
				return Boolean(widgetCache.get(className));
			}

			const cls = classMap.get(className);
			if (!cls) {
				widgetCache.set(className, false);
				return false;
			}

			// Widget is the base class - include it
			if (cls.name === "Widget") {
				widgetCache.set(className, true);
				return true;
			}

			// Check parent recursively
			if (cls.parent) {
				const result = isWidget(cls.parent);
				widgetCache.set(className, result);
				return result;
			}

			widgetCache.set(className, false);
			return false;
		};

		for (const cls of namespace.classes) {
			if (isWidget(cls.name)) {
				widgets.push(cls);
			}
		}

		// Sort widgets to ensure parent classes come before children
		// This ensures WindowProps is generated before ApplicationWindowProps
		widgets.sort((a, b) => {
			// Widget should come first
			if (a.name === "Widget") return -1;
			if (b.name === "Widget") return 1;
			// Window should come before ApplicationWindow
			if (a.name === "Window") return -1;
			if (b.name === "Window") return 1;
			// Otherwise alphabetical
			return a.name.localeCompare(b.name);
		});

		return widgets;
	}

	private findDialogs(
		namespace: GirNamespace,
		classMap: Map<string, GirClass>,
		widgets: GirClass[],
	): GirClass[] {
		const dialogs: GirClass[] = [];
		const widgetNames = new Set(widgets.map((w) => w.name));

		// Find classes that end with "Dialog" and are not widgets
		for (const cls of namespace.classes) {
			if (
				cls.name.endsWith("Dialog") &&
				!widgetNames.has(cls.name) &&
				cls.name !== "Dialog" // Exclude the base Dialog class if it exists
			) {
				dialogs.push(cls);
			}
		}

		// Sort dialogs alphabetically
		dialogs.sort((a, b) => a.name.localeCompare(b.name));

		return dialogs;
	}

	private analyzeContainerCapabilities(
		widget: GirClass,
		classMap: Map<string, GirClass>,
	): ContainerMetadata {
		const metadata: ContainerMetadata = {
			supportsMultipleChildren: false,
			supportsSingleChild: false,
			namedChildSlots: [],
		};

		// Check methods for container capabilities
		const hasAppend = widget.methods.some((m) => m.name === "append");
		const hasSetChild = widget.methods.some((m) => m.name === "set_child");

		metadata.supportsMultipleChildren = hasAppend;
		metadata.supportsSingleChild = hasSetChild;

		// Find properties that accept Gtk.Widget
		for (const prop of widget.properties) {
			if (!prop.writable) continue;

			const typeName = prop.type.name;
			// Check if it's a Widget type
			if (
				typeName === "Gtk.Widget" ||
				typeName === "Widget" ||
				this.isWidgetSubclass(typeName, classMap)
			) {
				const slotName = this.toPascalCase(prop.name);
				metadata.namedChildSlots.push({
					propertyName: prop.name,
					slotName: slotName,
				});
			}
		}

		return metadata;
	}

	private isListWidget(widgetName: string): boolean {
		// Detect list-based widgets that use GListModel
		const listWidgets = ["ListView", "ColumnView", "GridView"];
		return listWidgets.includes(widgetName);
	}

	private isWidgetSubclass(
		typeName: string,
		classMap: Map<string, GirClass>,
		visited: Set<string> = new Set(),
	): boolean {
		// Extract the class name without namespace
		const className = typeName.includes(".")
			? typeName.split(".")[1]
			: typeName;

		// Prevent infinite recursion
		if (visited.has(className)) return false;
		visited.add(className);

		const cls = classMap.get(className);
		if (!cls) return false;

		// Check if it inherits from Widget
		if (className === "Widget") return true;
		if (cls.parent) {
			return this.isWidgetSubclass(cls.parent, classMap, visited);
		}

		return false;
	}

	private generateWidgetProps(
		widget: GirClass,
		metadata: ContainerMetadata,
	): string {
		const widgetName = this.toPascalCase(widget.name);
		let code = `interface ${widgetName}Props extends `;

		// Determine parent props interface
		// Window extends WidgetProps, ApplicationWindow extends WindowProps
		if (widget.name === "Window") {
			code += `WidgetProps`;
		} else if (widget.name === "ApplicationWindow") {
			code += `WindowProps`;
		} else if (widget.parent) {
			const parentName = this.toPascalCase(widget.parent);
			// Check if parent is Widget or Window
			if (widget.parent === "Widget") {
				code += `WidgetProps`;
			} else if (widget.parent === "Window") {
				code += `WindowProps`;
			} else {
				code += `${parentName}Props`;
			}
		} else {
			code += `WidgetProps`;
		}

		code += ` {\n`;

		// Only collect properties and signals from this widget (not parents)
		// Parents will have their own Props interfaces
		const widgetProperties = widget.properties;
		const widgetSignals = widget.signals;

		// Filter out common widget properties that are already in WidgetProps
		const commonProps = new Set([
			"halign",
			"valign",
			"hexpand",
			"vexpand",
			"marginStart",
			"marginEnd",
			"marginTop",
			"marginBottom",
			"widthRequest",
			"heightRequest",
			"visible",
			"sensitive",
			"canFocus",
			"canTarget",
			"focusOnClick",
			"opacity",
			"cssClasses",
			"tooltipText",
			"tooltipMarkup",
		]);

		const commonSignals = new Set(["destroy", "show", "hide", "map", "unmap"]);

		// Get the set of property names that are handled as named child slots
		const namedChildPropNames = new Set(
			metadata.namedChildSlots.map((slot) => this.toCamelCase(slot.propertyName)),
		);

		// Generate properties (excluding widget-type properties that are child slots)
		const widgetSpecificProps: GirProperty[] = [];
		for (const prop of widgetProperties) {
			const propName = this.toCamelCase(prop.name);
			if (!commonProps.has(propName) && !namedChildPropNames.has(propName)) {
				widgetSpecificProps.push(prop);
			}
		}

		if (widgetSpecificProps.length > 0) {
			for (const prop of widgetSpecificProps) {
				const propName = this.toCamelCase(prop.name);
				const typeMapping = this.typeMapper.mapType(prop.type);
				// Simplify complex types for JSX props
				let tsType = typeMapping.ts;
				// Replace Ref<T> with T, and GObject types with unknown
				if (tsType.startsWith("Ref<")) {
					tsType = tsType.replace(/^Ref<(.+)>$/, "$1");
				}
				// If it's a GObject type or complex type, use unknown
				if (
					prop.type.name &&
					(prop.type.name.includes("Object") ||
						prop.type.name.includes("GObject") ||
						prop.type.name.includes("Gtk") ||
						prop.type.name.includes("Gdk"))
				) {
					tsType = "unknown";
				}
				code += `\t${propName}?: ${tsType};\n`;
			}
		}

		// Generate signals
		const widgetSpecificSignals: GirSignal[] = [];
		for (const signal of widgetSignals) {
			const signalName = this.toCamelCase(signal.name);
			if (!commonSignals.has(signalName)) {
				widgetSpecificSignals.push(signal);
			}
		}

		if (widgetSpecificSignals.length > 0) {
			code += `\n\t// Signals\n`;
			for (const signal of widgetSpecificSignals) {
				const signalName = this.toCamelCase(signal.name);
				const handlerName = `on${signalName.charAt(0).toUpperCase()}${signalName.slice(1)}`;

				// Generate signal handler type
				let handlerType = "() => void";
				if (signal.returnType) {
					const returnTypeMapping = this.typeMapper.mapType(signal.returnType);
					if (returnTypeMapping.ts !== "void") {
						handlerType = `() => ${returnTypeMapping.ts}`;
					}
				}
				if (signal.parameters && signal.parameters.length > 0) {
					const params = signal.parameters
						.map((p) => {
							const paramMapping = this.typeMapper.mapParameter(p);
							let paramType = paramMapping.ts;
							// Simplify Ref<T> to T for JSX props
							if (paramType.startsWith("Ref<")) {
								paramType = paramType.replace(/^Ref<(.+)>$/, "$1");
							}
							// Simplify complex types to unknown
							if (
								p.type.name &&
								(p.type.name.includes("Object") ||
									p.type.name.includes("GObject") ||
									p.type.name.includes("Gtk") ||
									p.type.name.includes("Gdk"))
							) {
								paramType = "unknown";
							}
							return `${this.toCamelCase(p.name)}: ${paramType}`;
						})
						.join(", ");
					if (signal.returnType) {
						const returnTypeMapping = this.typeMapper.mapType(
							signal.returnType,
						);
						let returnType = returnTypeMapping.ts;
						// Simplify Ref<T> to T
						if (returnType.startsWith("Ref<")) {
							returnType = returnType.replace(/^Ref<(.+)>$/, "$1");
						}
						// Simplify complex types to unknown
						if (
							signal.returnType.name &&
							(signal.returnType.name.includes("Object") ||
								signal.returnType.name.includes("GObject") ||
								signal.returnType.name.includes("Gtk") ||
								signal.returnType.name.includes("Gdk"))
						) {
							returnType = "unknown";
						}
						handlerType = `(${params}) => ${returnType}`;
					} else {
						handlerType = `(${params}) => void`;
					}
				}

				code += `\t${handlerName}?: ${handlerType};\n`;
			}
		}

		// Add itemFactory prop for list widgets
		if (this.isListWidget(widget.name)) {
			code += `\n\t// List widget specific props\n`;
			code += `\titemFactory?: <T>(item: T | null) => React.ReactElement;\n`;
		}

		// Add ref prop with proper widget type
		code += `\n\t// Ref to the underlying GTK widget instance\n`;
		code += `\tref?: Ref<Gtk.${widgetName}>;\n`;

		code += `}\n`;

		return code;
	}

	private generateDialogProps(dialog: GirClass): string {
		const dialogName = this.toPascalCase(dialog.name);
		let code = `interface ${dialogName}Props {\n`;

		// Add dialog-specific props
		if (dialog.name === "FileDialog") {
			code += `\t// Dialog operation mode\n`;
			code += `\tmode?: "open" | "save" | "selectFolder" | "openMultiple";\n`;
			code += `\n`;
		}

		// Add properties
		for (const prop of dialog.properties) {
			if (!prop.writable) continue;
			const propName = this.toCamelCase(prop.name);
			const typeMapping = this.typeMapper.mapType(prop.type);
			let tsType = typeMapping.ts;

			// Simplify complex types
			if (tsType.startsWith("Ref<")) {
				tsType = tsType.replace(/^Ref<(.+)>$/, "$1");
			}
			if (
				prop.type.name &&
				(prop.type.name.includes("Object") ||
					prop.type.name.includes("GObject") ||
					prop.type.name.includes("Gtk") ||
					prop.type.name.includes("Gdk"))
			) {
				tsType = "unknown";
			}
			code += `\t${propName}?: ${tsType};\n`;
		}

		// Add signals as event handlers
		if (dialog.signals && dialog.signals.length > 0) {
			code += `\n\t// Signals\n`;
			for (const signal of dialog.signals) {
				const signalName = this.toCamelCase(signal.name);
				const handlerName = `on${signalName.charAt(0).toUpperCase()}${signalName.slice(1)}`;

				// Generate handler type
				let handlerType = "() => void";
				if (signal.parameters && signal.parameters.length > 0) {
					const params = signal.parameters
						.map((p) => {
							const paramMapping = this.typeMapper.mapParameter(p);
							let paramType = paramMapping.ts;
							if (paramType.startsWith("Ref<")) {
								paramType = paramType.replace(/^Ref<(.+)>$/, "$1");
							}
							if (
								p.type.name &&
								(p.type.name.includes("Object") ||
									p.type.name.includes("GObject") ||
									p.type.name.includes("Gtk") ||
									p.type.name.includes("Gdk"))
							) {
								paramType = "unknown";
							}
							return `${this.toCamelCase(p.name)}: ${paramType}`;
						})
						.join(", ");

					if (signal.returnType) {
						const returnTypeMapping = this.typeMapper.mapType(signal.returnType);
						let returnType = returnTypeMapping.ts;
						if (returnType.startsWith("Ref<")) {
							returnType = returnType.replace(/^Ref<(.+)>$/, "$1");
						}
						if (
							signal.returnType.name &&
							(signal.returnType.name.includes("Object") ||
								signal.returnType.name.includes("GObject") ||
								signal.returnType.name.includes("Gtk") ||
								signal.returnType.name.includes("Gdk"))
						) {
							returnType = "unknown";
						}
						handlerType = `(${params}) => ${returnType}`;
					} else {
						handlerType = `(${params}) => void`;
					}
				}

				code += `\t${handlerName}?: ${handlerType};\n`;
			}
		}

		// Add ref prop
		code += `\n\t// Ref to the underlying dialog instance\n`;
		code += `\tref?: Ref<Gtk.${dialogName}>;\n`;

		code += `}\n`;

		return code;
	}

	private async formatCode(code: string): Promise<string> {
		try {
			return await format(code, {
				parser: "typescript",
				...(this.options.prettierConfig &&
				typeof this.options.prettierConfig === "object" &&
				this.options.prettierConfig !== null
					? (this.options.prettierConfig as Record<string, unknown>)
					: {}),
			});
		} catch (error) {
			console.warn("Failed to format code:", error);
			return code;
		}
	}

	// Utility methods for case conversion
	private toCamelCase(str: string): string {
		// Replace both underscores and hyphens
		return str.replace(/[-_]([a-z])/g, (_, letter) => letter.toUpperCase());
	}

	private toPascalCase(str: string): string {
		const camel = this.toCamelCase(str);
		return camel.charAt(0).toUpperCase() + camel.slice(1);
	}
}
