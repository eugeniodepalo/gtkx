import type { Demo } from "../types.js";
import { pegSolitaireDemo } from "./peg-solitaire.js";
import { slidingPuzzleDemo } from "./sliding-puzzle.js";

export const gamesDemos: Demo[] = [slidingPuzzleDemo, pegSolitaireDemo];
