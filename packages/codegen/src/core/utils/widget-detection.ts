/**
 * Widget Detection Utilities
 *
 * Functions for detecting widget types.
 */

import type { GirRepository, QualifiedName } from "@gtkx/gir";

/**
 * Checks if a type name refers to a widget type (Gtk.Widget or subclass).
 *
 * @param typeName - The type name to check (string or QualifiedName)
 * @param repository - The GIR repository for type resolution
 * @param widgetQualifiedName - The qualified name for Gtk.Widget
 * @returns true if the type is a widget type
 */
export const isWidgetType = (
    typeName: string | QualifiedName,
    repository: GirRepository,
    widgetQualifiedName: QualifiedName,
): boolean => {
    if (typeof typeName !== "string") return false;

    if (typeName === "Gtk.Widget" || typeName === widgetQualifiedName) {
        return true;
    }

    if (!typeName.includes(".")) return false;

    const cls = repository.resolveClass(typeName as QualifiedName);
    if (!cls) return false;

    return cls.isSubclassOf(widgetQualifiedName);
};
