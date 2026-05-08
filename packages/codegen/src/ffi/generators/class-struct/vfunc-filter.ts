/**
 * Vfunc Filter
 *
 * Predicate that decides whether a callback field on a class struct can be
 * exposed in the generated vtable registry. A vfunc is eligible only when
 * every parameter type and the return type round-trip cleanly through the
 * FFI layer; otherwise the slot is skipped so users never spread a partly
 * broken descriptor into `registerClass`.
 */

import type { GirCallback, GirField } from "@gtkx/gir";
import type { FfiMapper } from "../../../core/type-system/ffi-mapper.js";

/**
 * Why a vfunc cannot be safely emitted.
 */
export type VfuncSkipReason =
    | "no-callback"
    | "not-introspectable"
    | "variadic-parameter"
    | "out-param-no-caller-allocates"
    | "unmappable-parameter"
    | "unmappable-return";

/**
 * Human-readable label for each {@link VfuncSkipReason}. Kept exhaustive via
 * the `Record` type so adding a new reason without a label is a compile error.
 */
export const VFUNC_SKIP_REASON_LABEL: Record<VfuncSkipReason, string> = {
    "no-callback": "field has no inline callback",
    "not-introspectable": 'marked introspectable="0"',
    "variadic-parameter": "variadic parameter",
    "out-param-no-caller-allocates": "out/inout parameter without caller-allocates",
    "unmappable-parameter": "parameter type cannot be mapped to FFI",
    "unmappable-return": "return type cannot be mapped to FFI",
};

/**
 * Result of evaluating a single class-struct field for vtable registry
 * inclusion. Eligible fields carry no extra payload; skipped fields carry
 * a structured reason for diagnostic logging.
 */
export type VfuncFilterResult =
    | { readonly eligible: true; readonly callback: GirCallback }
    | { readonly eligible: false; readonly reason: VfuncSkipReason };

/**
 * Classifies a class-struct field as either an emittable vfunc descriptor
 * source or an explicit skip with a structured reason.
 *
 * @param field - The struct field to classify.
 * @param ffiMapper - Mapper used to validate parameter and return types.
 */
export function classifyVfunc(field: GirField, ffiMapper: FfiMapper): VfuncFilterResult {
    const callback = field.callback;
    if (!callback) return { eligible: false, reason: "no-callback" };
    if (!callback.introspectable) return { eligible: false, reason: "not-introspectable" };

    for (const param of callback.parameters) {
        if (param.varargs) return { eligible: false, reason: "variadic-parameter" };
        if ((param.direction === "out" || param.direction === "inout") && !param.callerAllocates) {
            return { eligible: false, reason: "out-param-no-caller-allocates" };
        }
        const mapped = ffiMapper.mapType(param.type, false, param.transferOwnership);
        if (mapped.unsafe === true) return { eligible: false, reason: "unmappable-parameter" };
    }

    const mappedReturn = ffiMapper.mapType(callback.returnType, true, callback.returnType.transferOwnership);
    if (mappedReturn.unsafe === true) return { eligible: false, reason: "unmappable-return" };

    return { eligible: true, callback };
}
