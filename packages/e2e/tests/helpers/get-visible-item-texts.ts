import * as Gtk from "@gtkx/ffi/gtk";

export const getVisibleItemTexts = (container: Gtk.Widget): string[] => {
    const texts: string[] = [];
    let cell = container.getFirstChild();
    while (cell) {
        const findLabel = (widget: Gtk.Widget): string | null => {
            if (widget instanceof Gtk.Label) return widget.getLabel();
            let child = widget.getFirstChild();
            while (child) {
                const result = findLabel(child);
                if (result) return result;
                child = child.getNextSibling();
            }
            return null;
        };
        const text = findLabel(cell);
        if (text) texts.push(text);
        cell = cell.getNextSibling();
    }
    return texts;
};
