/**
 * Callable Structure Assembly
 *
 * Shared assembly of the FFI generators' `MethodStructure[]` output: a list of
 * callables, already split into FFI-marshallable and unmarshallable, is paired
 * against its `*_finish` candidates and dispatched to async, regular, or stub
 * builders.
 */

import {
    type AsyncCallablePair,
    type AsyncCapableCallable,
    collectAsyncCallablePairs,
} from "../utils/async-callable.js";
import type { MethodStructure } from "./method-body-writer.js";

/**
 * The three per-context builders that turn one callable into a
 * {@link MethodStructure}.
 *
 * @typeParam C - The callable kind being generated (method or function).
 * @typeParam F - The finish-callable kind paired with async callables.
 */
export type CallableStructureStrategy<C extends AsyncCapableCallable, F extends AsyncCapableCallable> = {
    /** Builds the structure for a supported, non-async callable. */
    buildRegular: (callable: C) => MethodStructure;
    /** Builds the structure for a supported callable paired as `*_async`. */
    buildAsync: (pair: AsyncCallablePair<C, F>) => MethodStructure;
    /** Builds the throwing-stub structure for an unmarshallable callable. */
    buildStub: (callable: C) => MethodStructure;
};

/**
 * A list of callables already partitioned by FFI-marshallability.
 *
 * @typeParam C - The callable kind being generated.
 */
export type PartitionedCallables<C extends AsyncCapableCallable> = {
    /** Callables the FFI layer can marshal into a real wrapper. */
    supported: readonly C[];
    /** Callables emitted as throwing stubs. */
    unsupported: readonly C[];
};

/**
 * Assembles the `MethodStructure[]` for a partitioned callable list: every
 * supported callable carrying a genuine `*_finish` companion in
 * `finishCandidates` is built as an async wrapper, every other supported
 * callable as a regular wrapper, and every unsupported callable as a stub.
 *
 * @param callables - The supported/unsupported split of the callables to emit.
 * @param finishCandidates - The pool searched for companion `*_finish` callables.
 * @param strategy - The per-context async, regular, and stub builders.
 * @returns The assembled structures: supported callables first, then stubs.
 */
export function buildCallableStructures<C extends AsyncCapableCallable, F extends AsyncCapableCallable>(
    callables: PartitionedCallables<C>,
    finishCandidates: readonly F[],
    strategy: CallableStructureStrategy<C, F>,
): MethodStructure[] {
    const asyncPairs = collectAsyncCallablePairs(callables.supported, finishCandidates);
    return [
        ...callables.supported.map((callable) => {
            const pair = asyncPairs.get(callable.name);
            return pair ? strategy.buildAsync(pair) : strategy.buildRegular(callable);
        }),
        ...callables.unsupported.map((callable) => strategy.buildStub(callable)),
    ];
}
