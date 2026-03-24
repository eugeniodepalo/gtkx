/**
 * Widget Detection Utilities
 *
 * Functions for detecting widget types.
 */

import type { GirRepository } from "@gtkx/gir";

/**
 * Checks if a type name refers to a widget type (Gtk.Widget or subclass).
 *
 * @param typeName - The type name to check
 * @param repository - The GIR repository for type resolution
 * @param widgetQualifiedName - The qualified name for Gtk.Widget
 * @returns true if the type is a widget type
 */
export const isWidgetType = (typeName: string, repository: GirRepository, widgetQualifiedName: string): boolean => {
    if (typeof typeName !== "string") return false;

    if (typeName === "Gtk.Widget" || typeName === widgetQualifiedName) {
        return true;
    }

    if (!typeName.includes(".")) return false;

    const cls = repository.resolveClass(typeName);
    if (!cls) return false;

    return cls.isSubclassOf(widgetQualifiedName);
};
