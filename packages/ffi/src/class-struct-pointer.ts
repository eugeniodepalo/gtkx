/**
 * Runtime resolution of GObject class-struct pointers.
 *
 * GIR exposes a handful of static-style operations — most notably the
 * `gtk_widget_class_*` family — as `<method>` elements on the gtype-struct
 * record (`GtkWidgetClass`). ts-for-gir hoists those onto the owning class as
 * static methods whose first argument is the class itself, an instance, or a
 * `GType`. Invoking the underlying C function requires the corresponding
 * `GTypeClass *`, which `g_type_class_ref` produces from a `GType`.
 *
 * The class reference taken here is intentionally never released: class
 * structs live for the lifetime of the process once referenced, and these
 * operations are class-initialization helpers invoked at most a handful of
 * times per type.
 */

import type { GType } from "./generated/gobject/gobject.js";
import type { NativeClass, NativeHandle } from "./handles.js";
import { tryGetHandle } from "./handles.js";
import { t } from "./helpers.js";
import { getInstanceGType } from "./native.js";
import { getClassGType } from "./registry.js";

const LIB = "libgobject-2.0.so.0";

const g_type_class_ref = t.fn(LIB, "g_type_class_ref", [{ type: t.uint64 }], t.object("borrowed"));

/**
 * Accepted spellings of a class identity at a class-struct call site: the
 * generated class itself, a live instance of it, or its raw `GType`.
 */
export type ClassStructTarget = NativeClass | NativeHandle | GType | number;

const isNativeClass = (value: unknown): value is NativeClass => typeof value === "function";

const resolveGType = (target: ClassStructTarget): GType => {
    if (typeof target === "number") {
        return target;
    }
    if (isNativeClass(target)) {
        return getClassGType(target);
    }
    const handle = tryGetHandle(target) ?? target;
    return getInstanceGType(handle);
};

/**
 * Resolves the `GTypeClass *` pointer for `target` so a class-struct
 * `<method>` can be invoked through the FFI layer.
 *
 * @param target - The class, instance, or `GType` identifying the type.
 * @returns The class-struct pointer handle.
 */
export function resolveClassStructPointer(target: ClassStructTarget): NativeHandle {
    return g_type_class_ref(resolveGType(target)) as NativeHandle;
}
