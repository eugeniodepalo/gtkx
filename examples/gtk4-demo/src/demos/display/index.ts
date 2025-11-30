import type { Demo } from "../types.js";
import { imageDemo } from "./image.js";
import { levelBarDemo } from "./level-bar.js";
import { progressBarDemo } from "./progress-bar.js";
import { spinnerDemo } from "./spinner.js";

export const displayDemos: Demo[] = [spinnerDemo, progressBarDemo, imageDemo, levelBarDemo];
