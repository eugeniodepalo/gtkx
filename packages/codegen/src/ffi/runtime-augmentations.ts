/**
 * Runtime augmentations injected into generated per-namespace `.js` modules.
 *
 * A small set of contract members published by ts-for-gir have no GIR
 * backing: the GObject fundamental `TYPE_*` constants and the graphene
 * struct `create` factory shorthands. node-gtk synthesises these at runtime,
 * so the gtkx FFI runtime injects equivalent exports as the sanctioned
 * exception to the otherwise fully GIR-driven generation.
 */

/**
 * GObject fundamental type constants, resolved from `g_type_from_name`. Each
 * name maps to the canonical type-system identifier node-gtk exposes under
 * the same `TYPE_*` export.
 */
const GOBJECT_FUNDAMENTAL_TYPES: ReadonlyArray<readonly [constant: string, typeName: string]> = [
    ["TYPE_INVALID", "void"],
    ["TYPE_NONE", "void"],
    ["TYPE_INTERFACE", "GInterface"],
    ["TYPE_CHAR", "gchar"],
    ["TYPE_UCHAR", "guchar"],
    ["TYPE_BOOLEAN", "gboolean"],
    ["TYPE_INT", "gint"],
    ["TYPE_UINT", "guint"],
    ["TYPE_LONG", "glong"],
    ["TYPE_ULONG", "gulong"],
    ["TYPE_INT64", "gint64"],
    ["TYPE_UINT64", "guint64"],
    ["TYPE_ENUM", "GEnum"],
    ["TYPE_FLAGS", "GFlags"],
    ["TYPE_FLOAT", "gfloat"],
    ["TYPE_DOUBLE", "gdouble"],
    ["TYPE_STRING", "gchararray"],
    ["TYPE_POINTER", "gpointer"],
    ["TYPE_BOXED", "GBoxed"],
    ["TYPE_PARAM", "GParam"],
    ["TYPE_OBJECT", "GObject"],
    ["TYPE_GTYPE", "GType"],
    ["TYPE_VARIANT", "GVariant"],
    ["TYPE_UNICHAR", "guint"],
];

const buildGObjectAugmentation = (): string => {
    const lines = GOBJECT_FUNDAMENTAL_TYPES.map(
        ([constant, typeName]) => `export const ${constant} = typeFromName(${JSON.stringify(typeName)});`,
    );
    return lines.join("\n");
};

const buildGrapheneAugmentation = (): string =>
    ["Point", "Rect", "Size"]
        .map(
            (name) =>
                `${name}.create = (...args) => {\n` +
                `    const instance = ${name}.alloc();\n` +
                `    instance.init(...args);\n` +
                `    return instance;\n` +
                `};`,
        )
        .join("\n");

const AUGMENTATIONS: ReadonlyMap<string, () => string> = new Map([
    ["GObject", buildGObjectAugmentation],
    ["Graphene", buildGrapheneAugmentation],
]);

/**
 * Returns the runtime augmentation source to append to a namespace's
 * generated `.js`, or an empty string when the namespace has none.
 *
 * @param namespace - GIR namespace identifier (e.g. `GObject`, `Graphene`).
 */
export function getRuntimeAugmentation(namespace: string): string {
    const build = AUGMENTATIONS.get(namespace);
    return build ? build() : "";
}
