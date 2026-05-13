import { findNativeClass } from "@gtkx/ffi";
import { typeFromName } from "@gtkx/ffi/gobject";
import type { Container, Props } from "../../types.js";

/**
 * Instantiates a container widget from the React reconciler.
 *
 * Resolves the GLib type by name, looks up the registered wrapper class,
 * and constructs it via the generic `NativeObject` constructor. The
 * constructor walks the JS prototype chain to merge inherited props from
 * the construction-meta registry.
 *
 * @param typeName - GLib type name (e.g. `"GtkLabel"`)
 * @param props - React prop bag; only construct-time properties are picked
 *   up, all others are ignored at construction
 */
export function createContainerWithProperties(typeName: string, props: Props): Container {
    const gtype = typeFromName(typeName);
    if (gtype === 0) {
        throw new Error(`createContainerWithProperties: unknown GLib type '${typeName}'`);
    }
    const cls = findNativeClass(gtype);
    if (!cls) {
        throw new Error(`createContainerWithProperties: no registered class for GLib type '${typeName}'`);
    }
    return new (cls as new (props: Props) => Container)(props);
}
