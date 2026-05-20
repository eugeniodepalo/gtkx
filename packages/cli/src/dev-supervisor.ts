import { type ChildProcess, fork } from "node:child_process";
import { fileURLToPath } from "node:url";
import { RELOAD_EXIT_CODE } from "./dev-protocol.js";

const DEV_RUNNER_URL = new URL("../bin/gtkx-dev-runner.js", import.meta.url);

/**
 * Maps the POSIX signal that killed a child into the exit code the supervisor
 * should propagate to its own parent.
 *
 * Mirrors the convention from shells: `SIGINT` produces `130` (the canonical
 * Ctrl-C exit), every other signal produces `143` (the canonical `SIGTERM`
 * exit). `null` — i.e. the child exited cleanly — yields `0`.
 *
 * @param signal - The signal name from `ChildProcess` `"exit"`, or `null`.
 * @returns The exit code to forward.
 */
export const exitCodeForSignal = (signal: NodeJS.Signals | null): number => {
    if (!signal) return 0;
    return signal === "SIGINT" ? 130 : 143;
};

const forwardSignal = (child: ChildProcess, signal: NodeJS.Signals): void => {
    if (!child.killed) {
        child.kill(signal);
    }
};

/**
 * Supervises the dev-runner child process for the lifetime of `gtkx dev`.
 *
 * Forks `bin/gtkx-dev-runner.js`, forwards `SIGINT`/`SIGTERM` to it, and
 * relaunches the runner whenever it exits with {@link RELOAD_EXIT_CODE}. The
 * returned promise never resolves: control returns only when the runner
 * exits non-reloadably and the supervisor calls `process.exit`.
 *
 * @param entryPath - Absolute path of the user's entry module.
 */
export const runDevSupervisor = async (entryPath: string): Promise<never> => {
    const runnerPath = fileURLToPath(DEV_RUNNER_URL);
    let child: ChildProcess | null = null;
    let shuttingDown = false;

    const launch = (): void => {
        child = fork(runnerPath, [entryPath], { stdio: "inherit" });
        child.on("exit", (code, signal) => {
            child = null;
            if (shuttingDown) return;
            if (code === RELOAD_EXIT_CODE) {
                console.log("[gtkx] Restarting dev runner...");
                launch();
                return;
            }
            process.exit(code ?? exitCodeForSignal(signal));
        });
    };

    const onSignal = (signal: NodeJS.Signals): void => {
        shuttingDown = true;
        if (child) {
            forwardSignal(child, signal);
        } else {
            process.exit(0);
        }
    };

    process.on("SIGINT", () => onSignal("SIGINT"));
    process.on("SIGTERM", () => onSignal("SIGTERM"));

    launch();

    return new Promise<never>(() => {});
};
