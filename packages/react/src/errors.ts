/**
 * Error subclass thrown by the GTKX reconciler and rendering pipeline.
 *
 * Carries optional context about the widget type that failed and the
 * React component stack at the point of failure.
 */
export class GtkxError extends Error {
    constructor(
        message: string,
        public widgetType?: string,
        public componentStack?: string,
    ) {
        super(message);
        this.name = "GtkxError";

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, GtkxError);
        }
    }

    override toString(): string {
        const parts = [`GtkxError: ${this.message}`];

        if (this.widgetType) {
            parts.push(`Widget Type: ${this.widgetType}`);
        }

        if (this.componentStack) {
            parts.push(`Component Stack:\n${this.componentStack}`);
        }

        return parts.join("\n");
    }
}

export function formatRenderError(error: unknown, widgetType?: string): GtkxError {
    if (error instanceof GtkxError) {
        return error;
    }

    const message = error instanceof Error ? error.message : String(error);

    return new GtkxError(message, widgetType);
}

export function formatBoundaryError(error: unknown): GtkxError {
    if (error instanceof GtkxError) {
        return error;
    }

    const message = error instanceof Error ? error.message : String(error);
    return new GtkxError(message);
}
