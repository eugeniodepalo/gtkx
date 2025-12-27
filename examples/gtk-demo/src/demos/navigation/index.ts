import type { Demo } from "../types.js";
import { revealerDemo } from "./revealer.js";
import { sidebarDemo } from "./sidebar.js";
import { stackDemo } from "./stack.js";
import { tabsDemo } from "./tabs.js";

export const navigationDemos: Demo[] = [stackDemo, tabsDemo, revealerDemo, sidebarDemo];
