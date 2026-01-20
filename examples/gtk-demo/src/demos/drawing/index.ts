import type { Demo } from "../types.js";
import { drawingAreaDemo } from "./drawingarea.js";
import { imagesDemo } from "./images.js";
import { paintableSvgDemo } from "./paintable-svg.js";

export const drawingDemos: Demo[] = [drawingAreaDemo, imagesDemo, paintableSvgDemo];
