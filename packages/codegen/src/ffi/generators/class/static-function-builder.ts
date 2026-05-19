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
    buildCallableStructures,
    createMethodBodyWriter,
    type ImportCollector,
    type MethodBodyWriter,
    type MethodStructure,
} from "../../../core/writers/index.js";
import type { GirClass, GirFunction } from "../../../gir/index.js";
import { staticFunctionStructureStrategy } from "../callable-strategies.js";

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
        const { supported, unsupported } = partitionSupportedFunctions(
            this.cls.staticFunctions,
            (params) => this.methodBody.hasUnsupportedCallbacks(params),
            (returnType) => this.methodBody.isReturnTypeUnsafe(returnType),
        );
        const isInherited = (func: GirFunction): boolean =>
            this.parentStaticFunctionNames.has(toValidMemberName(toCamelCase(func.name)));
        const partition = {
            supported: supported.filter((func) => !isInherited(func)),
            unsupported: unsupported.filter((func) => !isInherited(func)),
        };
        return buildCallableStructures(
            partition,
            this.cls.staticFunctions,
            staticFunctionStructureStrategy({
                methodBody: this.methodBody,
                options: this.options,
                ownerClassName: this.className,
                ownerOriginalName: this.cls.name,
            }),
        );
    }
}
