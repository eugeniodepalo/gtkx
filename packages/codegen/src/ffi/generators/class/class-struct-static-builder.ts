/**
 * Class-Struct Static Builder
 *
 * GIR exposes class-level operations as `<method>` elements on a class's
 * gtype-struct record (e.g. `GtkWidgetClass` for `GtkWidget`). ts-for-gir's
 * node-gtk output hoists those onto the owning class as static methods, so
 * this builder locates the gtype-struct record for a class and emits each of
 * its methods as a static, marshaling the class-struct pointer from the first
 * argument.
 *
 * `GObject.Object` is excluded: the node-gtk contract models the `GObjectClass`
 * operations on a dedicated `ObjectClass` interface rather than as statics on
 * `Object`, so hoisting them there would diverge from the contract.
 */

import {
    createMethodBodyWriter,
    type ImportCollector,
    type MethodBodyWriter,
    type MethodStructure,
} from "../../../ffi-emitters/index.js";
import type { FfiGeneratorOptions } from "../../../generator-types.js";
import type { GirClass, GirMethod, GirRecord, GirRepository } from "../../../gir/index.js";
import type { FfiMapper } from "../../../type-system/ffi-mapper.js";
import { partitionSupportedMethods } from "../../../utils/filtering.js";
import { toCamelCase, toValidMemberName } from "../../../utils/naming.js";

/**
 * Qualified names of classes whose gtype-struct operations the node-gtk
 * contract models on a dedicated `*Class` interface rather than as statics on
 * the class itself. Hoisting their class-struct methods would diverge from the
 * contract, so this builder emits nothing for them.
 */
const CLASS_STRUCT_STATIC_EXCLUDED: ReadonlySet<string> = new Set(["GObject.Object"]);

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
        if (CLASS_STRUCT_STATIC_EXCLUDED.has(this.cls.qualifiedName)) return [];

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
            method.parameters,
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
