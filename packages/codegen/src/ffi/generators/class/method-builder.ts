/**
 * Method Builder
 *
 * Builds instance method code for classes.
 */

import type { FfiGeneratorOptions } from "../../../core/generator-types.js";
import type { FfiMapper } from "../../../core/type-system/ffi-mapper.js";
import type { SelfTypeDescriptor } from "../../../core/type-system/ffi-types.js";
import { type AsyncCallablePair, collectAsyncCallablePairs } from "../../../core/utils/async-callable.js";
import { partitionSupportedMethods } from "../../../core/utils/filtering.js";
import { toValidMemberName } from "../../../core/utils/naming.js";
import {
    createMethodBodyWriter,
    type ImportCollector,
    type MethodBodyWriter,
    type MethodStructure,
} from "../../../core/writers/index.js";
import type { GirMethod, GirParameter } from "../../../gir/index.js";

/**
 * Builds method code for a class.
 */
export class MethodBuilder {
    private readonly methodBody: MethodBodyWriter;

    constructor(
        ffiMapper: FfiMapper,
        imports: ImportCollector,
        private readonly methodRenames: Map<string, string>,
        private readonly options: FfiGeneratorOptions,
        selfNames?: ReadonlySet<string>,
    ) {
        this.methodBody = createMethodBodyWriter(ffiMapper, imports, {
            sharedLibrary: options.sharedLibrary,
            glibLibrary: options.glibLibrary,
            selfNames,
        });
    }

    /**
     * Builds method structures for all methods. Returns structures for batch
     * adding by ClassGenerator.
     *
     * @param methods - The methods to build structures for
     * @param selfTypeDescriptor - The self type descriptor for instance methods
     * @returns Array of method structures
     */
    buildStructures(methods: readonly GirMethod[], selfTypeDescriptor: SelfTypeDescriptor): MethodStructure[] {
        const { supported, unsupported } = partitionSupportedMethods(
            methods,
            (params) => this.methodBody.hasUnsupportedCallbacks(params),
            (returnType) => this.methodBody.isReturnTypeUnsafe(returnType),
        );

        const asyncPairs = collectAsyncCallablePairs(supported, methods);

        return [
            ...supported.map((method) => {
                const pair = asyncPairs.get(method.name);
                return pair
                    ? this.buildAsyncMethodStructure(pair, selfTypeDescriptor)
                    : this.buildMethodStructure(method, selfTypeDescriptor);
            }),
            ...unsupported.map((method) => this.buildMethodStub(method)),
        ];
    }

    private buildAsyncMethodStructure(
        pair: AsyncCallablePair<GirMethod, GirMethod>,
        selfTypeDescriptor: SelfTypeDescriptor,
    ): MethodStructure {
        return this.methodBody.buildAsyncCallableStructure({
            asyncCallable: pair.async,
            finishCallable: pair.finish,
            callbackParameter: pair.callbackParameter,
            memberName: toValidMemberName(this.methodBody.resolveMethodName(pair.async, this.methodRenames)),
            finishMemberName: toValidMemberName(this.methodBody.resolveMethodName(pair.finish, this.methodRenames)),
            isStatic: false,
            sharedLibrary: this.options.sharedLibrary,
            namespace: this.options.namespace,
            self: { type: selfTypeDescriptor, value: "getHandle(this)" },
        });
    }

    private buildMethodStub(method: GirMethod): MethodStructure {
        return this.methodBody.buildStubStructure(
            toValidMemberName(this.methodBody.resolveMethodName(method, this.methodRenames)),
            `${this.options.namespace}.${method.name}`,
            method.doc,
            this.options.namespace,
            false,
        );
    }

    private buildMethodStructure(method: GirMethod, selfTypeDescriptor: SelfTypeDescriptor): MethodStructure {
        return this.methodBody.buildMethodStructure(method, {
            methodName: this.methodBody.resolveMethodName(method, this.methodRenames),
            selfTypeDescriptor,
            sharedLibrary: this.options.sharedLibrary,
            namespace: this.options.namespace,
        });
    }

    /**
     * Checks if a parameter list has unsupported callbacks.
     */
    hasUnsupportedCallbacks(parameters: readonly GirParameter[]): boolean {
        return this.methodBody.hasUnsupportedCallbacks(parameters);
    }
}
