import type { GenerationContext } from "../generation-context.js";
import type { FfiMapper } from "../type-system/ffi-mapper.js";
import { FfiTypeWriter } from "./ffi-type-writer.js";
import { MethodBodyWriter } from "./method-body-writer.js";

export type { MethodBodyWriter };

export type Writers = {
    ffiTypeWriter: FfiTypeWriter;
};

type CreateWritersOptions = {
    sharedLibrary?: string;
    glibLibrary?: string;
};

export const createWriters = (options: CreateWritersOptions): Writers => {
    const ffiTypeWriter = new FfiTypeWriter({
        currentSharedLibrary: options.sharedLibrary,
        glibLibrary: options.glibLibrary,
    });

    return {
        ffiTypeWriter,
    };
};

export const createMethodBodyWriter = (ffiMapper: FfiMapper, ctx: GenerationContext, writers: Writers): MethodBodyWriter => {
    return new MethodBodyWriter(ffiMapper, ctx, writers.ffiTypeWriter);
};
