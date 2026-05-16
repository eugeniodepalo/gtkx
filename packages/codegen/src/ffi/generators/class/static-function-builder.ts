/**
 * Static Function Builder
 *
 * Builds static function code for classes.
 */

import type { FfiGeneratorOptions } from "../../../core/generator-types.js";
import type { FfiMapper } from "../../../core/type-system/ffi-mapper.js";
import { partitionSupportedFunctions } from "../../../core/utils/filtering.js";
import { normalizeClassName, toCamelCase, toValidMemberName } from "../../../core/utils/naming.js";
import {
    createMethodBodyWriter,
    type ImportCollector,
    type MethodBodyWriter,
    type MethodStructure,
} from "../../../core/writers/index.js";
import type { GirClass, GirFunction } from "../../../gir/index.js";

function collectParentStaticFunctionNames(cls: GirClass): Set<string> {
    const names = new Set<string>();
    let current = cls.getParent();
    while (current) {
        for (const func of current.staticFunctions) {
            names.add(toValidMemberName(toCamelCase(func.name)));
        }
        current = current.getParent();
    }
    return names;
}

/**
 * Builds static function code for a class.
 */
export class StaticFunctionBuilder {
    private readonly className: string;
    private readonly methodBody: MethodBodyWriter;
    private readonly parentStaticFunctionNames: Set<string>;

    constructor(
        private readonly cls: GirClass,
        ffiMapper: FfiMapper,
        imports: ImportCollector,
        private readonly options: FfiGeneratorOptions,
        selfNames?: ReadonlySet<string>,
    ) {
        this.className = normalizeClassName(cls.name);
        this.methodBody = createMethodBodyWriter(ffiMapper, imports, {
            sharedLibrary: options.sharedLibrary,
            glibLibrary: options.glibLibrary,
            selfNames,
        });
        this.parentStaticFunctionNames = collectParentStaticFunctionNames(cls);
    }

    buildStructures(): MethodStructure[] {
        const { supported: supportedFunctions, unsupported: unsupportedFunctions } = partitionSupportedFunctions(
            this.cls.staticFunctions,
            (params) => this.methodBody.hasUnsupportedCallbacks(params),
            (returnType) => this.methodBody.isReturnTypeUnsafe(returnType),
        );

        const isInherited = (func: GirFunction): boolean =>
            this.parentStaticFunctionNames.has(toValidMemberName(toCamelCase(func.name)));

        return [
            ...supportedFunctions
                .filter((func) => !isInherited(func))
                .map((func) => this.buildStaticFunctionStructure(func)),
            ...unsupportedFunctions
                .filter((func) => !isInherited(func))
                .map((func) => this.buildStaticFunctionStub(func)),
        ];
    }

    private buildStaticFunctionStructure(func: GirFunction): MethodStructure {
        return this.methodBody.buildStaticFunctionStructure(func, {
            className: this.className,
            originalClassName: this.cls.name,
            sharedLibrary: this.options.sharedLibrary,
            namespace: this.options.namespace,
        });
    }

    private buildStaticFunctionStub(func: GirFunction): MethodStructure {
        return this.methodBody.buildStubStructure(
            toValidMemberName(toCamelCase(func.name)),
            `${this.options.namespace}.${this.cls.name}.${func.name}`,
            func.doc,
            this.options.namespace,
            true,
        );
    }
}
