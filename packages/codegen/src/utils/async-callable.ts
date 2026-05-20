/**
 * GIO-style async callable detection.
 *
 * GIO models an asynchronous operation as a pair of callables: a
 * `foo_async(...args, GCancellable*, GAsyncReadyCallback, gpointer)` that
 * starts the operation, and a companion `foo_finish(GAsyncResult*, ...)` that
 * yields its result (and throws on a `GError`).
 *
 * The gtkx FFI runtime exposes the async callable as a Promise-returning
 * wrapper rather than the raw callback form. These helpers identify a genuine
 * async/finish pair and map the async callable to the finish callable whose
 * return type is the resolved Promise value type.
 */

import type { GirFunction, GirMethod, GirParameter } from "../gir/index.js";

/**
 * Simple-name suffix of the GIR `Gio.AsyncReadyCallback` type. The async
 * callback parameter is typed either by this bare name (a Gio-local callable)
 * or by its `Gio.`-qualified form (a callable in any other namespace).
 */
const ASYNC_READY_CALLBACK = "AsyncReadyCallback";

/**
 * A callable carrying a companion `*_finish` callable: a class/interface
 * `<method>` or a standalone/static `<function>`.
 */
export type AsyncCapableCallable = GirMethod | GirFunction;

/**
 * Returns the `GAsyncReadyCallback`-typed parameter of a callable, or `null`
 * when the callable has none.
 *
 * The parameter is recognized by its GIR `scope="async"` together with a type
 * resolving to `Gio.AsyncReadyCallback` (bare name when the callable itself is
 * in the Gio namespace, `Gio.`-qualified otherwise).
 */
export const findAsyncReadyCallbackParameter = (callable: AsyncCapableCallable): GirParameter | null => {
    return (
        callable.parameters.find(
            (p) =>
                p.scope === "async" &&
                (p.type.name === ASYNC_READY_CALLBACK || p.type.name === `Gio.${ASYNC_READY_CALLBACK}`),
        ) ?? null
    );
};

/**
 * Resolves the GIR name of the companion `*_finish` callable for an async
 * callable, or `null` when the callable is not async.
 *
 * The name comes from the GIR `glib:finish-func` attribute when present; for a
 * `*_async`-named callable lacking the attribute it falls back to the
 * conventional `*_async` → `*_finish` substitution.
 */
export const resolveFinishCallableName = (callable: AsyncCapableCallable): string | null => {
    if (findAsyncReadyCallbackParameter(callable) === null) return null;
    if (callable.finishFunc !== undefined && callable.finishFunc.length > 0) {
        return callable.finishFunc;
    }
    if (callable.name.endsWith("_async")) {
        return callable.name.replace(/_async$/, "_finish");
    }
    return null;
};

/**
 * Simple-name suffix of the GIR `Gio.Cancellable` type. A cancellable
 * parameter is typed either by this bare name (a Gio-local callable) or by
 * its `Gio.`-qualified form (a callable in any other namespace).
 */
const CANCELLABLE = "Cancellable";

/**
 * Returns the `GCancellable`-typed parameter of an async callable, or `null`
 * when the callable accepts no cancellable.
 *
 * GIO async operations conventionally accept a `GCancellable*` slot ahead of
 * the trailing callbacks, but a handful do not; callers must tolerate its
 * absence.
 */
export const findCancellableParameter = (callable: AsyncCapableCallable): GirParameter | null => {
    return callable.parameters.find((p) => p.type.name === CANCELLABLE || p.type.name === `Gio.${CANCELLABLE}`) ?? null;
};

/**
 * An async callable paired with its resolved companion `*_finish` callable.
 *
 * @typeParam C - The async callable kind (method or function).
 * @typeParam F - The finish callable kind.
 */
export type AsyncCallablePair<C extends AsyncCapableCallable, F extends AsyncCapableCallable> = {
    /** The `*_async` callable to emit as a Promise-returning wrapper. */
    async: C;
    /** The companion `*_finish` callable whose return type is the Promise value. */
    finish: F;
    /** The async-callback parameter dropped from the wrapper signature. */
    callbackParameter: GirParameter;
};

/**
 * Pairs every async callable in `callables` with its companion `*_finish`
 * callable drawn from `finishCandidates`.
 *
 * A callable is paired only when it carries a genuine `GAsyncReadyCallback`
 * parameter and a matching finish callable exists on the same owner. This is
 * deliberately precise: a callable merely named `*_async` without an async
 * callback parameter, or one whose finish callable is absent, is not paired.
 *
 * @param callables - The candidate async callables (an owner's methods or functions).
 * @param finishCandidates - The callables searched for the companion `*_finish`.
 * @returns The async/finish pairs, keyed by the async callable's GIR name.
 */
export const collectAsyncCallablePairs = <C extends AsyncCapableCallable, F extends AsyncCapableCallable>(
    callables: readonly C[],
    finishCandidates: readonly F[],
): Map<string, AsyncCallablePair<C, F>> => {
    const finishByName = new Map<string, F>();
    for (const candidate of finishCandidates) {
        finishByName.set(candidate.name, candidate);
    }

    const pairs = new Map<string, AsyncCallablePair<C, F>>();
    for (const callable of callables) {
        const callbackParameter = findAsyncReadyCallbackParameter(callable);
        if (callbackParameter === null) continue;
        const finishName = resolveFinishCallableName(callable);
        if (finishName === null) continue;
        const finish = finishByName.get(finishName);
        if (finish === undefined) continue;
        pairs.set(callable.name, { async: callable, finish, callbackParameter });
    }
    return pairs;
};
