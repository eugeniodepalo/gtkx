import type * as Gtk from "@gtkx/ffi/gtk";

/**
 * Returns the full text of a `Gtk.TextBuffer` from its first to last iterator.
 *
 * The trailing `true` passed to `getText` includes invisible and embedded
 * characters, matching what the widget actually holds.
 */
export const getBufferText = (buffer: Gtk.TextBuffer): string => {
    const startIter = buffer.getStartIter();
    const endIter = buffer.getEndIter();
    return buffer.getText(startIter, endIter, true) ?? "";
};
