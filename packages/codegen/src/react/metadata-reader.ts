import type { CodegenWidgetMeta } from "../core/codegen-metadata.js";

const WIDGET_PRIORITY: Record<string, number> = {
    Widget: 0,
    Window: 1,
};

function compareWidgetsByClassName(a: { className: string }, b: { className: string }): number {
    const aPriority = WIDGET_PRIORITY[a.className];
    const bPriority = WIDGET_PRIORITY[b.className];

    if (aPriority !== undefined && bPriority !== undefined) {
        return aPriority - bPriority;
    }

    if (aPriority !== undefined) return -1;
    if (bPriority !== undefined) return 1;

    return a.className.localeCompare(b.className);
}

/**
 * Sorts widgets by class name with priority for core widgets.
 *
 * Widget and Window are sorted first, others alphabetically.
 *
 * @param widgets - Array of objects with className property
 * @returns New sorted array
 */
export function sortWidgetsByClassName<T extends { className: string }>(widgets: readonly T[]): T[] {
    return [...widgets].sort(compareWidgetsByClassName);
}

/**
 * Essential widget information for code generation.
 *
 * Derived from CodegenWidgetMeta with only the fields needed for React generation.
 */
export type WidgetInfo = Pick<
    CodegenWidgetMeta,
    | "className"
    | "jsxName"
    | "namespace"
    | "slots"
    | "propNames"
    | "signalNames"
    | "parentClassName"
    | "modulePath"
    | "hiddenPropNames"
>;

/**
 * Reads and provides access to widget metadata.
 */
export class MetadataReader {
    private readonly widgets: readonly WidgetInfo[];

    constructor(private readonly allMeta: readonly CodegenWidgetMeta[]) {
        this.widgets = allMeta.map((meta) => {
            const { properties: _, signals: __, parentNamespace: ___, doc: ____, ...widgetInfo } = meta;
            return widgetInfo;
        });
    }

    getAllWidgets(): readonly WidgetInfo[] {
        return this.widgets;
    }

    getAllCodegenMeta(): readonly CodegenWidgetMeta[] {
        return this.allMeta;
    }
}
