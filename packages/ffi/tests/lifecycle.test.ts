import { describe, expect, it } from "vitest";
import { isStarted, stop, whenStopped } from "../src/index.js";

describe("isStarted", () => {
    it("reports true while the runtime is active", () => {
        expect(isStarted()).toBe(true);
    });
});

describe("stop and whenStopped", () => {
    it("resolves the whenStopped promise and clears the started flag", async () => {
        const stopped = whenStopped();

        stop();

        await expect(stopped).resolves.toBeUndefined();
        expect(isStarted()).toBe(false);
    });

    it("returns immediately on subsequent calls", () => {
        expect(() => stop()).not.toThrow();
    });
});
