import type { Demo } from "../types.js";
import { pathExplorerDemo } from "./path-explorer.js";
import { pathFillDemo } from "./path-fill.js";
import { pathMazeDemo } from "./path-maze.js";
import { pathSpinnerDemo } from "./path-spinner.js";
import { pathSweepDemo } from "./path-sweep.js";
import { pathTextDemo } from "./path-text.js";
import { pathWalkDemo } from "./path-walk.js";

export const pathsDemos: Demo[] = [
    pathFillDemo,
    pathTextDemo,
    pathSpinnerDemo,
    pathMazeDemo,
    pathSweepDemo,
    pathWalkDemo,
    pathExplorerDemo,
];
