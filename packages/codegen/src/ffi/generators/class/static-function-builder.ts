/**
 * Static Function Builder
 *
 * Builds static function code for classes.
 */

import {
    buildCallableStructures,
    createMethodBodyWriter,
    type ImportCollector,
    type MethodBodyWriter,
    type MethodStructure,
} from "../../../ffi-emitters/index.js";
import type { FfiGeneratorOptions } from "../../../generator-types.js";
import type { GirClass, GirFunction } from "../../../gir/index.js";
import type { FfiMapper } from "../../../type-system/ffi-mapper.js";
import { partitionSupportedFunctions } from "../../../utils/filtering.js";
import { normalizeClassName, toCamelCase, toValidMemberName } from "../../../utils/naming.js";
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
 * Options for {@link StaticFunctionBuilder}.
 */
export type StaticFunctionBuilderOptions = {
    cls: GirClass;
    ffiMapper: FfiMapper;
    imports: ImportCollector;
    options: FfiGeneratorOptions;
    selfNames?: ReadonlySet<string>;
};

/**
 * Builds static function code for a class.
 */
export class StaticFunctionBuilder {
    private readonly className: string;
    private readonly methodBody: MethodBodyWriter;
    private readonly parentStaticFunctionNames: Set<string>;
    private readonly cls: GirClass;
    private readonly options: FfiGeneratorOptions;

    constructor(opts: StaticFunctionBuilderOptions) {
        const { cls, ffiMapper, imports, options, selfNames } = opts;
        this.cls = cls;
        this.options = options;
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
