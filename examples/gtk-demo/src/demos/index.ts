import { advancedDemos } from "./advanced/index.js";
import { benchmarkDemos } from "./benchmark/index.js";
import { buttonsDemos } from "./buttons/index.js";
import { constraintsDemos } from "./constraints/index.js";
import { cssDemos } from "./css/index.js";
import { dialogsDemos } from "./dialogs/index.js";
import { drawingDemos } from "./drawing/index.js";
import { gamesDemos } from "./games/index.js";
import { gesturesDemos } from "./gestures/index.js";
import { inputDemos } from "./input/index.js";
import { layoutDemos } from "./layout/index.js";
import { listsDemos } from "./lists/index.js";
import { mediaDemos } from "./media/index.js";
import { navigationDemos } from "./navigation/index.js";
import { openglDemos } from "./opengl/index.js";
import { pathsDemos } from "./paths/index.js";
import type { Demo } from "./types.js";

const introDemo: Demo = {
    id: "intro",
    title: "GTK Demo",
    description:
        "GTK Demo is a collection of useful examples to demonstrate GTK widgets and features using GTKX — " +
        "a framework for building native Linux desktop applications with React and TypeScript.\n\n" +
        "You can select examples in the sidebar or search for them by typing a search term. " +
        'Double-clicking or hitting the "Run" button will run the demo. ' +
        "The source code used in the demo is shown in the Source tab.\n\n" +
        "You can also use the GTK Inspector, available from the menu on the top right, " +
        "to poke at the running demos, and see how they are put together.",
    keywords: [],
};

export const demos: Demo[] = [
    introDemo,
    ...advancedDemos,
    ...benchmarkDemos,
    ...buttonsDemos,
    ...constraintsDemos,
    ...cssDemos,
    ...dialogsDemos,
    ...drawingDemos,
    ...gamesDemos,
    ...gesturesDemos,
    ...inputDemos,
    ...layoutDemos,
    ...listsDemos,
    ...mediaDemos,
    ...navigationDemos,
    ...openglDemos,
    ...pathsDemos,
];
