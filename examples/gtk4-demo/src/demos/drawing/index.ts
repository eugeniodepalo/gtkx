import type { Demo } from "../types.js";
import { drawingAreaDemo } from "./drawing-area.js";
import { drawingOverviewDemo } from "./overview.js";

export const drawingDemos: Demo[] = [drawingOverviewDemo, drawingAreaDemo];
