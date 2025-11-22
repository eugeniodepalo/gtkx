import type { GirParameter, GirType } from "@gtkx/gir";

export interface FfiTypeDescriptor {
	type: string;
	size?: number;
	unsigned?: boolean;
	borrowed?: boolean;
	innerType?: FfiTypeDescriptor; // For ref types
	itemType?: FfiTypeDescriptor; // For array types
}

export class TypeMapper {
	private enumNames: Set<string> = new Set();
	private enumTransforms: Map<string, string> = new Map(); // original -> transformed
	private onEnumUsed?: (enumName: string) => void;
	private typeMap = new Map<string, { ts: string; ffi: FfiTypeDescriptor }>([
		// Basic types
		["gboolean", { ts: "boolean", ffi: { type: "boolean" } }],
		["gchar", { ts: "number", ffi: { type: "int", size: 8, unsigned: false } }],
		["guchar", { ts: "number", ffi: { type: "int", size: 8, unsigned: true } }],
		["gint", { ts: "number", ffi: { type: "int", size: 32, unsigned: false } }],
		["guint", { ts: "number", ffi: { type: "int", size: 32, unsigned: true } }],
		[
			"gshort",
			{ ts: "number", ffi: { type: "int", size: 32, unsigned: false } },
		], // Map 16-bit to 32-bit
		[
			"gushort",
			{ ts: "number", ffi: { type: "int", size: 32, unsigned: true } },
		], // Map 16-bit to 32-bit
		[
			"glong",
			{ ts: "number", ffi: { type: "int", size: 64, unsigned: false } },
		],
		[
			"gulong",
			{ ts: "number", ffi: { type: "int", size: 64, unsigned: true } },
		],
		[
			"GType",
			{ ts: "number", ffi: { type: "int", size: 64, unsigned: true } },
		],
		["gint8", { ts: "number", ffi: { type: "int", size: 8, unsigned: false } }],
		["guint8", { ts: "number", ffi: { type: "int", size: 8, unsigned: true } }],
		[
			"gint16",
			{ ts: "number", ffi: { type: "int", size: 32, unsigned: false } },
		], // Map 16-bit to 32-bit
		[
			"guint16",
			{ ts: "number", ffi: { type: "int", size: 32, unsigned: true } },
		], // Map 16-bit to 32-bit
		[
			"gint32",
			{ ts: "number", ffi: { type: "int", size: 32, unsigned: false } },
		],
		[
			"guint32",
			{ ts: "number", ffi: { type: "int", size: 32, unsigned: true } },
		],
		[
			"gint64",
			{ ts: "number", ffi: { type: "int", size: 64, unsigned: false } },
		],
		[
			"guint64",
			{ ts: "number", ffi: { type: "int", size: 64, unsigned: true } },
		],
		["gfloat", { ts: "number", ffi: { type: "float", size: 32 } }],
		["gdouble", { ts: "number", ffi: { type: "float", size: 64 } }],
		["utf8", { ts: "string", ffi: { type: "string" } }],
		["filename", { ts: "string", ffi: { type: "string" } }],
		["gpointer", { ts: "unknown", ffi: { type: "gobject" } }],
		["gconstpointer", { ts: "unknown", ffi: { type: "gobject" } }],
		["void", { ts: "void", ffi: { type: "undefined" } }],
		["none", { ts: "void", ffi: { type: "undefined" } }],

		// Common standard types
		["int", { ts: "number", ffi: { type: "int", size: 32, unsigned: false } }],
		["uint", { ts: "number", ffi: { type: "int", size: 32, unsigned: true } }],
		["long", { ts: "number", ffi: { type: "int", size: 64, unsigned: false } }],
		["ulong", { ts: "number", ffi: { type: "int", size: 64, unsigned: true } }],
		[
			"size_t",
			{ ts: "number", ffi: { type: "int", size: 64, unsigned: true } },
		],
		[
			"ssize_t",
			{ ts: "number", ffi: { type: "int", size: 64, unsigned: false } },
		],
		["double", { ts: "number", ffi: { type: "float", size: 64 } }],
		["float", { ts: "number", ffi: { type: "float", size: 32 } }],
	]);

	registerEnum(originalName: string, transformedName?: string) {
		this.enumNames.add(originalName);
		if (transformedName) {
			this.enumTransforms.set(originalName, transformedName);
		}
	}

	setEnumUsageCallback(callback: (enumName: string) => void) {
		this.onEnumUsed = callback;
	}

	mapType(
		girType: GirType,
		isReturn: boolean = false,
	): { ts: string; ffi: FfiTypeDescriptor } {
		// Handle arrays
		if (girType.isArray || girType.name === "array") {
			if (girType.elementType) {
				const elementType = this.mapType(girType.elementType);
				return {
					ts: `${elementType.ts}[]`,
					ffi: { type: "array", itemType: elementType.ffi },
				};
			} else {
				// Array with unknown element type, default to unknown[]
				return {
					ts: `unknown[]`,
					ffi: { type: "array", itemType: { type: "undefined" } },
				};
			}
		}

		// Check if it's a basic type
		const basicType = this.typeMap.get(girType.name);
		if (basicType) {
			return basicType;
		}

		// Check if it's an enum type (enums are represented as int32)
		if (this.enumNames.has(girType.name)) {
			const transformedName =
				this.enumTransforms.get(girType.name) || girType.name;
			if (this.onEnumUsed) {
				this.onEnumUsed(transformedName);
			}
			return {
				ts: transformedName,
				ffi: { type: "int", size: 32, unsigned: false },
			};
		}

		// Handle namespace-prefixed types
		const namespacePrefixed = girType.name.includes(".");
		if (namespacePrefixed) {
			const [_ns, typeName] = girType.name.split(".", 2);
			// Check if the type (without namespace) is an enum
			if (this.enumNames.has(typeName)) {
				const transformedName = this.enumTransforms.get(typeName) || typeName;
				if (this.onEnumUsed) {
					this.onEnumUsed(transformedName);
				}
				return {
					ts: transformedName,
					ffi: { type: "int", size: 32, unsigned: false },
				};
			}
			// For now, treat all object types as GObject
			return {
				ts: "unknown",
				ffi: { type: "gobject", borrowed: isReturn },
			};
		}

		// Default to GObject for unknown types (likely object types)
		return {
			ts: "unknown",
			ffi: { type: "gobject", borrowed: isReturn },
		};
	}

	mapParameter(param: GirParameter): { ts: string; ffi: FfiTypeDescriptor } {
		// Handle out parameters
		if (param.direction === "out" || param.direction === "inout") {
			const innerType = this.mapType(param.type);
			return {
				ts: `Ref<${innerType.ts}>`,
				ffi: {
					type: "ref",
					innerType: innerType.ffi,
				},
			};
		}

		// Handle callbacks
		if (
			param.type.name === "GLib.Closure" ||
			param.type.name.endsWith("Func")
		) {
			return {
				ts: "(...args: unknown[]) => unknown",
				ffi: { type: "callback" },
			};
		}

		return this.mapType(param.type);
	}

	isNullable(param: GirParameter): boolean {
		return param.nullable === true || param.optional === true;
	}

	getLibraryName(namespace: string): string {
		const libraryMap: Record<string, string> = {
			Gtk: "libgtk-4.so.1",
			GObject: "libgobject-2.0.so.0",
			GLib: "libglib-2.0.so.0",
			Gio: "libgio-2.0.so.0",
			GdkPixbuf: "libgdk_pixbuf-2.0.so.0",
			Pango: "libpango-1.0.so.0",
			Cairo: "libcairo.so.2",
		};

		return libraryMap[namespace] || `lib${namespace.toLowerCase()}.so`;
	}

	generateTypeImport(): string {
		return `import { call, Ref } from "@gtkx/native";\n`;
	}
}
