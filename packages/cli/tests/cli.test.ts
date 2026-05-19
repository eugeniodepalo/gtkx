import type { ChildProcess } from "node:child_process";
import { fork } from "node:child_process";
import { EventEmitter } from "node:events";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("node:child_process", () => ({
    fork: vi.fn(),
}));

vi.mock("../src/builder.js", () => ({
    build: vi.fn(async () => undefined),
}));

vi.mock("../src/codegen/run-codegen.js", () => ({
    preflightCodegen: vi.fn(async () => undefined),
    runCodegen: vi.fn(async () => ({
        ran: true,
        configFile: "/project/gtkx.config.ts",
        config: { libraries: ["Gtk-4.0", "Adw-1"] },
        girPath: ["/usr/share/gir-1.0"],
        libraries: ["Gtk-4.0", "Adw-1"],
        namespaces: 2,
        widgets: 142,
        duration: 250,
    })),
}));

vi.mock("../src/create.js", () => ({
    createApp: vi.fn(async () => undefined),
}));

import { build } from "../src/builder.js";
import { buildCmd, codegen, create, dev, exitCodeForSignal } from "../src/cli.js";
import { preflightCodegen, runCodegen } from "../src/codegen/run-codegen.js";
import { createApp } from "../src/create.js";
import { RELOAD_EXIT_CODE } from "../src/dev-protocol.js";

const buildMock = vi.mocked(build);
const preflightMock = vi.mocked(preflightCodegen);
const runCodegenMock = vi.mocked(runCodegen);
const createAppMock = vi.mocked(createApp);
const forkMock = vi.mocked(fork);

type CommandRun<Args extends Record<string, unknown>> = (ctx: { args: Args }) => Promise<unknown>;

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

describe("buildCmd", () => {
    let logSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        vi.clearAllMocks();
        logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    });

    afterEach(() => {
        logSpy.mockRestore();
    });

    it("runs codegen preflight and builds with the default entry", async () => {
        const run = buildCmd.run as unknown as CommandRun<{ entry?: string; "asset-base"?: string }>;

        await run({ args: {} });

        expect(preflightMock).toHaveBeenCalledOnce();
        expect(buildMock).toHaveBeenCalledOnce();
        const buildCall = buildMock.mock.calls[0];
        if (!buildCall) throw new Error("build was not invoked");
        const buildArgs = buildCall[0];
        expect(buildArgs.entry).toMatch(/src\/index\.tsx$/);
        expect(buildArgs.assetBase).toBeUndefined();
    });

    it("forwards a custom entry and asset-base flag", async () => {
        const run = buildCmd.run as unknown as CommandRun<{ entry?: string; "asset-base"?: string }>;

        await run({ args: { entry: "src/main.tsx", "asset-base": "../share/myapp" } });

        const buildCall = buildMock.mock.calls[0];
        if (!buildCall) throw new Error("build was not invoked");
        const buildArgs = buildCall[0];
        expect(buildArgs.entry).toMatch(/src\/main\.tsx$/);
        expect(buildArgs.assetBase).toBe("../share/myapp");
    });
});

describe("create", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("delegates to createApp with normalized options", async () => {
        const run = create.run as unknown as CommandRun<{
            name?: string;
            "app-id"?: string;
            pm?: string;
            testing?: string;
            "claude-skills"?: boolean;
        }>;

        await run({
            args: {
                name: "my-app",
                "app-id": "com.example.myapp",
                pm: "pnpm",
                testing: "vitest",
                "claude-skills": true,
            },
        });

        expect(createAppMock).toHaveBeenCalledWith({
            name: "my-app",
            appId: "com.example.myapp",
            packageManager: "pnpm",
            testing: "vitest",
            claudeSkills: true,
        });
    });

    it("passes undefined for unspecified flags", async () => {
        const run = create.run as unknown as CommandRun<{
            name?: string;
            "app-id"?: string;
            pm?: string;
            testing?: string;
            "claude-skills"?: boolean;
        }>;

        await run({ args: {} });

        expect(createAppMock).toHaveBeenCalledWith({
            name: undefined,
            appId: undefined,
            packageManager: undefined,
            testing: undefined,
            claudeSkills: undefined,
        });
    });
});

type CodegenLogState = { logSpy: ReturnType<typeof vi.spyOn> };

const setupCodegenLog = (state: CodegenLogState): void => {
    beforeEach(() => {
        vi.clearAllMocks();
        state.logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    });
    afterEach(() => {
        state.logSpy.mockRestore();
    });
};

const collectLogged = (logSpy: ReturnType<typeof vi.spyOn>): string =>
    logSpy.mock.calls.map((call: unknown[]) => String(call[0])).join("\n");

describe("codegen command (skip and forwarding)", () => {
    const state = {} as CodegenLogState;
    setupCodegenLog(state);

    it("logs the up-to-date message and skips reporting when nothing ran", async () => {
        runCodegenMock.mockResolvedValueOnce({ ran: false } as never);
        const run = codegen.run as unknown as CommandRun<{ force?: boolean; cwd?: string }>;

        await run({ args: {} });

        const logged = collectLogged(state.logSpy);
        expect(logged).toContain("up to date");
        expect(logged).not.toContain("namespaces");
    });

    it("forwards --force and --cwd flags", async () => {
        const run = codegen.run as unknown as CommandRun<{ force?: boolean; cwd?: string }>;

        await run({ args: { force: true, cwd: "/custom/dir" } });

        expect(runCodegenMock).toHaveBeenCalledWith({
            cwd: expect.stringContaining("custom/dir"),
            force: true,
        });
    });
});

describe("codegen command (result reporting)", () => {
    const state = {} as CodegenLogState;
    setupCodegenLog(state);

    it("logs config, libraries, gir path, and totals after a successful run", async () => {
        const run = codegen.run as unknown as CommandRun<{ force?: boolean; cwd?: string }>;

        await run({ args: {} });

        expect(runCodegenMock).toHaveBeenCalledWith({ cwd: process.cwd(), force: undefined });

        const logged = collectLogged(state.logSpy);
        expect(logged).toContain("config=/project/gtkx.config.ts");
        expect(logged).toContain("libraries=Gtk-4.0, Adw-1");
        expect(logged).toContain("girPath=/usr/share/gir-1.0");
        expect(logged).toContain("2 namespaces, 142 widgets in 250ms");
    });

    it("skips optional log lines when fields are missing from the result", async () => {
        runCodegenMock.mockResolvedValueOnce({
            ran: true,
            namespaces: 0,
            widgets: 0,
            duration: 5,
        } as never);
        const run = codegen.run as unknown as CommandRun<{ force?: boolean; cwd?: string }>;

        await run({ args: {} });

        const logged = collectLogged(state.logSpy);
        expect(logged).not.toContain("config=");
        expect(logged).not.toContain("libraries=");
        expect(logged).not.toContain("girPath=");
        expect(logged).toContain("0 namespaces, 0 widgets in 5ms");
    });
});

type DevContext = {
    logSpy: ReturnType<typeof vi.spyOn>;
    exitSpy: ReturnType<typeof vi.spyOn>;
    prevSigInt: NodeJS.Signals[] | undefined;
    prevSigTerm: NodeJS.Signals[] | undefined;
    runDev: CommandRun<{ entry?: string }>;
};

const cleanupSignalListeners = (name: "SIGINT" | "SIGTERM", previous: NodeJS.Signals[] | undefined): void => {
    const current = process.listeners(name) as unknown as NodeJS.Signals[];
    for (const listener of current) {
        if (!previous?.includes(listener)) {
            process.removeListener(name, listener as never);
        }
    }
};

const setupDevCtx = (): DevContext => {
    const ctx = {} as DevContext;
    beforeEach(() => {
        vi.clearAllMocks();
        ctx.logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
        ctx.exitSpy = vi.spyOn(process, "exit").mockImplementation((() => undefined) as never);
        ctx.prevSigInt = process.listeners("SIGINT") as unknown as NodeJS.Signals[];
        ctx.prevSigTerm = process.listeners("SIGTERM") as unknown as NodeJS.Signals[];
        ctx.runDev = dev.run as unknown as CommandRun<{ entry?: string }>;
    });
    afterEach(() => {
        ctx.logSpy.mockRestore();
        ctx.exitSpy.mockRestore();
        cleanupSignalListeners("SIGINT", ctx.prevSigInt);
        cleanupSignalListeners("SIGTERM", ctx.prevSigTerm);
    });
    return ctx;
};

const startDev = async (ctx: DevContext, entry?: string): Promise<FakeChild> => {
    const child = createFakeChild();
    forkMock.mockReturnValueOnce(child as unknown as ChildProcess);
    ctx.runDev({ args: entry ? { entry } : {} }).catch(() => undefined);
    await preflightMock.mock.results[0]?.value;
    await Promise.resolve();
    return child;
};

describe("dev command (startup)", () => {
    const ctx = setupDevCtx();

    it("runs preflight codegen and forks the dev runner with the resolved entry", async () => {
        await startDev(ctx, "src/main.tsx");

        expect(preflightMock).toHaveBeenCalledOnce();
        expect(forkMock).toHaveBeenCalledOnce();
        const [, args] = forkMock.mock.calls[0] ?? [];
        expect(Array.isArray(args) ? args[0] : undefined).toMatch(/src\/main\.tsx$/);
    });

    it("uses src/index.tsx as the default entry when no positional is supplied", async () => {
        await startDev(ctx);

        const [, args] = forkMock.mock.calls[0] ?? [];
        expect(Array.isArray(args) ? args[0] : undefined).toMatch(/src\/index\.tsx$/);
    });
});

describe("dev command (child exit handling)", () => {
    const ctx = setupDevCtx();

    it("relaunches the runner when the child exits with the reload code", async () => {
        const child = await startDev(ctx);
        const second = createFakeChild();
        forkMock.mockReturnValueOnce(second as unknown as ChildProcess);

        child.emit("exit", RELOAD_EXIT_CODE, null);

        expect(forkMock).toHaveBeenCalledTimes(2);
        expect(ctx.exitSpy).not.toHaveBeenCalled();
        const logged = ctx.logSpy.mock.calls.map((call: unknown[]) => String(call[0])).join("\n");
        expect(logged).toContain("Restarting dev runner");
    });

    it("exits with the child's code when the child exits non-reloadably", async () => {
        const child = await startDev(ctx);

        child.emit("exit", 7, null);

        expect(ctx.exitSpy).toHaveBeenCalledWith(7);
    });

    it("exits with the signal-mapped code when the child exits via signal", async () => {
        const child = await startDev(ctx);

        child.emit("exit", null, "SIGINT");

        expect(ctx.exitSpy).toHaveBeenCalledWith(130);
    });
});

describe("dev command (signal forwarding)", () => {
    const ctx = setupDevCtx();

    it("forwards SIGINT to the running child process", async () => {
        const child = await startDev(ctx);

        process.emit("SIGINT", "SIGINT");

        expect(child.kill).toHaveBeenCalledWith("SIGINT");
        expect(ctx.exitSpy).not.toHaveBeenCalled();
    });

    it("forwards SIGTERM to the running child process", async () => {
        const child = await startDev(ctx);

        process.emit("SIGTERM", "SIGTERM");

        expect(child.kill).toHaveBeenCalledWith("SIGTERM");
    });

    it("does not re-kill a child that already reports killed=true", async () => {
        const child = await startDev(ctx);
        child.killed = true;

        process.emit("SIGINT", "SIGINT");

        expect(child.kill).not.toHaveBeenCalled();
    });

    it("exits cleanly when a signal arrives after the child has already exited", async () => {
        const child = await startDev(ctx);
        child.emit("exit", 0, null);
        ctx.exitSpy.mockClear();

        process.emit("SIGINT", "SIGINT");

        expect(ctx.exitSpy).toHaveBeenCalledWith(0);
    });

    it("ignores subsequent child exits once shutting down", async () => {
        const child = await startDev(ctx);

        process.emit("SIGINT", "SIGINT");
        ctx.exitSpy.mockClear();

        child.emit("exit", 99, null);

        expect(ctx.exitSpy).not.toHaveBeenCalled();
    });
});
