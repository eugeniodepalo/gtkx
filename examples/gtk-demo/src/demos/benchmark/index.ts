import type { Demo } from "../types.js";
import { fishbowlDemo } from "./fishbowl.js";
import { framesDemo } from "./frames.js";
import { themesDemo } from "./themes.js";

export const benchmarkDemos: Demo[] = [fishbowlDemo, framesDemo, themesDemo];
