import type { GirParameter } from "./parameter.js";
import type { GirType } from "./type.js";

/**
 * Method on a class, interface, or record.
 */
export class GirMethod {
    readonly name: string;
    readonly cIdentifier: string;
    readonly returnType: GirType;
    readonly parameters: GirParameter[];
    readonly instanceParameter?: GirParameter;
    readonly throws: boolean;
    readonly doc?: string;
    readonly returnDoc?: string;
    readonly finishFunc?: string;
    readonly shadows?: string;
    readonly shadowedBy?: string;

    constructor(data: {
        name: string;
        cIdentifier: string;
        returnType: GirType;
        parameters: GirParameter[];
        instanceParameter?: GirParameter;
        throws: boolean;
        doc?: string;
        returnDoc?: string;
        finishFunc?: string;
        shadows?: string;
        shadowedBy?: string;
    }) {
        this.name = data.name;
        this.cIdentifier = data.cIdentifier;
        this.returnType = data.returnType;
        this.parameters = data.parameters;
        this.instanceParameter = data.instanceParameter;
        this.throws = data.throws;
        this.doc = data.doc;
        this.returnDoc = data.returnDoc;
        this.finishFunc = data.finishFunc;
        this.shadows = data.shadows;
        this.shadowedBy = data.shadowedBy;
    }

    /** True if this follows the async/finish pattern. */
    isAsync(): boolean {
        return this.name.endsWith("_async") || this.parameters.some((p) => p.scope === "async");
    }

    /** True if this is a _finish method for an async operation. */
    isAsyncFinish(): boolean {
        return this.name.endsWith("_finish");
    }

    /** Gets the corresponding _finish method name if this is async. */
    getFinishMethodName(): string | null {
        if (this.name.endsWith("_async")) {
            return this.name.replace(/_async$/, "_finish");
        }
        return null;
    }

    /** Gets required (non-optional, non-nullable) input parameters. */
    getRequiredParameters(): GirParameter[] {
        return this.parameters.filter((p) => !p.optional && !p.nullable && p.direction === "in");
    }

    /** Gets optional parameters. */
    getOptionalParameters(): GirParameter[] {
        return this.parameters.filter((p) => p.optional || p.nullable);
    }

    /** True if any parameter is an out parameter. */
    hasOutParameters(): boolean {
        return this.parameters.some((p) => p.direction === "out" || p.direction === "inout");
    }

    /** Gets out parameters only. */
    getOutParameters(): GirParameter[] {
        return this.parameters.filter((p) => p.direction === "out" || p.direction === "inout");
    }
}

/**
 * Constructor for a class or record.
 */
export class GirConstructor {
    readonly name: string;
    readonly cIdentifier: string;
    readonly returnType: GirType;
    readonly parameters: GirParameter[];
    readonly throws: boolean;
    readonly doc?: string;
    readonly returnDoc?: string;
    readonly shadows?: string;
    readonly shadowedBy?: string;

    constructor(data: {
        name: string;
        cIdentifier: string;
        returnType: GirType;
        parameters: GirParameter[];
        throws: boolean;
        doc?: string;
        returnDoc?: string;
        shadows?: string;
        shadowedBy?: string;
    }) {
        this.name = data.name;
        this.cIdentifier = data.cIdentifier;
        this.returnType = data.returnType;
        this.parameters = data.parameters;
        this.throws = data.throws;
        this.doc = data.doc;
        this.returnDoc = data.returnDoc;
        this.shadows = data.shadows;
        this.shadowedBy = data.shadowedBy;
    }

    /** Gets required (non-optional, non-nullable) input parameters. */
    getRequiredParameters(): GirParameter[] {
        return this.parameters.filter((p) => !p.optional && !p.nullable && p.direction === "in");
    }
}

/**
 * Standalone function or static method.
 */
export class GirFunction {
    readonly name: string;
    readonly cIdentifier: string;
    readonly returnType: GirType;
    readonly parameters: GirParameter[];
    readonly throws: boolean;
    readonly doc?: string;
    readonly returnDoc?: string;
    readonly shadows?: string;
    readonly shadowedBy?: string;

    constructor(data: {
        name: string;
        cIdentifier: string;
        returnType: GirType;
        parameters: GirParameter[];
        throws: boolean;
        doc?: string;
        returnDoc?: string;
        shadows?: string;
        shadowedBy?: string;
    }) {
        this.name = data.name;
        this.cIdentifier = data.cIdentifier;
        this.returnType = data.returnType;
        this.parameters = data.parameters;
        this.throws = data.throws;
        this.doc = data.doc;
        this.returnDoc = data.returnDoc;
        this.shadows = data.shadows;
        this.shadowedBy = data.shadowedBy;
    }

    /** True if this follows the async/finish pattern. */
    isAsync(): boolean {
        return this.name.endsWith("_async") || this.parameters.some((p) => p.scope === "async");
    }

    /** Gets required (non-optional, non-nullable) input parameters. */
    getRequiredParameters(): GirParameter[] {
        return this.parameters.filter((p) => !p.optional && !p.nullable && p.direction === "in");
    }
}
