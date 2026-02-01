import { describe, expect, it } from "vitest";
import { events, isInstantiating, setInstantiating } from "../src/index.js";

describe("isInstantiating", () => {
    it("is false by default", () => {
        expect(isInstantiating).toBe(false);
    });
});

describe("setInstantiating", () => {
    it("sets the isInstantiating flag", () => {
        expect(isInstantiating).toBe(false);
        setInstantiating(true);
        expect(isInstantiating).toBe(true);
        setInstantiating(false);
        expect(isInstantiating).toBe(false);
    });
});

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
