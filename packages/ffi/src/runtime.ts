import {
    type Arg,
    type FfiValue,
    type NativeHandle,
    alloc as nativeAlloc,
    call as nativeCall,
    freeze as nativeFreeze,
    read as nativeRead,
    unfreeze as nativeUnfreeze,
    write as nativeWrite,
    type Type,
} from "@gtkx/native";

/**
 * Invokes a native function through FFI.
 *
 * Returns `unknown` so the caller decides how to narrow the result; the
 * underlying value is always one of the {@link FfiValue} shapes.
 *
 * @param library - Library name (e.g., "libgtk-4.so.1")
 * @param symbol - Function symbol name
 * @param args - Arguments with type information for marshaling
 * @param returnType - Expected return type descriptor
 * @returns The unmarshaled return value, typed as `unknown`
 * @throws If runtime not started or undefined required argument
 */
export const call = (library: string, symbol: string, args: Arg[], returnType: Type): unknown => {
    return nativeCall(library, symbol, args, returnType);
};

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

/**
 * Allocates native memory for a structure or buffer.
 *
 * @param size - Number of bytes to allocate
 * @param typeName - Optional type name for debugging
 * @param library - Optional library name for debugging
 * @returns Handle to the allocated memory
 * @throws If runtime not started
 */
export const alloc = (size: number, typeName?: string, library?: string): NativeHandle => {
    return nativeAlloc(size, typeName, library);
};

/**
 * Reads a value from native memory.
 *
 * @param handle - Handle to the memory region
 * @param type - Type descriptor for unmarshaling
 * @param offset - Byte offset within the memory region
 * @returns The unmarshaled value
 * @throws If runtime not started
 */
export const read = (handle: NativeHandle, type: Type, offset: number): FfiValue => {
    return nativeRead(handle, type, offset);
};

/**
 * Writes a value to native memory.
 *
 * @param handle - Handle to the memory region
 * @param type - Type descriptor for marshaling
 * @param offset - Byte offset within the memory region
 * @param value - Value to write
 * @throws If runtime not started
 */
export const write = (handle: NativeHandle, type: Type, offset: number, value: unknown): void => {
    nativeWrite(handle, type, offset, value);
};

/**
 * Freezes the GLib main loop, preventing it from processing events.
 *
 * While frozen, GTK property changes and signal emissions are batched
 * and deferred until {@link unfreeze} is called. This is used internally
 * by the reconciler to group multiple mutations into a single
 * main-loop iteration, avoiding intermediate redraws.
 */
export const freeze = (): void => {
    nativeFreeze();
};

/**
 * Unfreezes the GLib main loop, flushing all batched mutations.
 *
 * Must be paired with a preceding {@link freeze} call. Once unfrozen,
 * all deferred property changes and signal emissions are dispatched
 * in a single main-loop iteration.
 */
export const unfreeze = (): void => {
    nativeUnfreeze();
};
