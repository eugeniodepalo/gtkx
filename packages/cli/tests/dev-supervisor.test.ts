import type { ChildProcess } from "node:child_process";
import { fork } from "node:child_process";
import { EventEmitter } from "node:events";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("node:child_process", () => ({
    fork: vi.fn(),
}));

import { RELOAD_EXIT_CODE } from "../src/dev-protocol.js";
import { exitCodeForSignal, runDevSupervisor } from "../src/dev-supervisor.js";

const forkMock = vi.mocked(fork);

type FakeChild = EventEmitter & { killed: boolean; kill: ReturnType<typeof vi.fn> };

function createFakeChild(): FakeChild {
    const child = new EventEmitter() as FakeChild;
    child.killed = false;
    child.kill = vi.fn((_signal?: NodeJS.Signals) => {
        child.killed = true;
        return true;
    });
    return child;
}

describe("exitCodeForSignal", () => {
    it("returns 0 when no signal", () => {
        expect(exitCodeForSignal(null)).toBe(0);
    });

    it("returns 130 for SIGINT", () => {
        expect(exitCodeForSignal("SIGINT")).toBe(130);
    });

    it("returns 143 for SIGTERM", () => {
        expect(exitCodeForSignal("SIGTERM")).toBe(143);
    });

    it("returns 143 for any other signal", () => {
        expect(exitCodeForSignal("SIGHUP")).toBe(143);
    });
});

type SupervisorContext = {
    logSpy: ReturnType<typeof vi.spyOn>;
    exitSpy: ReturnType<typeof vi.spyOn>;
    prevSigInt: NodeJS.Signals[] | undefined;
    prevSigTerm: NodeJS.Signals[] | undefined;
};

const cleanupSignalListeners = (name: "SIGINT" | "SIGTERM", previous: NodeJS.Signals[] | undefined): void => {
    const current = process.listeners(name) as unknown as NodeJS.Signals[];
    for (const listener of current) {
        if (!previous?.includes(listener)) {
            process.removeListener(name, listener as never);
        }
    }
};

const setupSupervisorCtx = (): SupervisorContext => {
    const ctx = {} as SupervisorContext;
    beforeEach(() => {
        vi.clearAllMocks();
        ctx.logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
        ctx.exitSpy = vi.spyOn(process, "exit").mockImplementation((() => undefined) as never);
        ctx.prevSigInt = process.listeners("SIGINT") as unknown as NodeJS.Signals[];
        ctx.prevSigTerm = process.listeners("SIGTERM") as unknown as NodeJS.Signals[];
    });
    afterEach(() => {
        ctx.logSpy.mockRestore();
        ctx.exitSpy.mockRestore();
        cleanupSignalListeners("SIGINT", ctx.prevSigInt);
        cleanupSignalListeners("SIGTERM", ctx.prevSigTerm);
    });
    return ctx;
};

const startSupervisor = async (entry = "/abs/src/main.tsx"): Promise<FakeChild> => {
    const child = createFakeChild();
    forkMock.mockReturnValueOnce(child as unknown as ChildProcess);
    runDevSupervisor(entry).catch(() => undefined);
    await Promise.resolve();
    return child;
};

describe("runDevSupervisor (startup)", () => {
    setupSupervisorCtx();

    it("forks the dev runner with the supplied entry", async () => {
        await startSupervisor("/abs/src/main.tsx");

        expect(forkMock).toHaveBeenCalledOnce();
        const [, args] = forkMock.mock.calls[0] ?? [];
        expect(Array.isArray(args) ? args[0] : undefined).toBe("/abs/src/main.tsx");
    });
});

describe("runDevSupervisor (child exit handling)", () => {
    const ctx = setupSupervisorCtx();

    it("relaunches the runner when the child exits with the reload code", async () => {
        const child = await startSupervisor();
        const second = createFakeChild();
        forkMock.mockReturnValueOnce(second as unknown as ChildProcess);

        child.emit("exit", RELOAD_EXIT_CODE, null);

        expect(forkMock).toHaveBeenCalledTimes(2);
        expect(ctx.exitSpy).not.toHaveBeenCalled();
        const logged = ctx.logSpy.mock.calls.map((call: unknown[]) => String(call[0])).join("\n");
        expect(logged).toContain("Restarting dev runner");
    });

    it("exits with the child's code when the child exits non-reloadably", async () => {
        const child = await startSupervisor();

        child.emit("exit", 7, null);

        expect(ctx.exitSpy).toHaveBeenCalledWith(7);
    });

    it("exits with the signal-mapped code when the child exits via signal", async () => {
        const child = await startSupervisor();

        child.emit("exit", null, "SIGINT");

        expect(ctx.exitSpy).toHaveBeenCalledWith(130);
    });
});

describe("runDevSupervisor (signal forwarding)", () => {
    const ctx = setupSupervisorCtx();

    it("forwards SIGINT to the running child process", async () => {
        const child = await startSupervisor();

        process.emit("SIGINT", "SIGINT");

        expect(child.kill).toHaveBeenCalledWith("SIGINT");
        expect(ctx.exitSpy).not.toHaveBeenCalled();
    });

    it("forwards SIGTERM to the running child process", async () => {
        const child = await startSupervisor();

        process.emit("SIGTERM", "SIGTERM");

        expect(child.kill).toHaveBeenCalledWith("SIGTERM");
    });

    it("does not re-kill a child that already reports killed=true", async () => {
        const child = await startSupervisor();
        child.killed = true;

        process.emit("SIGINT", "SIGINT");

        expect(child.kill).not.toHaveBeenCalled();
    });

    it("exits cleanly when a signal arrives after the child has already exited", async () => {
        const child = await startSupervisor();
        child.emit("exit", 0, null);
        ctx.exitSpy.mockClear();

        process.emit("SIGINT", "SIGINT");

        expect(ctx.exitSpy).toHaveBeenCalledWith(0);
    });

    it("ignores subsequent child exits once shutting down", async () => {
        const child = await startSupervisor();

        process.emit("SIGINT", "SIGINT");
        ctx.exitSpy.mockClear();

        child.emit("exit", 99, null);

        expect(ctx.exitSpy).not.toHaveBeenCalled();
    });
});
