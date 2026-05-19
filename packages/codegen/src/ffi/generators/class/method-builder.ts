/**
 * Method Builder
 *
 * Builds instance method code for classes.
 */

import type { FfiGeneratorOptions } from "../../../core/generator-types.js";
import type { FfiMapper } from "../../../core/type-system/ffi-mapper.js";
import type { SelfTypeDescriptor } from "../../../core/type-system/ffi-types.js";
import { partitionSupportedMethods } from "../../../core/utils/filtering.js";
import {
    buildCallableStructures,
    createMethodBodyWriter,
    type ImportCollector,
    type MethodBodyWriter,
    type MethodStructure,
} from "../../../core/writers/index.js";
import type { GirMethod, GirParameter } from "../../../gir/index.js";
import { methodStructureStrategy } from "../callable-strategies.js";

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
