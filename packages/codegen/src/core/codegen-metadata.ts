/**
 * Codegen Metadata
 *
 * WeakMap-based metadata storage for attaching codegen-only data to SourceFiles.
 * This data is used during generation but NOT written to generated files.
 *
 * The FFI generator populates metadata during generation, and React generators
 * consume it without needing to access @gtkx/gir or re-parse generated code.
 */

import type { SourceFile } from "ts-morph";
import type { PropertyAnalysis, SignalAnalysis } from "./generator-types.js";

/**
 * Base metadata shared between widgets and controllers.
 *
 * Contains common fields for class identification, inheritance, and prop/signal analysis.
 */
export type CodegenClassMeta = {
    /** Class name (e.g., "Button", "GestureClick") */
    readonly className: string;
    /** Namespace (e.g., "Gtk") */
    readonly namespace: string;
    /** Full JSX element name (e.g., "GtkButton", "GtkGestureClick") */
    readonly jsxName: string;
    /** Parent class name (e.g., "Window", "GestureSingle") */
    readonly parentClassName: string | null;
    /** Parent namespace for cross-namespace inheritance */
    readonly parentNamespace: string | null;
    /** All writable property names */
    readonly propNames: readonly string[];
    /** All signal names (kebab-case) */
    readonly signalNames: readonly string[];
    /** Property analysis results (for JSX types) */
    readonly properties: readonly PropertyAnalysis[];
    /** Signal analysis results (for JSX types) */
    readonly signals: readonly SignalAnalysis[];
    /** Class documentation from GIR */
    readonly doc: string | undefined;
};

/**
 * Controller metadata - extends base with controller-specific fields.
 */
export type CodegenControllerMeta = CodegenClassMeta & {
    /** Whether this is an abstract controller (not instantiable) */
    readonly abstract: boolean;
};

/**
 * Widget metadata - extends base with widget-specific capabilities.
 */
export type CodegenWidgetMeta = CodegenClassMeta & {
    /** Named slots for child widgets (kebab-case) */
    readonly slots: readonly string[];
    /** Module path for imports (e.g., "./gtk/button.js") */
    readonly modulePath: string;
    /** Hidden prop names for this widget (camelCase) */
    readonly hiddenPropNames: readonly string[];
};

/**
 * Manages codegen-only metadata attached to SourceFiles.
 *
 * Metadata is populated by FfiGenerator and consumed by React generators.
 * Since codegen is a short-lived process, we use a simple Map for storage.
 */
export class CodegenMetadata {
    private readonly widgetMeta = new Map<SourceFile, CodegenWidgetMeta>();
    private readonly controllerMeta = new Map<SourceFile, CodegenControllerMeta>();

    /**
     * Attaches widget metadata to a SourceFile.
     */
    setWidgetMeta(sourceFile: SourceFile, meta: CodegenWidgetMeta): void {
        this.widgetMeta.set(sourceFile, meta);
    }

    /**
     * Gets widget metadata for a SourceFile.
     */
    getWidgetMeta(sourceFile: SourceFile): CodegenWidgetMeta | null {
        return this.widgetMeta.get(sourceFile) ?? null;
    }

    /**
     * Gets all widget metadata.
     */
    getAllWidgetMeta(): CodegenWidgetMeta[] {
        return Array.from(this.widgetMeta.values());
    }

    /**
     * Attaches controller metadata to a SourceFile.
     */
    setControllerMeta(sourceFile: SourceFile, meta: CodegenControllerMeta): void {
        this.controllerMeta.set(sourceFile, meta);
    }

    /**
     * Gets controller metadata for a SourceFile.
     */
    getControllerMeta(sourceFile: SourceFile): CodegenControllerMeta | null {
        return this.controllerMeta.get(sourceFile) ?? null;
    }

    /**
     * Gets all controller metadata.
     */
    getAllControllerMeta(): CodegenControllerMeta[] {
        return Array.from(this.controllerMeta.values());
    }

    /**
     * Clears all metadata.
     */
    clear(): void {
        this.widgetMeta.clear();
        this.controllerMeta.clear();
    }
}
