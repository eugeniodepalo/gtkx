/**
 * Method Builder
 *
 * Builds instance method code for classes.
 */

import {
    buildCallableStructures,
    createMethodBodyWriter,
    type ImportCollector,
    type MethodBodyWriter,
    type MethodStructure,
} from "../../../ffi-emitters/index.js";
import type { FfiGeneratorOptions } from "../../../generator-types.js";
import type { GirMethod, GirParameter } from "../../../gir/index.js";
import type { FfiMapper } from "../../../type-system/ffi-mapper.js";
import type { SelfTypeDescriptor } from "../../../type-system/ffi-types.js";
import { partitionSupportedMethods } from "../../../utils/filtering.js";
import { methodStructureStrategy } from "../callable-strategies.js";

/**
 * Options for {@link MethodBuilder}.
 */
export type MethodBuilderOptions = {
    ffiMapper: FfiMapper;
    imports: ImportCollector;
    methodRenames: Map<string, string>;
    options: FfiGeneratorOptions;
    selfNames?: ReadonlySet<string>;
};

/**
 * Builds method code for a class.
 */
export class MethodBuilder {
    private readonly methodBody: MethodBodyWriter;
    private readonly methodRenames: Map<string, string>;
    private readonly options: FfiGeneratorOptions;

    constructor(opts: MethodBuilderOptions) {
        const { ffiMapper, imports, methodRenames, options, selfNames } = opts;
        this.methodRenames = methodRenames;
        this.options = options;
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
        const partition = partitionSupportedMethods(
            methods,
            (params) => this.methodBody.hasUnsupportedCallbacks(params),
            (returnType) => this.methodBody.isReturnTypeUnsafe(returnType),
        );
        return buildCallableStructures(
            partition,
            methods,
            methodStructureStrategy({
                methodBody: this.methodBody,
                options: this.options,
                selfTypeDescriptor,
                methodRenames: this.methodRenames,
            }),
        );
    }

    /**
     * Checks if a parameter list has unsupported callbacks.
     */
    hasUnsupportedCallbacks(parameters: readonly GirParameter[]): boolean {
        return this.methodBody.hasUnsupportedCallbacks(parameters);
    }
}
