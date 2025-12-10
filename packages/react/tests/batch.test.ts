import { describe, expect, it, vi } from "vitest";
import { beginCommit, endCommit, scheduleFlush } from "../src/batch.js";

const flushMicrotasks = () => new Promise<void>((resolve) => queueMicrotask(resolve));

describe("batch", () => {
    describe("scheduleFlush", () => {
        it("executes callback immediately when not in commit", () => {
            const callback = vi.fn();

            scheduleFlush(callback);

            expect(callback).toHaveBeenCalledOnce();
        });

        it("defers callback execution during commit", async () => {
            const callback = vi.fn();

            beginCommit();
            scheduleFlush(callback);

            expect(callback).not.toHaveBeenCalled();

            endCommit();

            expect(callback).not.toHaveBeenCalled();
            await flushMicrotasks();
            expect(callback).toHaveBeenCalledOnce();
        });

        it("executes multiple deferred callbacks on endCommit", async () => {
            const callback1 = vi.fn();
            const callback2 = vi.fn();
            const callback3 = vi.fn();

            beginCommit();
            scheduleFlush(callback1);
            scheduleFlush(callback2);
            scheduleFlush(callback3);

            expect(callback1).not.toHaveBeenCalled();
            expect(callback2).not.toHaveBeenCalled();
            expect(callback3).not.toHaveBeenCalled();

            endCommit();
            await flushMicrotasks();

            expect(callback1).toHaveBeenCalledOnce();
            expect(callback2).toHaveBeenCalledOnce();
            expect(callback3).toHaveBeenCalledOnce();
        });

        it("clears pending flushes after endCommit", async () => {
            const callback = vi.fn();

            beginCommit();
            scheduleFlush(callback);
            endCommit();
            await flushMicrotasks();

            expect(callback).toHaveBeenCalledOnce();

            endCommit();
            await flushMicrotasks();

            expect(callback).toHaveBeenCalledOnce();
        });

        it("deduplicates same callback during commit", async () => {
            const callback = vi.fn();

            beginCommit();
            scheduleFlush(callback);
            scheduleFlush(callback);
            scheduleFlush(callback);
            endCommit();
            await flushMicrotasks();

            expect(callback).toHaveBeenCalledOnce();
        });

        it("handles nested begin/end commit correctly", async () => {
            const callback = vi.fn();

            beginCommit();
            scheduleFlush(callback);

            beginCommit();

            expect(callback).not.toHaveBeenCalled();

            endCommit();
            await flushMicrotasks();

            expect(callback).toHaveBeenCalledOnce();
        });
    });
});
