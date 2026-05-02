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
    readonly shadowedBy?: string;
};

/**
 * Filters a list of methods, removing ones that are unnamed, shadowed,
 * duplicates, have unsafe parameters, or have unsafe return types.
 *
 * @param methods - The methods to filter.
 * @param hasUnsupportedCallbacks - Predicate identifying methods whose
 *   parameter list contains a type the native marshaling layer cannot handle
 *   (raw pointers, untyped containers, callback typedefs as type refs, or
 *   composites whose inner types are unsafe).
 * @param isReturnTypeUnsafe - Predicate identifying methods whose return type
 *   is unsafe by the same rules.
 */
export function filterSupportedMethods<T extends MethodLike>(
    methods: readonly T[],
    hasUnsupportedCallbacks: (params: T["parameters"]) => boolean,
    isReturnTypeUnsafe: (returnType: T["returnType"]) => boolean,
): T[] {
    const seen = new Set<string>();
    return methods.filter((method) => {
        if (method.name === "") return false;
        if (method.shadowedBy) return false;
        if (isMethodDuplicate(method.name, method.cIdentifier, seen)) return false;
        if (hasUnsupportedCallbacks(method.parameters)) return false;
        if (isReturnTypeUnsafe(method.returnType)) return false;
        return true;
    });
}

type FunctionLike = {
    readonly parameters: readonly ParameterLike[];
    readonly returnType?: ReturnTypeLike;
    readonly shadowedBy?: string;
};

/**
 * Filters a list of standalone functions, removing ones that are shadowed,
 * have unsafe parameters, or have unsafe return types.
 *
 * @param functions - The functions to filter.
 * @param hasUnsupportedCallbacks - Predicate identifying functions whose
 *   parameter list contains an unsafe type.
 * @param isReturnTypeUnsafe - Predicate identifying functions whose return
 *   type is unsafe.
 */
export function filterSupportedFunctions<T extends FunctionLike>(
    functions: readonly T[],
    hasUnsupportedCallbacks: (params: T["parameters"]) => boolean,
    isReturnTypeUnsafe: (returnType: T["returnType"]) => boolean,
): T[] {
    return functions.filter((fn) => {
        if (fn.shadowedBy) return false;
        if (hasUnsupportedCallbacks(fn.parameters)) return false;
        if (isReturnTypeUnsafe(fn.returnType)) return false;
        return true;
    });
}
