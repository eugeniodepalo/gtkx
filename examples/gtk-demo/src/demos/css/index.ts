import type { Demo } from "../types.js";
import { cssAccordionDemo } from "./css-accordion.js";
import { cssBasicsDemo } from "./css-basics.js";
import { cssBlendmodesDemo } from "./css-blendmodes.js";
import { cssMultiplebgsDemo } from "./css-multiplebgs.js";
import { cssPixbufsDemo } from "./css-pixbufs.js";
import { cssShadowsDemo } from "./css-shadows.js";
import { errorstatesDemo } from "./errorstates.js";
import { styleClassesDemo } from "./style-classes.js";
import { themesDemo } from "./themes.js";

export const cssDemos: Demo[] = [
    cssBasicsDemo,
    cssShadowsDemo,
    cssAccordionDemo,
    cssBlendmodesDemo,
    cssMultiplebgsDemo,
    cssPixbufsDemo,
    errorstatesDemo,
    themesDemo,
    styleClassesDemo,
];
