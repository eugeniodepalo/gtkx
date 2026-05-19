import { toCamelCase } from "./naming.js";

type ParameterLike = { readonly name: string };

export const isVararg = (param: ParameterLike): boolean => param.name === "..." || param.name === "";

export const filterVarargs = <T extends ParameterLike>(params: readonly T[]): T[] => params.filter((p) => !isVararg(p));

export const hasVarargs = (params: readonly ParameterLike[]): boolean => params.some(isVararg);

const toMethodKey = (name: string, cIdentifier: string): string => `${toCamelCase(name)}:${cIdentifier}`;

export const isMethodDuplicate = (name: string, cIdentifier: string, seen: Set<string>): boolean => {
    const key = toMethodKey(name, cIdentifier);
    if (seen.has(key)) return true;
    seen.add(key);
    return false;
};

type ReturnTypeLike = { readonly name: string };

type MethodLike = {
    readonly name: string;
    readonly cIdentifier: string;
    readonly parameters: readonly ParameterLike[];
    readonly returnType?: ReturnTypeLike;
};

/**
 * A list of methods split by whether the FFI layer can marshal their
 * signature, with unnamed entries and duplicates already removed.
 */
export type MethodPartition<T> = {
    /** Methods whose signature the FFI layer can marshal into a real wrapper. */
    supported: T[];
    /** Methods whose signature uses a type the FFI layer cannot marshal. */
    unsupported: T[];
};

/**
 * Splits a list of methods into the ones the FFI layer can marshal and the
 * ones it cannot, dropping unnamed entries and duplicates from both sides.
 *
 * node-gtk exposes every method as a property regardless of whether a given
 * call can be marshalled, so callers emit the unsupported methods as throwing
 * stubs rather than dropping them.
 */
export function partitionSupportedMethods<T extends MethodLike>(
    methods: readonly T[],
    hasUnsupportedCallbacks: (params: T["parameters"]) => boolean,
    isReturnTypeUnsafe: (returnType: T["returnType"]) => boolean,
): MethodPartition<T> {
    const seen = new Set<string>();
    const supported: T[] = [];
    const unsupported: T[] = [];
    for (const method of methods) {
        if (method.name === "") continue;
        if (isMethodDuplicate(method.name, method.cIdentifier, seen)) continue;
        if (hasUnsupportedCallbacks(method.parameters) || isReturnTypeUnsafe(method.returnType)) {
            unsupported.push(method);
        } else {
            supported.push(method);
        }
    }
    return { supported, unsupported };
}

type FunctionLike = {
    readonly parameters: readonly ParameterLike[];
    readonly returnType?: ReturnTypeLike;
};

/**
 * A list of standalone functions split by whether the FFI layer can marshal
 * their signature.
 */
export type FunctionPartition<T> = {
    /** Functions whose signature the FFI layer can marshal into a real wrapper. */
    supported: T[];
    /** Functions whose signature uses a type the FFI layer cannot marshal. */
    unsupported: T[];
};

/**
 * Splits a list of standalone functions into the ones the FFI layer can
 * marshal and the ones it cannot.
 *
 * node-gtk exposes every namespace function as a property regardless of
 * whether a given call can be marshalled, so callers emit the unsupported
 * functions as throwing stubs rather than dropping them.
 */
export function partitionSupportedFunctions<T extends FunctionLike>(
    functions: readonly T[],
    hasUnsupportedCallbacks: (params: T["parameters"]) => boolean,
    isReturnTypeUnsafe: (returnType: T["returnType"]) => boolean,
): FunctionPartition<T> {
    const supported: T[] = [];
    const unsupported: T[] = [];
    for (const fn of functions) {
        if (hasUnsupportedCallbacks(fn.parameters) || isReturnTypeUnsafe(fn.returnType)) {
            unsupported.push(fn);
        } else {
            supported.push(fn);
        }
    }
    return { supported, unsupported };
}
