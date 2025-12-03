import { describe, expect, it } from "vitest";
import { waitFor } from "../src/wait-for.js";

describe("waitFor", () => {
    describe("successful callbacks", () => {
        it("returns immediately when callback succeeds", async () => {
            const result = await waitFor(() => "success");
            expect(result).toBe("success");
        });

        it("returns the callback result value", async () => {
            const result = await waitFor(() => ({ key: "value", count: 42 }));
            expect(result).toEqual({ key: "value", count: 42 });
        });

        it("handles callbacks that return numbers", async () => {
            const result = await waitFor(() => 123);
            expect(result).toBe(123);
        });

        it("handles callbacks that return null", async () => {
            const result = await waitFor(() => null);
            expect(result).toBeNull();
        });

        it("handles callbacks that return undefined", async () => {
            const result = await waitFor(() => undefined);
            expect(result).toBeUndefined();
        });
    });

    describe("retrying callbacks", () => {
        it("retries until callback succeeds", async () => {
            let attempts = 0;
            const result = await waitFor(() => {
                attempts++;
                if (attempts < 3) {
                    throw new Error("Not yet");
                }
                return "finally";
            });

            expect(result).toBe("finally");
            expect(attempts).toBe(3);
        });

        it("retries at the specified interval", async () => {
            const timestamps: number[] = [];
            let attempts = 0;

            await waitFor(
                () => {
                    timestamps.push(Date.now());
                    attempts++;
                    if (attempts < 3) {
                        throw new Error("Not yet");
                    }
                    return true;
                },
                { interval: 100 },
            );

            expect(timestamps.length).toBe(3);
            const [t0, t1, t2] = timestamps;
            const gap1 = (t1 as number) - (t0 as number);
            const gap2 = (t2 as number) - (t1 as number);
            expect(gap1).toBeGreaterThanOrEqual(90);
            expect(gap2).toBeGreaterThanOrEqual(90);
        });
    });

    describe("timeout behavior", () => {
        it("throws after timeout when callback never succeeds", async () => {
            await expect(
                waitFor(
                    () => {
                        throw new Error("Always fails");
                    },
                    { timeout: 100, interval: 20 },
                ),
            ).rejects.toThrow(/Timed out after 100ms/);
        });

        it("includes the last error message in timeout error", async () => {
            await expect(
                waitFor(
                    () => {
                        throw new Error("Specific error message");
                    },
                    { timeout: 100, interval: 20 },
                ),
            ).rejects.toThrow(/Specific error message/);
        });

        it("uses default timeout of 1000ms", async () => {
            const start = Date.now();

            await expect(
                waitFor(
                    () => {
                        throw new Error("fail");
                    },
                    { interval: 200 },
                ),
            ).rejects.toThrow();

            const elapsed = Date.now() - start;
            expect(elapsed).toBeGreaterThanOrEqual(900);
            expect(elapsed).toBeLessThan(1500);
        });

        it("uses default interval of 50ms", async () => {
            let attempts = 0;
            const start = Date.now();

            await expect(
                waitFor(
                    () => {
                        attempts++;
                        throw new Error("fail");
                    },
                    { timeout: 200 },
                ),
            ).rejects.toThrow();

            const elapsed = Date.now() - start;
            const expectedAttempts = Math.floor(elapsed / 50) + 1;
            expect(attempts).toBeGreaterThanOrEqual(3);
            expect(attempts).toBeLessThanOrEqual(expectedAttempts + 1);
        });

        it("succeeds if callback passes just before timeout", async () => {
            let attempts = 0;
            const result = await waitFor(
                () => {
                    attempts++;
                    if (attempts < 4) {
                        throw new Error("Not yet");
                    }
                    return "just in time";
                },
                { timeout: 300, interval: 50 },
            );

            expect(result).toBe("just in time");
        });
    });

    describe("options handling", () => {
        it("works with no options provided", async () => {
            const result = await waitFor(() => "no options");
            expect(result).toBe("no options");
        });

        it("works with empty options object", async () => {
            const result = await waitFor(() => "empty options", {});
            expect(result).toBe("empty options");
        });

        it("works with only timeout specified", async () => {
            const result = await waitFor(() => "timeout only", { timeout: 500 });
            expect(result).toBe("timeout only");
        });

        it("works with only interval specified", async () => {
            const result = await waitFor(() => "interval only", { interval: 100 });
            expect(result).toBe("interval only");
        });
    });
});
