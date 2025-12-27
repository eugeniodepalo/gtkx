import type { Demo } from "../types.js";
import { entryDemo } from "./entry.js";
import { entryCompletionDemo } from "./entry-completion.js";
import { entryUndoDemo } from "./entry-undo.js";
import { passwordEntryDemo } from "./password-entry.js";
import { searchEntryDemo } from "./search-entry.js";
import { taggedEntryDemo } from "./tagged-entry.js";
import { textscrollDemo } from "./textscroll.js";
import { textundoDemo } from "./textundo.js";
import { textviewDemo } from "./textview.js";

export const inputDemos: Demo[] = [
    entryDemo,
    entryCompletionDemo,
    entryUndoDemo,
    passwordEntryDemo,
    searchEntryDemo,
    taggedEntryDemo,
    textviewDemo,
    textscrollDemo,
    textundoDemo,
];
