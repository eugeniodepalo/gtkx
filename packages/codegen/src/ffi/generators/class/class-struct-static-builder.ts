/**
 * Class-Struct Static Builder
 *
 * GIR exposes class-level operations as `<method>` elements on a class's
 * gtype-struct record (e.g. `GtkWidgetClass` for `GtkWidget`). ts-for-gir
 * hoists those onto the owning class as static methods. This builder locates
 * the gtype-struct record for a class and emits each of its methods as a
 * static, marshaling the class-struct pointer from the first argument.
 */

import type { FfiGeneratorOptions } from "../../../core/generator-types.js";
import type { FfiMapper } from "../../../core/type-system/ffi-mapper.js";
import { partitionSupportedMethods } from "../../../core/utils/filtering.js";
import { toCamelCase, toValidMemberName } from "../../../core/utils/naming.js";
import {
    createMethodBodyWriter,
    type ImportCollector,
    type MethodBodyWriter,
    type MethodStructure,
} from "../../../core/writers/index.js";
import type { GirClass, GirMethod, GirRecord, GirRepository } from "../../../gir/index.js";

/**
 * Builds static methods on a class from its gtype-struct record's methods.
 */
export class ClassStructStaticBuilder {
    private readonly methodBody: MethodBodyWriter;

    constructor(
        private readonly cls: GirClass,
        ffiMapper: FfiMapper,
        imports: ImportCollector,
        private readonly repository: GirRepository,
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
     * Builds static method structures for every marshalable method on the
     * class's gtype-struct record. Unmarshalable methods are emitted as
     * throwing stubs so the runtime surface stays complete.
     */
    buildStructures(): MethodStructure[] {
        const record = this.findClassStructRecord();
        if (!record) return [];

        const { supported, unsupported } = partitionSupportedMethods(
            record.methods,
            (params) => this.methodBody.hasUnsupportedCallbacks(params),
            (returnType) => this.methodBody.isReturnTypeUnsafe(returnType),
        );

        return [
            ...supported.map((method) => this.buildStatic(method)),
            ...unsupported.map((method) => this.buildStub(method)),
        ];
    }

    private buildStatic(method: GirMethod): MethodStructure {
        return this.methodBody.buildClassStructStaticStructure(method, {
            sharedLibrary: this.options.sharedLibrary,
            namespace: this.options.namespace,
        });
    }

    private buildStub(method: GirMethod): MethodStructure {
        return this.methodBody.buildStubStructure(
            toValidMemberName(toCamelCase(method.name)),
            `${this.options.namespace}.${this.cls.name}.${method.name}`,
            method.doc,
            this.options.namespace,
            true,
        );
    }

    private findClassStructRecord(): GirRecord | null {
        const [namespace] = this.cls.qualifiedName.includes(".")
            ? this.cls.qualifiedName.split(".")
            : [this.options.namespace];
        const ns = this.repository.getNamespace(namespace ?? this.options.namespace);
        if (!ns) return null;
        for (const record of ns.records.values()) {
            if (record.isGtypeStructFor === this.cls.name && record.methods.length > 0) {
                return record;
            }
        }
        return null;
    }
}
