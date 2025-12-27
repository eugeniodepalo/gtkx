import type { Demo } from "../types.js";
import { boxDemo } from "./box.js";
import { centerboxDemo } from "./centerbox.js";
import { fixedDemo } from "./fixed.js";
import { flowboxDemo } from "./flowbox.js";
import { framesDemo } from "./frames.js";
import { gridDemo } from "./grid.js";
import { headerbarDemo } from "./headerbar.js";
import { notebookDemo } from "./notebook.js";
import { overlayDemo } from "./overlay.js";
import { panedDemo } from "./paned.js";
import { sizegroupDemo } from "./sizegroup.js";

export const layoutDemos: Demo[] = [
    boxDemo,
    gridDemo,
    panedDemo,
    fixedDemo,
    flowboxDemo,
    framesDemo,
    headerbarDemo,
    centerboxDemo,
    overlayDemo,
    sizegroupDemo,
    notebookDemo,
];
