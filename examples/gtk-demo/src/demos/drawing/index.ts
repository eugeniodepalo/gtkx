import type { Demo } from "../types.js";
import { drawingAreaDemo } from "./drawingarea.js";
import { imageFilteringDemo } from "./image-filtering.js";
import { imageScalingDemo } from "./image-scaling.js";
import { imagesDemo } from "./images.js";
import { maskDemo } from "./mask.js";
import { paintableDemo } from "./paintable.js";
import { paintableAnimatedDemo } from "./paintable-animated.js";
import { paintableEmblemDemo } from "./paintable-emblem.js";
import { paintableMediastreamDemo } from "./paintable-mediastream.js";
import { paintableSvgDemo } from "./paintable-svg.js";
import { paintableSymbolicDemo } from "./paintable-symbolic.js";

export const drawingDemos: Demo[] = [
    drawingAreaDemo,
    imagesDemo,
    imageScalingDemo,
    imageFilteringDemo,
    maskDemo,
    paintableDemo,
    paintableAnimatedDemo,
    paintableSvgDemo,
    paintableSymbolicDemo,
    paintableEmblemDemo,
    paintableMediastreamDemo,
];
