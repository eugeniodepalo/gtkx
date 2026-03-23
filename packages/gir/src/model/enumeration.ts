/**
 * Enumeration member.
 */
export class GirEnumerationMember {
    readonly name: string;
    readonly value: string;
    readonly cIdentifier: string;
    readonly doc?: string;

    constructor(data: {
        name: string;
        value: string;
        cIdentifier: string;
        doc?: string;
    }) {
        this.name = data.name;
        this.value = data.value;
        this.cIdentifier = data.cIdentifier;
        this.doc = data.doc;
    }
}

/**
 * Enumeration or bitfield with helper methods.
 */
export class GirEnumeration {
    readonly name: string;
    readonly qualifiedName: string;
    readonly cType: string;
    readonly members: GirEnumerationMember[];
    readonly glibGetType?: string;
    readonly doc?: string;

    constructor(data: {
        name: string;
        qualifiedName: string;
        cType: string;
        members: GirEnumerationMember[];
        glibGetType?: string;
        doc?: string;
    }) {
        this.name = data.name;
        this.qualifiedName = data.qualifiedName;
        this.cType = data.cType;
        this.members = data.members;
        this.glibGetType = data.glibGetType;
        this.doc = data.doc;
    }

    /** Finds a member by name. */
    getMember(name: string): GirEnumerationMember | null {
        return this.members.find((m) => m.name === name) ?? null;
    }

    /** Finds a member by value. */
    getMemberByValue(value: string): GirEnumerationMember | null {
        return this.members.find((m) => m.value === value) ?? null;
    }

    /** Gets all member names. */
    getMemberNames(): string[] {
        return this.members.map((m) => m.name);
    }
}
