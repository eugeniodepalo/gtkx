import type { Demo } from "../types.js";
import { clipboardDemo } from "./clipboard.js";
import { dndDemo } from "./dnd.js";
import { gesturesDemo } from "./gestures.js";
import { linksDemo } from "./links.js";
import { shortcutsDemo } from "./shortcuts.js";

export const gesturesDemos: Demo[] = [gesturesDemo, dndDemo, clipboardDemo, shortcutsDemo, linksDemo];
