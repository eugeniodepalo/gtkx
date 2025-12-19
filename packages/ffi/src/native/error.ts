import { read } from "@gtkx/native";

/**
 * Error class that wraps a GLib GError.
 * Extends the native JavaScript Error with GError-specific properties.
 */
export class NativeError extends Error {
    /** The raw GError pointer */
    readonly id: unknown;

    /** The GLib error domain (GQuark) */
    readonly domain: number;

    /** The error code within the domain */
    readonly code: number;

    /**
     * Creates a NativeError from a GError pointer.
     * @param id - The GError pointer from a failed FFI call
     */
    constructor(id: unknown) {
        const message = read(id, { type: "string" }, 8) as string;
        super(message ?? "Unknown error");

        this.id = id;
        this.domain = read(id, { type: "int", size: 32, unsigned: true }, 0) as number;
        this.code = read(id, { type: "int", size: 32, unsigned: false }, 4) as number;

        this.name = "NativeError";

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, NativeError);
        }
    }
}
