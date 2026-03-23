import type { NativeHandle } from "@gtkx/native";

export abstract class NativeObject {
    static readonly glibTypeName: string;
    static readonly objectType: "gobject" | "interface" | "boxed" | "struct" | "fundamental";
    handle: NativeHandle;

    constructor(handle: NativeHandle) {
        this.handle = handle;
    }
}

// biome-ignore lint/suspicious/noExplicitAny: Required for contravariant constructor type compatibility
export type NativeClass<T extends NativeObject = NativeObject> = (new (
    ...args: any[]
) => T) & {
    readonly glibTypeName: string;
    readonly objectType: "gobject" | "interface" | "boxed" | "struct" | "fundamental";
};

export type { NativeHandle };
