import type { Demo } from "../types.js";
import { scrollingDemo } from "./scrolling.js";
import { themesDemo } from "./themes.js";

export const benchmarkDemos: Demo[] = [scrollingDemo, themesDemo];
