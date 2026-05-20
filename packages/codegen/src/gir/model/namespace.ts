import type { GirAlias } from "./alias.js";
import type { GirFunction } from "./callables.js";
import type { GirCallback } from "./callback.js";
import type { GirClass } from "./class.js";
import type { GirConstant } from "./constant.js";
import type { GirEnumeration } from "./enumeration.js";
import type { GirInterface } from "./interface.js";
import type { GirRecord } from "./record.js";
import type { TypeKind } from "./repository-like.js";

/**
 * Constructor data for {@link GirNamespace}.
 */
export type GirNamespaceData = {
    name: string;
    version: string;
    sharedLibrary: string;
    cPrefix: string;
    classes: Map<string, GirClass>;
    interfaces: Map<string, GirInterface>;
    records: Map<string, GirRecord>;
    enumerations: Map<string, GirEnumeration>;
    bitfields: Map<string, GirEnumeration>;
    callbacks: Map<string, GirCallback>;
    functions: Map<string, GirFunction>;
    constants: Map<string, GirConstant>;
    aliases: Map<string, GirAlias>;
    doc?: string;
};

/**
 * Namespace containing all resolved types from a single GIR file.
 */
export class GirNamespace {
    readonly name: string;
    readonly version: string;
    readonly sharedLibrary: string;
    readonly cPrefix: string;
    readonly classes: Map<string, GirClass>;
    readonly interfaces: Map<string, GirInterface>;
    readonly records: Map<string, GirRecord>;
    readonly enumerations: Map<string, GirEnumeration>;
    readonly bitfields: Map<string, GirEnumeration>;
    readonly callbacks: Map<string, GirCallback>;
    readonly functions: Map<string, GirFunction>;
    readonly constants: Map<string, GirConstant>;
    readonly aliases: Map<string, GirAlias>;
    readonly doc?: string;

    constructor(data: GirNamespaceData) {
        this.name = data.name;
        this.version = data.version;
        this.sharedLibrary = data.sharedLibrary;
        this.cPrefix = data.cPrefix;
        this.classes = data.classes;
        this.interfaces = data.interfaces;
        this.records = data.records;
        this.enumerations = data.enumerations;
        this.bitfields = data.bitfields;
        this.callbacks = data.callbacks;
        this.functions = data.functions;
        this.constants = data.constants;
        this.aliases = data.aliases;
        this.doc = data.doc;
    }

    /**
     * Returns the {@link TypeKind} for a member declared in this namespace,
     * or `null` when the name is not a typed member (e.g. a function or
     * constant). Aliases are not reported by this lookup — use the repository
     * helpers when alias resolution is required.
     *
     * @param name - The member's unqualified name within this namespace.
     */
    lookupKind(name: string): TypeKind | null {
        if (this.classes.has(name)) return "class";
        if (this.interfaces.has(name)) return "interface";
        if (this.records.has(name)) return "record";
        if (this.enumerations.has(name)) return "enum";
        if (this.bitfields.has(name)) return "flags";
        if (this.callbacks.has(name)) return "callback";
        return null;
    }
}
