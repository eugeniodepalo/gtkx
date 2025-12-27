import type { Demo } from "../types.js";
import { applicationDemo } from "./application.js";
import { helloWorldDemo } from "./hello-world.js";

export const gettingStartedDemos: Demo[] = [helloWorldDemo, applicationDemo];
