import type { Demo } from "../types.js";
import { audioDemo } from "./audio.js";
import { calendarDemo } from "./calendar.js";
import { videoPlayerDemo } from "./video-player.js";

export const mediaDemos: Demo[] = [videoPlayerDemo, audioDemo, calendarDemo];
