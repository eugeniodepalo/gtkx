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

    if (error instanceof Error) {
        console.error("[formatRenderError] Original error stack:", error.stack);
    }

    const message = error instanceof Error ? error.message : String(error);
    const formattedMessage = widgetType ? `Failed to render ${widgetType}: ${message}` : `Render error: ${message}`;

    return new GtkxError(formattedMessage, widgetType);
}

export function formatBoundaryError(error: unknown): GtkxError {
    if (error instanceof GtkxError) {
        return error;
    }

    const message = error instanceof Error ? error.message : String(error);
    return new GtkxError(`Error caught by boundary: ${message}`);
}
