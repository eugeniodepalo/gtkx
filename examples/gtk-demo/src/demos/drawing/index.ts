import type { Demo } from "../types.js";
import { drawingAreaDemo } from "./drawingarea.js";
import { imagesDemo } from "./images.js";
import { progressDemo } from "./progress.js";

export const drawingDemos: Demo[] = [drawingAreaDemo, imagesDemo, progressDemo];
