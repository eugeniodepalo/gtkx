import { createRef, type NativeHandle } from "@gtkx/native";
import type { Content } from "../generated/cairo/enums.js";
import { Surface } from "../generated/cairo/surface.js";
import { alloc, call, read, t, write } from "../native.js";
import { DOUBLE_TYPE, INT_TYPE, LIB, SURFACE_T, SURFACE_T_NONE } from "./common.js";

export class RecordingSurface extends Surface {
    static override readonly glibTypeName: string = "CairoSurface";

    constructor(content: Content, extents?: { x: number; y: number; width: number; height: number }) {
        if (extents) {
            const rect = alloc(32, "cairo_rectangle_t", LIB);
            write(rect, DOUBLE_TYPE, 0, extents.x);
            write(rect, DOUBLE_TYPE, 8, extents.y);
            write(rect, DOUBLE_TYPE, 16, extents.width);
            write(rect, DOUBLE_TYPE, 24, extents.height);
            super(
                call(
                    LIB,
                    "cairo_recording_surface_create",
                    [
                        { type: INT_TYPE, value: content },
                        {
                            type: t.boxed("cairo_rectangle_t", "borrowed", LIB),
                            value: rect,
                        },
                    ],
                    SURFACE_T,
                ) as NativeHandle,
            );
        } else {
            super(
                call(
                    LIB,
                    "cairo_recording_surface_create",
                    [
                        { type: INT_TYPE, value: content },
                        { type: t.uint64, value: 0 },
                    ],
                    SURFACE_T,
                ) as NativeHandle,
            );
        }
    }

    inkExtents(): { x: number; y: number; width: number; height: number } {
        const xRef = createRef(0);
        const yRef = createRef(0);
        const wRef = createRef(0);
        const hRef = createRef(0);
        call(
            LIB,
            "cairo_recording_surface_ink_extents",
            [
                { type: SURFACE_T_NONE, value: this.handle },
                { type: t.ref(DOUBLE_TYPE), value: xRef },
                { type: t.ref(DOUBLE_TYPE), value: yRef },
                { type: t.ref(DOUBLE_TYPE), value: wRef },
                { type: t.ref(DOUBLE_TYPE), value: hRef },
            ],
            t.void,
        );
        return { x: xRef.value, y: yRef.value, width: wRef.value, height: hRef.value };
    }

    getExtents(): { x: number; y: number; width: number; height: number } | null {
        const rect = alloc(32, "cairo_rectangle_t", LIB);
        const result = call(
            LIB,
            "cairo_recording_surface_get_extents",
            [
                { type: SURFACE_T_NONE, value: this.handle },
                {
                    type: t.boxed("cairo_rectangle_t", "borrowed", LIB),
                    value: rect,
                },
            ],
            t.boolean,
        ) as boolean;
        if (!result) return null;
        return {
            x: read(rect, DOUBLE_TYPE, 0) as number,
            y: read(rect, DOUBLE_TYPE, 8) as number,
            width: read(rect, DOUBLE_TYPE, 16) as number,
            height: read(rect, DOUBLE_TYPE, 24) as number,
        };
    }
}
