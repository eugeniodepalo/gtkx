import type { Demo } from "../types.js";
import { dialogDemo } from "./dialog.js";
import { pageSetupDemo } from "./pagesetup.js";
import { pickersDemo } from "./pickers.js";
import { printingDemo } from "./printing.js";

export const dialogsDemos: Demo[] = [dialogDemo, pickersDemo, pageSetupDemo, printingDemo];
