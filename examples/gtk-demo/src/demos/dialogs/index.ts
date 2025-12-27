import type { Demo } from "../types.js";
import { aboutDialogDemo } from "./about-dialog.js";
import { assistantDemo } from "./assistant.js";
import { dialogDemo } from "./dialog.js";
import { infobarDemo } from "./infobar.js";
import { pickersDemo } from "./pickers.js";

export const dialogsDemos: Demo[] = [dialogDemo, pickersDemo, assistantDemo, infobarDemo, aboutDialogDemo];
