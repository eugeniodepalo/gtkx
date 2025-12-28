import type { Demo } from "../types.js";
import { fixedDemo } from "./fixed.js";
import { fixed2Demo } from "./fixed2.js";
import { flowboxDemo } from "./flowbox.js";
import { framesDemo } from "./frames.js";
import { headerbarDemo } from "./headerbar.js";
import { layoutManagerDemo } from "./layoutmanager.js";
import { layoutManager2Demo } from "./layoutmanager2.js";
import { overlayDemo } from "./overlay.js";
import { overlayDecorativeDemo } from "./overlay-decorative.js";
import { panedDemo } from "./paned.js";
import { sizegroupDemo } from "./sizegroup.js";

export const layoutDemos: Demo[] = [
    panedDemo,
    fixedDemo,
    fixed2Demo,
    flowboxDemo,
    framesDemo,
    headerbarDemo,
    overlayDemo,
    overlayDecorativeDemo,
    sizegroupDemo,
    layoutManagerDemo,
    layoutManager2Demo,
];
