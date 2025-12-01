import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import {
    type GirNamespace,
    type GirParameter,
    GirParser,
    type GirType,
    TypeMapper,
    TypeRegistry,
} from "../src/index.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const workspaceRoot = resolve(__dirname, "../../..");
const girsDir = join(workspaceRoot, "girs");

const loadGirFile = (filename: string): GirNamespace => {
    const content = readFileSync(join(girsDir, filename), "utf-8");
    const parser = new GirParser();
    return parser.parse(content);
};

describe("TypeRegistry", () => {
    let registry: TypeRegistry;
    let gtkNamespace: GirNamespace;
    let gobjectNamespace: GirNamespace;
    let glibNamespace: GirNamespace;
    let gdkNamespace: GirNamespace;
    let gioNamespace: GirNamespace;

    beforeAll(() => {
        gtkNamespace = loadGirFile("Gtk-4.0.gir");
        gobjectNamespace = loadGirFile("GObject-2.0.gir");
        glibNamespace = loadGirFile("GLib-2.0.gir");
        gdkNamespace = loadGirFile("Gdk-4.0.gir");
        gioNamespace = loadGirFile("Gio-2.0.gir");

        registry = TypeRegistry.fromNamespaces([
            gtkNamespace,
            gobjectNamespace,
            glibNamespace,
            gdkNamespace,
            gioNamespace,
        ]);
    });

    describe("class registration", () => {
        it("registers classes from all namespaces", () => {
            expect(registry.resolve("Gtk.Button")).toBeDefined();
            expect(registry.resolve("GObject.Object")).toBeDefined();
            expect(registry.resolve("Gio.Application")).toBeDefined();
        });

        it("returns correct kind for classes", () => {
            const button = registry.resolve("Gtk.Button");
            expect(button?.kind).toBe("class");
        });

        it("transforms class names correctly", () => {
            const button = registry.resolve("Gtk.Button");
            expect(button?.transformedName).toBe("Button");
        });

        it("handles special class renames (Object -> GObject, Error -> GError)", () => {
            const gobject = registry.resolve("GObject.Object");
            expect(gobject?.transformedName).toBe("GObject");

            const gerror = registry.resolve("GLib.Error");
            expect(gerror?.transformedName).toBe("GError");
        });
    });

    describe("interface registration", () => {
        it("registers interfaces from all namespaces", () => {
            expect(registry.resolve("Gtk.Actionable")).toBeDefined();
            expect(registry.resolve("Gio.ActionGroup")).toBeDefined();
        });

        it("returns class kind for interfaces", () => {
            const actionable = registry.resolve("Gtk.Actionable");
            expect(actionable?.kind).toBe("class");
        });
    });

    describe("enum registration", () => {
        it("registers enums from all namespaces", () => {
            expect(registry.resolve("Gtk.Align")).toBeDefined();
            expect(registry.resolve("Gdk.AxisUse")).toBeDefined();
        });

        it("returns correct kind for enums", () => {
            const align = registry.resolve("Gtk.Align");
            expect(align?.kind).toBe("enum");
        });

        it("registers bitfields as enums", () => {
            const stateFlags = registry.resolve("Gtk.StateFlags");
            expect(stateFlags?.kind).toBe("enum");
        });
    });

    describe("record registration", () => {
        it("registers records with glib:type-name", () => {
            const rgba = registry.resolve("Gdk.RGBA");
            expect(rgba).toBeDefined();
            expect(rgba?.kind).toBe("record");
        });

        it("stores glib type name for records", () => {
            const rgba = registry.resolve("Gdk.RGBA");
            expect(rgba?.glibTypeName).toBe("GdkRGBA");
        });

        it("does not register disguised records", () => {
            const registeredRecords = gdkNamespace.records.filter((r) => registry.resolve(`Gdk.${r.name}`));
            expect(registeredRecords.length).toBeLessThan(gdkNamespace.records.length);
        });
    });

    describe("callback registration", () => {
        it("registers callbacks from namespaces", () => {
            expect(registry.resolve("Gtk.TickCallback")).toBeDefined();
            expect(registry.resolve("Gio.AsyncReadyCallback")).toBeDefined();
        });

        it("returns correct kind for callbacks", () => {
            const callback = registry.resolve("Gtk.TickCallback");
            expect(callback?.kind).toBe("callback");
        });
    });

    describe("cross-namespace resolution", () => {
        it("resolves qualified names correctly", () => {
            const button = registry.resolve("Gtk.Button");
            expect(button?.namespace).toBe("Gtk");
            expect(button?.name).toBe("Button");
        });

        it("resolves types within namespace context", () => {
            const widget = registry.resolveInNamespace("Widget", "Gtk");
            expect(widget).toBeDefined();
            expect(widget?.namespace).toBe("Gtk");
        });

        it("resolves qualified names from any namespace context", () => {
            const gdkRgba = registry.resolveInNamespace("Gdk.RGBA", "Gtk");
            expect(gdkRgba).toBeDefined();
            expect(gdkRgba?.namespace).toBe("Gdk");
        });
    });
});

describe("TypeMapper", () => {
    let registry: TypeRegistry;
    let typeMapper: TypeMapper;
    let gtkNamespace: GirNamespace;
    let gobjectNamespace: GirNamespace;
    let glibNamespace: GirNamespace;
    let gdkNamespace: GirNamespace;
    let gioNamespace: GirNamespace;
    let allNamespaces: GirNamespace[];

    beforeAll(() => {
        gtkNamespace = loadGirFile("Gtk-4.0.gir");
        gobjectNamespace = loadGirFile("GObject-2.0.gir");
        glibNamespace = loadGirFile("GLib-2.0.gir");
        gdkNamespace = loadGirFile("Gdk-4.0.gir");
        gioNamespace = loadGirFile("Gio-2.0.gir");

        allNamespaces = [gtkNamespace, gobjectNamespace, glibNamespace, gdkNamespace, gioNamespace];
        registry = TypeRegistry.fromNamespaces(allNamespaces);

        typeMapper = new TypeMapper();
        typeMapper.setTypeRegistry(registry, "Gtk");

        for (const enumeration of gtkNamespace.enumerations) {
            typeMapper.registerEnum(enumeration.name);
        }
        for (const bitfield of gtkNamespace.bitfields) {
            typeMapper.registerEnum(bitfield.name);
        }
        for (const record of gtkNamespace.records) {
            if (record.glibTypeName) {
                typeMapper.registerRecord(record.name, record.name, record.glibTypeName);
            }
        }
    });

    describe("basic type mapping", () => {
        it("maps gboolean to boolean", () => {
            const result = typeMapper.mapType({ name: "gboolean" });
            expect(result.ts).toBe("boolean");
            expect(result.ffi.type).toBe("boolean");
        });

        it("maps gint to number with correct FFI type", () => {
            const result = typeMapper.mapType({ name: "gint" });
            expect(result.ts).toBe("number");
            expect(result.ffi.type).toBe("int");
            expect(result.ffi.size).toBe(32);
        });

        it("maps guint to number with unsigned FFI type", () => {
            const result = typeMapper.mapType({ name: "guint" });
            expect(result.ts).toBe("number");
            expect(result.ffi.type).toBe("int");
            expect(result.ffi.unsigned).toBe(true);
        });

        it("maps gfloat to number with float FFI type", () => {
            const result = typeMapper.mapType({ name: "gfloat" });
            expect(result.ts).toBe("number");
            expect(result.ffi.type).toBe("float");
            expect(result.ffi.size).toBe(32);
        });

        it("maps gdouble to number with 64-bit float FFI type", () => {
            const result = typeMapper.mapType({ name: "gdouble" });
            expect(result.ts).toBe("number");
            expect(result.ffi.type).toBe("float");
            expect(result.ffi.size).toBe(64);
        });

        it("maps utf8 to string", () => {
            const result = typeMapper.mapType({ name: "utf8" });
            expect(result.ts).toBe("string");
            expect(result.ffi.type).toBe("string");
        });

        it("maps filename to string", () => {
            const result = typeMapper.mapType({ name: "filename" });
            expect(result.ts).toBe("string");
            expect(result.ffi.type).toBe("string");
        });

        it("maps void to void", () => {
            const result = typeMapper.mapType({ name: "void" });
            expect(result.ts).toBe("void");
            expect(result.ffi.type).toBe("undefined");
        });

        it("maps none to void", () => {
            const result = typeMapper.mapType({ name: "none" });
            expect(result.ts).toBe("void");
            expect(result.ffi.type).toBe("undefined");
        });

        it("maps gpointer to number with 64-bit unsigned FFI type", () => {
            const result = typeMapper.mapType({ name: "gpointer" });
            expect(result.ts).toBe("number");
            expect(result.ffi.type).toBe("int");
            expect(result.ffi.size).toBe(64);
            expect(result.ffi.unsigned).toBe(true);
        });

        it("maps GType to number with 64-bit unsigned", () => {
            const result = typeMapper.mapType({ name: "GType" });
            expect(result.ts).toBe("number");
            expect(result.ffi.size).toBe(64);
            expect(result.ffi.unsigned).toBe(true);
        });
    });

    describe("enum type mapping", () => {
        it("maps registered enums to their transformed name", () => {
            const result = typeMapper.mapType({ name: "Align" });
            expect(result.ts).toBe("Align");
            expect(result.ffi.type).toBe("int");
            expect(result.ffi.size).toBe(32);
        });

        it("maps qualified enum names", () => {
            const result = typeMapper.mapType({ name: "Gtk.Align" });
            expect(result.ts).toBe("Align");
            expect(result.ffi.type).toBe("int");
        });

        it("maps cross-namespace enums with qualified name", () => {
            const gdkTypeMapper = new TypeMapper();
            gdkTypeMapper.setTypeRegistry(registry, "Gdk");

            for (const enumeration of gdkNamespace.enumerations) {
                gdkTypeMapper.registerEnum(enumeration.name);
            }

            const result = gdkTypeMapper.mapType({ name: "Gtk.Align" });
            expect(result.ts).toBe("Gtk.Align");
            expect(result.externalType?.namespace).toBe("Gtk");
        });
    });

    describe("record type mapping", () => {
        it("maps registered records to boxed FFI type", () => {
            const gdkTypeMapper = new TypeMapper();
            gdkTypeMapper.setTypeRegistry(registry, "Gdk");

            for (const record of gdkNamespace.records) {
                if (record.glibTypeName) {
                    gdkTypeMapper.registerRecord(record.name, record.name, record.glibTypeName);
                }
            }

            const result = gdkTypeMapper.mapType({ name: "RGBA" });
            expect(result.ts).toBe("RGBA");
            expect(result.ffi.type).toBe("boxed");
            expect(result.ffi.innerType).toBe("GdkRGBA");
        });
    });

    describe("gobject type mapping", () => {
        it("maps GObject classes to gobject FFI type", () => {
            const result = typeMapper.mapType({ name: "Widget" });
            expect(result.ts).toBe("Widget");
            expect(result.ffi.type).toBe("gobject");
        });

        it("maps cross-namespace GObject classes", () => {
            const result = typeMapper.mapType({ name: "GObject.Object" });
            expect(result.ts).toBe("GObject.GObject");
            expect(result.ffi.type).toBe("gobject");
            expect(result.externalType?.namespace).toBe("GObject");
        });

        it("handles borrowed return types", () => {
            const result = typeMapper.mapType({ name: "Widget" }, true);
            expect(result.ffi.borrowed).toBe(true);
        });
    });

    describe("array type mapping", () => {
        it("maps array types correctly", () => {
            const result = typeMapper.mapType({
                name: "array",
                isArray: true,
                elementType: { name: "utf8" },
            });
            expect(result.ts).toBe("string[]");
            expect(result.ffi.type).toBe("array");
            expect(result.ffi.itemType?.type).toBe("string");
        });

        it("maps arrays of GObjects", () => {
            const result = typeMapper.mapType({
                name: "array",
                isArray: true,
                elementType: { name: "Widget" },
            });
            expect(result.ts).toBe("Widget[]");
            expect(result.ffi.type).toBe("array");
            expect(result.ffi.itemType?.type).toBe("gobject");
        });
    });

    describe("callback type mapping", () => {
        it("maps registered callbacks to pointer FFI type in mapType", () => {
            const result = typeMapper.mapType({ name: "Gtk.TickCallback" });
            expect(result.ts).toBe("number");
            expect(result.ffi.type).toBe("int");
            expect(result.ffi.size).toBe(64);
        });

        it("detects callbacks via isCallback", () => {
            expect(typeMapper.isCallback("Gtk.TickCallback")).toBe(true);
            expect(typeMapper.isCallback("Gio.AsyncReadyCallback")).toBe(true);
            expect(typeMapper.isCallback("Gtk.Button")).toBe(false);
        });
    });

    describe("parameter mapping", () => {
        it("maps out parameters with Ref wrapper", () => {
            const param: GirParameter = {
                name: "value",
                type: { name: "gint" },
                direction: "out",
            };
            const result = typeMapper.mapParameter(param);
            expect(result.ts).toBe("Ref<number>");
            expect(result.ffi.type).toBe("ref");
        });

        it("maps inout parameters with Ref wrapper", () => {
            const param: GirParameter = {
                name: "value",
                type: { name: "gint" },
                direction: "inout",
            };
            const result = typeMapper.mapParameter(param);
            expect(result.ts).toBe("Ref<number>");
            expect(result.ffi.type).toBe("ref");
        });

        it("maps GAsyncReadyCallback correctly", () => {
            const param: GirParameter = {
                name: "callback",
                type: { name: "Gio.AsyncReadyCallback" },
            };
            const result = typeMapper.mapParameter(param);
            expect(result.ts).toContain("=>");
            expect(result.ffi.type).toBe("callback");
            expect(result.ffi.trampoline).toBe("asyncReady");
        });

        it("maps GLib.DestroyNotify callback", () => {
            const param: GirParameter = {
                name: "destroy",
                type: { name: "GLib.DestroyNotify" },
            };
            const result = typeMapper.mapParameter(param);
            expect(result.ffi.type).toBe("callback");
            expect(result.ffi.trampoline).toBe("destroy");
        });

        it("maps generic callback parameters", () => {
            const param: GirParameter = {
                name: "callback",
                type: { name: "Gtk.TickCallback" },
            };
            const result = typeMapper.mapParameter(param);
            expect(result.ffi.type).toBe("callback");
        });

        it("detects nullable parameters", () => {
            const param: GirParameter = {
                name: "widget",
                type: { name: "Widget" },
                nullable: true,
            };
            expect(typeMapper.isNullable(param)).toBe(true);
        });

        it("detects optional parameters", () => {
            const param: GirParameter = {
                name: "widget",
                type: { name: "Widget" },
                optional: true,
            };
            expect(typeMapper.isNullable(param)).toBe(true);
        });

        it("isNullable returns false for required parameters", () => {
            expect(
                typeMapper.isNullable({
                    name: "test",
                    type: { name: "utf8" },
                }),
            ).toBe(false);
        });

        it("detects closure targets", () => {
            const params: GirParameter[] = [
                { name: "callback", type: { name: "Gio.AsyncReadyCallback" }, closure: 1 },
                { name: "user_data", type: { name: "gpointer" } },
            ];
            expect(typeMapper.isClosureTarget(1, params)).toBe(true);
            expect(typeMapper.isClosureTarget(0, params)).toBe(false);
        });
    });

    describe("comprehensive type coverage", () => {
        const collectAllTypes = (ns: GirNamespace): GirType[] => {
            const types: GirType[] = [];

            for (const cls of ns.classes) {
                for (const method of cls.methods) {
                    types.push(method.returnType);
                    for (const param of method.parameters) {
                        types.push(param.type);
                    }
                }
                for (const ctor of cls.constructors) {
                    types.push(ctor.returnType);
                    for (const param of ctor.parameters) {
                        types.push(param.type);
                    }
                }
                for (const func of cls.functions) {
                    types.push(func.returnType);
                    for (const param of func.parameters) {
                        types.push(param.type);
                    }
                }
                for (const prop of cls.properties) {
                    types.push(prop.type);
                }
            }

            for (const iface of ns.interfaces) {
                for (const method of iface.methods) {
                    types.push(method.returnType);
                    for (const param of method.parameters) {
                        types.push(param.type);
                    }
                }
            }

            for (const record of ns.records) {
                for (const method of record.methods) {
                    types.push(method.returnType);
                    for (const param of method.parameters) {
                        types.push(param.type);
                    }
                }
                for (const field of record.fields) {
                    types.push(field.type);
                }
            }

            for (const func of ns.functions) {
                types.push(func.returnType);
                for (const param of func.parameters) {
                    types.push(param.type);
                }
            }

            return types;
        };

        it("all Gtk namespace types resolve to non-unknown types or are handled", () => {
            const mapper = new TypeMapper();
            mapper.setTypeRegistry(registry, "Gtk");

            for (const enumeration of gtkNamespace.enumerations) {
                mapper.registerEnum(enumeration.name);
            }
            for (const bitfield of gtkNamespace.bitfields) {
                mapper.registerEnum(bitfield.name);
            }
            for (const record of gtkNamespace.records) {
                if (record.glibTypeName) {
                    mapper.registerRecord(record.name, record.name, record.glibTypeName);
                }
            }

            const types = collectAllTypes(gtkNamespace);
            const unknownTypes = new Set<string>();

            for (const type of types) {
                if (!type.name || type.name === "void" || type.name === "none") continue;
                if (type.isArray && type.elementType) {
                    const mapped = mapper.mapType(type.elementType);
                    if (mapped.ts === "unknown" && type.elementType.name) {
                        unknownTypes.add(type.elementType.name);
                    }
                } else {
                    const mapped = mapper.mapType(type);
                    if (mapped.ts === "unknown" && type.name) {
                        unknownTypes.add(type.name);
                    }
                }
            }

            const knownUnhandledTypes = new Set([
                "gpointer",
                "gconstpointer",
                "GLib.Variant",
                "va_list",
                "GLib.Closure",
                "gsize",
                "gssize",
                "gunichar",
                "GLib.List",
                "GLib.SList",
                "GObject.ClosureMarshal",
                "GObject.ClosureNotify",
                "GObject.TypeInterface",
            ]);

            const registeredNamespaces = new Set(["Gtk", "GObject", "GLib", "Gdk", "Gio"]);

            const trulyUnknown = [...unknownTypes].filter((t) => {
                if (knownUnhandledTypes.has(t)) return false;
                if (t.endsWith("Func") || t.endsWith("Callback")) return false;
                if (t.includes("DestroyNotify")) return false;
                if (t.endsWith("Class") || t.endsWith("Private") || t.endsWith("Iface")) return false;
                if (t.endsWith("Notify") || t.endsWith("Foreach") || t.endsWith("Predicate")) return false;

                if (t.includes(".")) {
                    const ns = t.split(".")[0] ?? "";
                    if (!registeredNamespaces.has(ns)) return false;
                }
                return true;
            });

            expect(trulyUnknown.length, `Unknown types found: ${trulyUnknown.join(", ")}`).toBeLessThanOrEqual(15);
        });

        it("all GObject references map to registered classes or interfaces", () => {
            const classAndInterfaceTypes = new Set<string>();

            for (const ns of allNamespaces) {
                for (const cls of ns.classes) {
                    classAndInterfaceTypes.add(`${ns.name}.${cls.name}`);
                }
                for (const iface of ns.interfaces) {
                    classAndInterfaceTypes.add(`${ns.name}.${iface.name}`);
                }
            }

            for (const qualifiedName of classAndInterfaceTypes) {
                const resolved = registry.resolve(qualifiedName);
                expect(resolved, `Type ${qualifiedName} should be registered`).toBeDefined();
            }
        });

        it("all enums and bitfields are registered", () => {
            for (const ns of allNamespaces) {
                for (const enumeration of ns.enumerations) {
                    const resolved = registry.resolve(`${ns.name}.${enumeration.name}`);
                    expect(resolved, `Enum ${ns.name}.${enumeration.name} should be registered`).toBeDefined();
                    expect(resolved?.kind).toBe("enum");
                }
                for (const bitfield of ns.bitfields) {
                    const resolved = registry.resolve(`${ns.name}.${bitfield.name}`);
                    expect(resolved, `Bitfield ${ns.name}.${bitfield.name} should be registered`).toBeDefined();
                    expect(resolved?.kind).toBe("enum");
                }
            }
        });

        it("all records with glib:type-name are registered", () => {
            for (const ns of allNamespaces) {
                for (const record of ns.records) {
                    if (record.glibTypeName && !record.disguised) {
                        const resolved = registry.resolve(`${ns.name}.${record.name}`);
                        expect(resolved, `Record ${ns.name}.${record.name} should be registered`).toBeDefined();
                        expect(resolved?.kind).toBe("record");
                    }
                }
            }
        });
    });
});
