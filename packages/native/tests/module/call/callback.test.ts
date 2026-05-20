import { describe, expect, it } from "vitest";
import { call } from "../../../index.js";
import { suppressUnhandledRejections } from "../lifecycle.js";
import {
    connectSignal,
    connectSignalTrampoline,
    createButton,
    createCancellable,
    disconnectSignal,
    forceGC,
    GIO_LIB,
    GOBJECT_BORROWED,
    getRefCount,
    isSignalHandlerConnected,
    startMemoryMeasurement,
    VOID,
} from "../utils.js";
import { connectCancelledSignal } from "./_helpers.js";

describe("call - callback types - closure connect", () => {
    it("connects callback to signal", () => {
        const button = createButton("Test");

        const handlerId = connectSignal(button, "clicked", () => {});

        expect(typeof handlerId).toBe("number");
        expect(handlerId).toBeGreaterThan(0);
    });
});

describe("call - callback types - closure invoke", () => {
    it("invokes callback when signal emits", () => {
        const cancellable = createCancellable();
        let callbackInvoked = false;

        connectCancelledSignal(cancellable, () => {
            callbackInvoked = true;
        });

        call(GIO_LIB, "g_cancellable_cancel", [{ type: GOBJECT_BORROWED, value: cancellable }], VOID);

        expect(callbackInvoked).toBe(true);
    });
});

describe("call - callback types - closure args", () => {
    it("receives signal arguments in callback", () => {
        const cancellable = createCancellable();
        let receivedArg: unknown = null;

        connectCancelledSignal(cancellable, (arg) => {
            receivedArg = arg;
        });

        call(GIO_LIB, "g_cancellable_cancel", [{ type: GOBJECT_BORROWED, value: cancellable }], VOID);

        expect(receivedArg).toBeDefined();
    });
});

describe("call - callback types - closure disconnect", () => {
    it("disconnects callback correctly", () => {
        const button = createButton("Test");

        const handlerId = connectSignal(button, "clicked", () => {});

        disconnectSignal(button, handlerId);

        expect(isSignalHandlerConnected(button, handlerId)).toBe(false);
    });
});

describe("call - callback types - closure multiple", () => {
    it("handles multiple callbacks on same signal", () => {
        const cancellable = createCancellable();
        let count1 = 0;
        let count2 = 0;

        connectCancelledSignal(cancellable, () => {
            count1++;
        });
        connectCancelledSignal(cancellable, () => {
            count2++;
        });

        call(GIO_LIB, "g_cancellable_cancel", [{ type: GOBJECT_BORROWED, value: cancellable }], VOID);

        expect(count1).toBe(1);
        expect(count2).toBe(1);
    });
});

describe("call - callback types - destroy trampoline", () => {
    it("connects signal with trampoline destroy handler", () => {
        const cancellable = createCancellable();
        let callbackInvoked = false;

        const handlerId = connectSignalTrampoline(cancellable, "cancelled", () => {
            callbackInvoked = true;
        });

        expect(typeof handlerId).toBe("number");
        expect(handlerId).toBeGreaterThan(0);

        call(GIO_LIB, "g_cancellable_cancel", [{ type: GOBJECT_BORROWED, value: cancellable }], VOID);

        expect(callbackInvoked).toBe(true);
    });
});

describe("call - callback types - argument types", () => {
    it("passes gobject arguments to callback", () => {
        const cancellable = createCancellable();
        let receivedObject: unknown = null;

        connectCancelledSignal(cancellable, (obj) => {
            receivedObject = obj;
        });

        call(GIO_LIB, "g_cancellable_cancel", [{ type: GOBJECT_BORROWED, value: cancellable }], VOID);

        expect(receivedObject).not.toBeNull();
    });
});

describe("call - callback types - memory leaks disconnect", () => {
    it("does not leak closure when signal handler disconnects", () => {
        const button = createButton("Test");
        const buttonRefCount = getRefCount(button);

        for (let i = 0; i < 100; i++) {
            const handlerId = connectSignal(button, "clicked", () => {});
            disconnectSignal(button, handlerId);
        }

        forceGC();
        expect(getRefCount(button)).toBe(buttonRefCount);
    });
});

describe("call - callback types - memory leaks many", () => {
    it("does not leak when connecting many handlers in loop", () => {
        const mem = startMemoryMeasurement();

        for (let i = 0; i < 100; i++) {
            const button = createButton(`Button ${i}`);
            connectSignal(button, "clicked", () => {});
        }

        expect(mem.measure()).toBeLessThan(5 * 1024 * 1024);
    });
});

describe("call - callback types - memory leaks trampoline", () => {
    it("does not leak trampoline memory on disconnect", () => {
        const mem = startMemoryMeasurement();

        for (let i = 0; i < 100; i++) {
            const cancellable = createCancellable();

            const handlerId = connectSignalTrampoline(cancellable, "cancelled", () => {});

            disconnectSignal(cancellable, handlerId);
        }

        expect(mem.measure()).toBeLessThan(5 * 1024 * 1024);
    });
});

describe("call - callback types - edge cases throw", () => {
    it("handles callback that throws exception gracefully", async () => {
        const cancellable = createCancellable();

        connectCancelledSignal(cancellable, () => {
            throw new Error("Test error in callback");
        });

        await suppressUnhandledRejections(() => {
            expect(() => {
                call(GIO_LIB, "g_cancellable_cancel", [{ type: GOBJECT_BORROWED, value: cancellable }], VOID);
            }).not.toThrow();
        });
    });
});

describe("call - callback types - edge cases multiple object", () => {
    it("handles multiple callbacks on same object", () => {
        const button = createButton("Test");
        const handlers: number[] = [];

        for (let i = 0; i < 5; i++) {
            handlers.push(connectSignal(button, "clicked", () => {}));
        }

        for (const handlerId of handlers) {
            expect(isSignalHandlerConnected(button, handlerId)).toBe(true);
        }

        for (const handlerId of handlers) {
            disconnectSignal(button, handlerId);
        }
    });
});

describe("call - callback types - edge cases closure trampoline", () => {
    it("handles closure callback trampoline", () => {
        const button = createButton("Test");

        const handlerId = connectSignal(button, "clicked", () => {});

        expect(typeof handlerId).toBe("number");
        expect(handlerId).toBeGreaterThan(0);
    });
});
