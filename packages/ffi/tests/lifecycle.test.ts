import { describe, expect, it, vi } from "vitest";
import { events, isStarted, stop } from "../src/index.js";

describe("events", () => {
    it("is an EventEmitter", () => {
        expect(typeof events.on).toBe("function");
        expect(typeof events.emit).toBe("function");
        expect(typeof events.removeListener).toBe("function");
    });

    it("allows registering start event listeners", () => {
        const handler = () => {};
        events.on("start", handler);
        expect(events.listenerCount("start")).toBeGreaterThan(0);
        events.removeListener("start", handler);
    });

    it("allows registering stop event listeners", () => {
        const handler = () => {};
        events.on("stop", handler);
        expect(events.listenerCount("stop")).toBeGreaterThan(0);
        events.removeListener("stop", handler);
    });
});

describe("stop and isStarted", () => {
    it("isStarted reports true while the runtime is active", () => {
        expect(isStarted()).toBe(true);
    });

    it("emits the stop event and clears the started flag", () => {
        const handler = vi.fn();
        events.on("stop", handler);

        stop();

        expect(handler).toHaveBeenCalledTimes(1);
        expect(isStarted()).toBe(false);
        events.removeListener("stop", handler);
    });

    it("returns immediately on subsequent calls without re-emitting stop", () => {
        const handler = vi.fn();
        events.on("stop", handler);

        expect(() => stop()).not.toThrow();

        expect(handler).not.toHaveBeenCalled();
        events.removeListener("stop", handler);
    });
});
