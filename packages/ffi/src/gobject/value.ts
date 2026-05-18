/**
 * Runtime overrides for `GObject.Value`'s boxed accessors.
 *
 * `g_value_get_boxed` and `g_value_set_boxed` exchange a type-erased
 * `gpointer`, which codegen cannot marshal — it emits throwing stubs in their
 * place. These overrides install working implementations backed by the
 * registry-aware boxed marshalling in `./gvalue.js`.
 */

import { Value } from "../generated/gobject/gobject.js";
import { readBoxed, writeBoxed } from "./gvalue.js";

Value.prototype.getBoxed = function getBoxed<T = unknown>(this: Value): T {
    return readBoxed(this) as T;
};

Value.prototype.setBoxed = function setBoxed(this: Value, vBoxed: object | null): void {
    writeBoxed(this, vBoxed);
};
