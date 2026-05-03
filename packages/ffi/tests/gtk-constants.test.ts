import { describe, expect, it } from "vitest";
import { EVENT_CONTINUE, EVENT_STOP } from "../src/gtk/constants.js";

describe("gtk event-handler return constants", () => {
    it("EVENT_CONTINUE is false to allow further propagation", () => {
        expect(EVENT_CONTINUE).toBe(false);
    });

    it("EVENT_STOP is true to stop propagation", () => {
        expect(EVENT_STOP).toBe(true);
    });

    it("EVENT_CONTINUE and EVENT_STOP are inverses", () => {
        expect(EVENT_CONTINUE).toBe(!EVENT_STOP);
    });
});
