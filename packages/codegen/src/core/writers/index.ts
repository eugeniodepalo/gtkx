import type { FfiMapper } from "../type-system/ffi-mapper.js";
import { FfiTypeWriter } from "./ffi-type-writer.js";
import { type ImportCollector, MethodBodyWriter } from "./method-body-writer.js";

export type { MethodStructure } from "./method-body-writer.js";
export type { ImportCollector, MethodBodyWriter };

type CreateMethodBodyWriterOptions = {
    sharedLibrary?: string;
    glibLibrary?: string;
};

export const createMethodBodyWriter = (
    ffiMapper: FfiMapper,
    imports: ImportCollector,
    options: CreateMethodBodyWriterOptions = {},
): MethodBodyWriter => {
    const ffiTypeWriter = new FfiTypeWriter({
        currentSharedLibrary: options.sharedLibrary,
        glibLibrary: options.glibLibrary,
    });

    return new MethodBodyWriter(ffiMapper, imports, ffiTypeWriter);
};
