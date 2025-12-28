import type { Demo } from "../types.js";
import { constraintsDemo } from "./constraints.js";
import { constraintsBuilderDemo } from "./constraints-builder.js";
import { constraintsInteractiveDemo } from "./constraints-interactive.js";
import { constraintsVflDemo } from "./constraints-vfl.js";

export const constraintsDemos: Demo[] = [
    constraintsDemo,
    constraintsInteractiveDemo,
    constraintsVflDemo,
    constraintsBuilderDemo,
];
