/**
 * Container Methods Config
 *
 * Allowlist of methods that act as container slots — methods that accept
 * a single widget child for positioning (e.g., packStart, addPrefix).
 *
 * Keys are JSX names, values are kebab-case GIR method names.
 * Not every void+widget method qualifies (e.g., `set_default_widget` is
 * a property setter, not a container method).
 */

const CONTAINER_METHODS: Readonly<Record<string, readonly string[]>> = {
    GtkActionBar: ["pack-start", "pack-end"],
    GtkHeaderBar: ["pack-start", "pack-end"],
    AdwHeaderBar: ["pack-start", "pack-end"],
    AdwActionRow: ["add-prefix", "add-suffix"],
    AdwEntryRow: ["add-prefix", "add-suffix"],
    AdwExpanderRow: ["add-prefix", "add-suffix", "add-row", "add-action"],
    AdwToolbarView: ["add-top-bar", "add-bottom-bar"],
};

export const getContainerMethodNames = (jsxName: string): readonly string[] => {
    return CONTAINER_METHODS[jsxName] ?? [];
};
