/**
 * Returns a promise that resolves on the next event loop tick.
 */
export const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));
