import type { Demo } from "../types.js";
import { gearsDemo } from "./gears.js";
import { glareaDemo } from "./glarea.js";
import { shadertoyDemo } from "./shadertoy.js";

export const openglDemos: Demo[] = [glareaDemo, gearsDemo, shadertoyDemo];
