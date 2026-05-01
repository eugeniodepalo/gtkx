import { type Arg, call as nativeCall, type Type } from "@gtkx/native";

export { alloc, call, freeze, read, unfreeze, write } from "@gtkx/native";

/**
 * Binds a native function symbol once and returns a callable that dispatches it.
 *
 * Captures the library, symbol, and a pre-built `Arg` array in a closure so
 * the descriptor objects are allocated once at module load. Each invocation
 * mutates only the per-arg `value` slot before dispatching, making calls
 * allocation-free on the hot path.
 *
 * Reentrancy is safe: native marshals all argument values up-front before
 * dispatching, so trampolines that re-enter the same binding during signal
 * emission cannot observe a partially-marshaled state.
 *
 * Most code should use the generated bindings in `@gtkx/ffi` instead of
 * calling this directly.
 *
 * @param library - Library name (e.g., "libgtk-4.so.1")
 * @param symbol - Function symbol name
 * @param argTypes - Argument type descriptors in positional order
 * @param returnType - Expected return type descriptor
 * @returns A function that, given argument values, dispatches the FFI call
 */
export const fn = (
    library: string,
    symbol: string,
    argTypes: ReadonlyArray<{ type: Type; optional?: boolean }>,
    returnType: Type,
): ((...values: unknown[]) => unknown) => {
    const args: Arg[] = argTypes.map((argType) =>
        argType.optional
            ? { type: argType.type, value: undefined, optional: true }
            : { type: argType.type, value: undefined },
    );
    return (...values) => {
        let i = 0;
        for (const arg of args) {
            arg.value = values[i++];
        }
        return nativeCall(library, symbol, args, returnType);
    };
};
