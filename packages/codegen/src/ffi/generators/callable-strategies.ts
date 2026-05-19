/**
 * Callable Structure Strategies
 *
 * The concrete {@link CallableStructureStrategy} factories shared by the class
 * and interface FFI generators. Each factory packs a generator's context into
 * the regular/async/stub builders that {@link buildCallableStructures}
 * dispatches to, so instance methods and static functions are emitted the same
 * way regardless of whether their owner is a class or an interface.
 */

import type { FfiGeneratorOptions } from "../../core/generator-types.js";
import type { SelfTypeDescriptor } from "../../core/type-system/ffi-types.js";
import { toCamelCase, toValidMemberName } from "../../core/utils/naming.js";
import type { CallableStructureStrategy, MethodBodyWriter } from "../../core/writers/index.js";
import type { GirFunction, GirMethod } from "../../gir/index.js";

/**
 * Context for {@link methodStructureStrategy}.
 */
export type MethodStrategyContext = {
    /** The writer that emits each method's body. */
    methodBody: MethodBodyWriter;
    /** The generator options for the owner's namespace and library. */
    options: FfiGeneratorOptions;
    /** The `self` descriptor threaded into each method's call expression. */
    selfTypeDescriptor: SelfTypeDescriptor;
    /** Dynamic method renames keyed by C identifier. */
    methodRenames: ReadonlyMap<string, string>;
};

/**
 * Builds the {@link CallableStructureStrategy} for a type's instance methods.
 */
export function methodStructureStrategy(
    context: MethodStrategyContext,
): CallableStructureStrategy<GirMethod, GirMethod> {
    const { methodBody, options, selfTypeDescriptor, methodRenames } = context;
    const memberName = (method: GirMethod): string =>
        toValidMemberName(methodBody.resolveMethodName(method, methodRenames));
    return {
        buildRegular: (method) =>
            methodBody.buildMethodStructure(method, {
                methodName: methodBody.resolveMethodName(method, methodRenames),
                selfTypeDescriptor,
                sharedLibrary: options.sharedLibrary,
                namespace: options.namespace,
            }),
        buildAsync: (pair) =>
            methodBody.buildAsyncCallableStructure({
                asyncCallable: pair.async,
                finishCallable: pair.finish,
                callbackParameter: pair.callbackParameter,
                memberName: memberName(pair.async),
                finishMemberName: memberName(pair.finish),
                isStatic: false,
                sharedLibrary: options.sharedLibrary,
                namespace: options.namespace,
                self: { type: selfTypeDescriptor, value: "getHandle(this)" },
            }),
        buildStub: (method) =>
            methodBody.buildStubStructure(
                memberName(method),
                `${options.namespace}.${method.name}`,
                method.doc,
                options.namespace,
                false,
                method.parameters,
            ),
    };
}

/**
 * Context for {@link staticFunctionStructureStrategy}.
 */
export type StaticFunctionStrategyContext = {
    /** The writer that emits each function's body. */
    methodBody: MethodBodyWriter;
    /** The generator options for the owner's namespace and library. */
    options: FfiGeneratorOptions;
    /** The emitted owner class name. */
    ownerClassName: string;
    /** The owner's original GIR name, used for stub qualified names. */
    ownerOriginalName: string;
};

/**
 * Builds the {@link CallableStructureStrategy} for a type's static functions.
 */
export function staticFunctionStructureStrategy(
    context: StaticFunctionStrategyContext,
): CallableStructureStrategy<GirFunction, GirFunction> {
    const { methodBody, options, ownerClassName, ownerOriginalName } = context;
    return {
        buildRegular: (func) =>
            methodBody.buildStaticFunctionStructure(func, {
                className: ownerClassName,
                originalClassName: ownerOriginalName,
                sharedLibrary: options.sharedLibrary,
                namespace: options.namespace,
            }),
        buildAsync: (pair) =>
            methodBody.buildAsyncCallableStructure({
                asyncCallable: pair.async,
                finishCallable: pair.finish,
                callbackParameter: pair.callbackParameter,
                memberName: toValidMemberName(toCamelCase(pair.async.name)),
                finishMemberName: toValidMemberName(toCamelCase(pair.finish.name)),
                isStatic: true,
                sharedLibrary: options.sharedLibrary,
                namespace: options.namespace,
            }),
        buildStub: (func) =>
            methodBody.buildStubStructure(
                toValidMemberName(toCamelCase(func.name)),
                `${options.namespace}.${ownerOriginalName}.${func.name}`,
                func.doc,
                options.namespace,
                true,
                func.parameters,
            ),
    };
}
