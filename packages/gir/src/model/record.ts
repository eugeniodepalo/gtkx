import type { GirConstructor, GirFunction, GirMethod } from "./callables.js";
import type { GirField } from "./field.js";

/**
 * Record (boxed type or plain struct) with helper methods.
 */
export class GirRecord {
    readonly name: string;
    readonly qualifiedName: string;
    readonly cType: string;
    readonly opaque: boolean;
    readonly disguised: boolean;
    readonly glibTypeName?: string;
    readonly glibGetType?: string;
    readonly isGtypeStructFor?: string;
    readonly copyFunction?: string;
    readonly freeFunction?: string;
    readonly fields: GirField[];
    readonly methods: GirMethod[];
    readonly constructors: GirConstructor[];
    readonly staticFunctions: GirFunction[];
    readonly doc?: string;

    constructor(data: {
        name: string;
        qualifiedName: string;
        cType: string;
        opaque: boolean;
        disguised: boolean;
        glibTypeName?: string;
        glibGetType?: string;
        isGtypeStructFor?: string;
        copyFunction?: string;
        freeFunction?: string;
        fields: GirField[];
        methods: GirMethod[];
        constructors: GirConstructor[];
        staticFunctions: GirFunction[];
        doc?: string;
    }) {
        this.name = data.name;
        this.qualifiedName = data.qualifiedName;
        this.cType = data.cType;
        this.opaque = data.opaque;
        this.disguised = data.disguised;
        this.glibTypeName = data.glibTypeName;
        this.glibGetType = data.glibGetType;
        this.isGtypeStructFor = data.isGtypeStructFor;
        this.copyFunction = data.copyFunction;
        this.freeFunction = data.freeFunction;
        this.fields = data.fields;
        this.methods = data.methods;
        this.constructors = data.constructors;
        this.staticFunctions = data.staticFunctions;
        this.doc = data.doc;
    }

    /** True if this has custom copy/free functions. */
    isFundamental(): boolean {
        return this.copyFunction !== undefined && this.freeFunction !== undefined;
    }

    /** True if this is a GLib boxed type (has glibTypeName). */
    isBoxed(): boolean {
        return this.glibTypeName !== undefined;
    }

    /** True if this is a GType struct (vtable for a class/interface). */
    isGtypeStruct(): boolean {
        return this.isGtypeStructFor !== undefined;
    }

    /** True if this is a plain C struct (no GType, has public fields). */
    isPlainStruct(): boolean {
        return !this.glibTypeName && !this.opaque && this.getPublicFields().length > 0;
    }

    /** Gets public (non-private) fields only. */
    getPublicFields(): GirField[] {
        return this.fields.filter((f) => !f.private);
    }

    /** Finds a method by name. */
    getMethod(name: string): GirMethod | null {
        return this.methods.find((m) => m.name === name) ?? null;
    }

    /** Finds a field by name. */
    getField(name: string): GirField | null {
        return this.fields.find((f) => f.name === name) ?? null;
    }

    /** Finds a constructor by name. */
    getConstructor(name: string): GirConstructor | null {
        return this.constructors.find((c) => c.name === name) ?? null;
    }
}
