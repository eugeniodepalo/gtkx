import * as p from "@clack/prompts";

/**
 * Logging utilities for CLI output.
 */
export const log = {
    /** Display an info message */
    info: (message: string): void => p.log.info(message),
    /** Display a success message */
    success: (message: string): void => p.log.success(message),
    /** Display a warning message */
    warning: (message: string): void => p.log.warning(message),
    /** Display an error message */
    error: (message: string): void => p.log.error(message),
    /** Display a step message */
    step: (message: string): void => p.log.step(message),
    /** Display a generic message */
    message: (message: string): void => p.log.message(message),
};
