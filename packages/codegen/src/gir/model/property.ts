import type { GirType } from "./type.js";

/**
 * Parsed default value from GIR property definitions.
 */
export type DefaultValue =
    | { kind: "null" }
    | { kind: "boolean"; value: boolean }
    | { kind: "number"; value: number }
    | { kind: "string"; value: string }
    | { kind: "enum"; cIdentifier: string }
    | { kind: "unknown"; raw: string };

/**
 * Parses a raw default value string from GIR into a typed DefaultValue.
 */
export function parseDefaultValue(raw: string | undefined): DefaultValue | null {
    if (raw === undefined) return null;
    if (raw === "NULL") return { kind: "null" };
    if (raw === "TRUE") return { kind: "boolean", value: true };
    if (raw === "FALSE") return { kind: "boolean", value: false };

    const num = Number(raw);
    if (!Number.isNaN(num)) return { kind: "number", value: num };

    if (raw.startsWith('"') && raw.endsWith('"')) {
        return { kind: "string", value: raw.slice(1, -1) };
    }

    if (/^[A-Z][A-Z0-9_]*$/.test(raw)) {
        return { kind: "enum", cIdentifier: raw };
    }

    return { kind: "unknown", raw };
}

/**
 * GObject property with helper methods.
 */
export class GirProperty {
    readonly name: string;
    readonly type: GirType;
    readonly readable: boolean;
    readonly writable: boolean;
    readonly constructOnly: boolean;
    readonly defaultValue: DefaultValue | null;
    readonly getter?: string;
    readonly setter?: string;
    readonly doc?: string;

    constructor(data: {
        name: string;
        type: GirType;
        readable: boolean;
        writable: boolean;
        constructOnly: boolean;
        defaultValue: DefaultValue | null;
        getter?: string;
        setter?: string;
        doc?: string;
    }) {
        this.name = data.name;
        this.type = data.type;
        this.readable = data.readable;
        this.writable = data.writable;
        this.constructOnly = data.constructOnly;
        this.defaultValue = data.defaultValue;
        this.getter = data.getter;
        this.setter = data.setter;
        this.doc = data.doc;
    }

    /** True if this property has a default value. */
    get hasDefault(): boolean {
        return this.defaultValue !== null;
    }

    /** True if readable but not writable. */
    isReadOnly(): boolean {
        return this.readable && !this.writable;
    }

    /** True if writable but not readable. */
    isWriteOnly(): boolean {
        return this.writable && !this.readable;
    }

    /** True if can only be set during construction. */
    isConstructOnly(): boolean {
        return this.constructOnly;
    }

    /** True if has both getter and setter methods. */
    hasAccessors(): boolean {
        return this.getter !== undefined && this.setter !== undefined;
    }
}
