import { start as nativeStart, stop as nativeStop } from "../../index.js";

const G_FLAGS_NON_UNIQUE = 1 << 5;

let application: unknown = null;
let exitHandlersRegistered = false;

const teardown = (): void => {
    if (application) {
        try {
            nativeStop();
        } catch {}
    }
};

const handleSigint = (): void => {
    teardown();
    process.exit(130);
};

const handleSigterm = (): void => {
    teardown();
    process.exit(143);
};

const handleException = (error: unknown): void => {
    teardown();
    console.error(error);
    process.exit(1);
};

const handleRejection = (reason: unknown): void => {
    teardown();
    console.error("Unhandled rejection:", reason);
    process.exit(1);
};

const registerExitHandlers = (): void => {
    if (exitHandlersRegistered) {
        return;
    }
    exitHandlersRegistered = true;

    process.on("exit", teardown);
    process.on("SIGINT", handleSigint);
    process.on("SIGTERM", handleSigterm);
    process.on("uncaughtException", handleException);
    process.on("unhandledRejection", handleRejection);
};

const unregisterExitHandlers = (): void => {
    if (!exitHandlersRegistered) {
        return;
    }
    exitHandlersRegistered = false;

    process.off("exit", teardown);
    process.off("SIGINT", handleSigint);
    process.off("SIGTERM", handleSigterm);
    process.off("uncaughtException", handleException);
    process.off("unhandledRejection", handleRejection);
};

export const start = (): unknown => {
    if (application) {
        return application;
    }

    application = nativeStart("com.gtkx.native", G_FLAGS_NON_UNIQUE);
    registerExitHandlers();
    return application;
};

export const stop = (): void => {
    if (!application) {
        return;
    }

    unregisterExitHandlers();
    nativeStop();
    application = null;
};

export const suppressUnhandledRejections = async (fn: () => void): Promise<void> => {
    const savedListeners = process.rawListeners("unhandledRejection").slice();
    process.removeAllListeners("unhandledRejection");
    process.on("unhandledRejection", () => {});

    fn();

    await new Promise((resolve) => setTimeout(resolve, 100));

    process.removeAllListeners("unhandledRejection");
    for (const listener of savedListeners) {
        process.on("unhandledRejection", listener as (...args: unknown[]) => void);
    }
};
