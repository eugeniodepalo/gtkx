import { describe, expect, it } from "vitest";
import { stop, whenStopped } from "../src/index.js";

describe("stop and whenStopped", () => {
    it("resolves the whenStopped promise", async () => {
        const stopped = whenStopped();

        stop();

        await expect(stopped).resolves.toBeUndefined();
    });

    it("returns immediately on subsequent calls", () => {
        expect(() => stop()).not.toThrow();
    });
});
