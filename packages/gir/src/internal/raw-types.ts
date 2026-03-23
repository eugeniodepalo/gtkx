import type { ContainerType } from "../model/type.js";

/**
 * A dependency declared via `<include>` in a GIR file.
 */
export type RawDependency = {
    name: string;
    version: string;
};

/**
 * Lightweight header extracted from a GIR file without full parsing.
 * Used to build the dependency graph before committing to full XML parsing.
 */
export type RawRepositoryHeader = {
    namespaceName: string;
    namespaceVersion: string;
    dependencies: RawDependency[];
};

export type RawNamespace = {
    name: string;
    version: string;
    sharedLibrary: string;
    cPrefix: string;
    classes: RawClass[];
    interfaces: RawInterface[];
    functions: RawFunction[];
    enumerations: RawEnumeration[];
    bitfields: RawEnumeration[];
    records: RawRecord[];
    callbacks: RawCallback[];
    constants: RawConstant[];
    aliases: RawAlias[];
    doc?: string;
};

export type RawClass = {
    name: string;
    cType: string;
    parent?: string;
    abstract?: boolean;
    glibTypeName?: string;
    glibGetType?: string;
    cSymbolPrefix?: string;
    fundamental?: boolean;
    refFunc?: string;
    unrefFunc?: string;
    implements: string[];
    methods: RawMethod[];
    constructors: RawConstructor[];
    functions: RawFunction[];
    properties: RawProperty[];
    signals: RawSignal[];
    doc?: string;
};

export type RawInterface = {
    name: string;
    cType: string;
    glibTypeName?: string;
    prerequisites: string[];
    methods: RawMethod[];
    properties: RawProperty[];
    signals: RawSignal[];
    doc?: string;
};

export type RawRecord = {
    name: string;
    cType: string;
    opaque?: boolean;
    disguised?: boolean;
    glibTypeName?: string;
    glibGetType?: string;
    isGtypeStructFor?: string;
    copyFunction?: string;
    freeFunction?: string;
    fields: RawField[];
    methods: RawMethod[];
    constructors: RawConstructor[];
    functions: RawFunction[];
    doc?: string;
};

export type RawEnumeration = {
    name: string;
    cType: string;
    members: RawEnumerationMember[];
    glibGetType?: string;
    doc?: string;
};

export type RawEnumerationMember = {
    name: string;
    value: string;
    cIdentifier: string;
    doc?: string;
};

export type RawCallback = {
    name: string;
    cType: string;
    returnType: RawType;
    parameters: RawParameter[];
    doc?: string;
};

export type RawConstant = {
    name: string;
    cType: string;
    value: string;
    type: RawType;
    doc?: string;
};

export type RawAlias = {
    name: string;
    cType: string;
    targetType: RawType;
    doc?: string;
};

export type RawMethod = {
    name: string;
    cIdentifier: string;
    returnType: RawType;
    parameters: RawParameter[];
    instanceParameter?: RawParameter;
    throws?: boolean;
    doc?: string;
    returnDoc?: string;
    finishFunc?: string;
    shadows?: string;
    shadowedBy?: string;
};

export type RawConstructor = {
    name: string;
    cIdentifier: string;
    returnType: RawType;
    parameters: RawParameter[];
    throws?: boolean;
    doc?: string;
    returnDoc?: string;
    shadows?: string;
    shadowedBy?: string;
};

export type RawFunction = {
    name: string;
    cIdentifier: string;
    returnType: RawType;
    parameters: RawParameter[];
    throws?: boolean;
    doc?: string;
    returnDoc?: string;
    shadows?: string;
    shadowedBy?: string;
};

export type RawParameter = {
    name: string;
    type: RawType;
    direction?: "in" | "out" | "inout";
    callerAllocates?: boolean;
    nullable?: boolean;
    optional?: boolean;
    scope?: "async" | "call" | "notified" | "forever";
    closure?: number;
    destroy?: number;
    transferOwnership?: "none" | "full" | "container";
    doc?: string;
};

export type RawType = {
    name: string;
    cType?: string;
    isArray?: boolean;
    elementType?: RawType;
    typeParameters?: RawType[];
    containerType?: ContainerType;
    transferOwnership?: "none" | "full" | "container";
    nullable?: boolean;
    sizeParamIndex?: number;
    zeroTerminated?: boolean;
    fixedSize?: number;
};

export type RawProperty = {
    name: string;
    type: RawType;
    readable?: boolean;
    writable?: boolean;
    constructOnly?: boolean;
    defaultValueRaw?: string;
    getter?: string;
    setter?: string;
    doc?: string;
};

export type RawSignal = {
    name: string;
    when?: "first" | "last" | "cleanup";
    returnType?: RawType;
    parameters?: RawParameter[];
    doc?: string;
};

export type RawField = {
    name: string;
    type: RawType;
    writable?: boolean;
    readable?: boolean;
    private?: boolean;
    doc?: string;
};
