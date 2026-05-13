import { isIntrinsicType, isNumericType, isStringType, isVoidType } from "../intrinsics.js";

/**
 * Container type discriminator for generic GLib containers.
 */
export type ContainerType = "ghashtable" | "gptrarray" | "garray" | "gbytearray" | "glist" | "gslist";

/**
 * Type reference with helper methods.
 *
 * Type names are either fully qualified (`"Gtk.Widget"`) for namespace types
 * or unqualified (`"gint"`, `"utf8"`) for intrinsic types.
 */
export class GirType {
    readonly name: string;
    readonly cType?: string;
    readonly isArray: boolean;
    readonly elementType: GirType | null;
    readonly typeParameters: readonly GirType[];
    readonly containerType?: ContainerType;
    readonly transferOwnership?: "none" | "full" | "container";
    readonly nullable: boolean;
    readonly sizeParamIndex?: number;
    readonly zeroTerminated?: boolean;
    readonly fixedSize?: number;

    constructor(data: {
        name: string;
        cType?: string;
        isArray: boolean;
        elementType: GirType | null;
        typeParameters?: readonly GirType[];
        containerType?: ContainerType;
        transferOwnership?: "none" | "full" | "container";
        nullable: boolean;
        sizeParamIndex?: number;
        zeroTerminated?: boolean;
        fixedSize?: number;
    }) {
        this.name = data.name;
        this.cType = data.cType;
        this.isArray = data.isArray;
        this.elementType = data.elementType;
        this.typeParameters = data.typeParameters ?? [];
        this.containerType = data.containerType;
        this.transferOwnership = data.transferOwnership;
        this.nullable = data.nullable;
        this.sizeParamIndex = data.sizeParamIndex;
        this.zeroTerminated = data.zeroTerminated;
        this.fixedSize = data.fixedSize;
    }

    /** True if this is an intrinsic/primitive type. */
    isIntrinsic(): boolean {
        return isIntrinsicType(this.name);
    }

    /** True if this is a string type (utf8 or filename). */
    isString(): boolean {
        return isStringType(this.name);
    }

    /** True if this is a numeric type. */
    isNumeric(): boolean {
        return isNumericType(this.name);
    }

    /** True if this is a boolean type. */
    isBoolean(): boolean {
        return this.name === "gboolean";
    }

    /** True if this is void. */
    isVoid(): boolean {
        return isVoidType(this.name);
    }

    /** True if this is GVariant. */
    isVariant(): boolean {
        return this.name === "GVariant";
    }

    /** True if this is GParamSpec. */
    isParamSpec(): boolean {
        return this.name === "GParamSpec";
    }

    /** True if this is a GHashTable container. */
    isHashTable(): boolean {
        return this.containerType === "ghashtable";
    }

    /** True if this is a GPtrArray container. */
    isPtrArray(): boolean {
        return this.containerType === "gptrarray";
    }

    /** True if this is a GArray container. */
    isGArray(): boolean {
        return this.containerType === "garray";
    }

    /** True if this is a GByteArray container. */
    isByteArray(): boolean {
        return this.containerType === "gbytearray";
    }

    /** True if this is a GList or GSList container. */
    isList(): boolean {
        return this.containerType === "glist" || this.containerType === "gslist";
    }

    /** True if this is any generic container type. */
    isGenericContainer(): boolean {
        return this.containerType !== undefined;
    }

    /** Gets the key type for GHashTable, or null for other types. */
    getKeyType(): GirType | null {
        if (!this.isHashTable() || this.typeParameters.length < 1) return null;
        return this.typeParameters[0] ?? null;
    }

    /** Gets the value type for GHashTable, or null for other types. */
    getValueType(): GirType | null {
        if (!this.isHashTable() || this.typeParameters.length < 2) return null;
        return this.typeParameters[1] ?? null;
    }

    /** Gets the namespace part of a qualified name, or null for intrinsics. */
    getNamespace(): string | null {
        if (this.isIntrinsic()) return null;
        const dot = this.name.indexOf(".");
        return dot >= 0 ? this.name.slice(0, dot) : null;
    }

    /** Gets the simple name part (without namespace). */
    getSimpleName(): string {
        if (this.isIntrinsic()) return this.name;
        const dot = this.name.indexOf(".");
        return dot >= 0 ? this.name.slice(dot + 1) : this.name;
    }
}
