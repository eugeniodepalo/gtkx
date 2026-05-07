import { createHash } from "node:crypto";
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync, writeSync } from "node:fs";
import { dirname, join } from "node:path";

const LOCK_RETRY_INTERVAL_MS = 100;
const LOCK_TIMEOUT_MS = 60_000;
const STATE_SUFFIX = ".state";

const hashFiles = (files: Map<string, string>): string => {
    const hash = createHash("sha256");
    const sortedKeys = [...files.keys()].sort();
    for (const key of sortedKeys) {
        const content = files.get(key) ?? "";
        hash.update(key);
        hash.update("\0");
        hash.update(content);
        hash.update("\0");
    }
    return hash.digest("hex");
};

const readState = (statePath: string): string | null => {
    try {
        return readFileSync(statePath, "utf8").trim();
    } catch {
        return null;
    }
};

const sleepSync = (durationMs: number): void => {
    const buffer = new SharedArrayBuffer(4);
    const view = new Int32Array(buffer);
    Atomics.wait(view, 0, 0, durationMs);
};

const isProcessAlive = (pid: number): boolean => {
    try {
        process.kill(pid, 0);
        return true;
    } catch (err) {
        return (err as NodeJS.ErrnoException).code !== "ESRCH";
    }
};

const readLockOwner = (lockPath: string): number | null => {
    try {
        const pid = Number.parseInt(readFileSync(lockPath, "utf8").trim(), 10);
        return Number.isFinite(pid) && pid > 0 ? pid : null;
    } catch {
        return null;
    }
};

const acquireLock = (lockPath: string): void => {
    mkdirSync(dirname(lockPath), { recursive: true });
    const deadline = Date.now() + LOCK_TIMEOUT_MS;
    while (true) {
        try {
            const fd = openSync(lockPath, "wx");
            writeSync(fd, String(process.pid));
            closeSync(fd);
            return;
        } catch (err) {
            if ((err as NodeJS.ErrnoException).code !== "EEXIST") throw err;
            const ownerPid = readLockOwner(lockPath);
            if (ownerPid !== null && ownerPid !== process.pid && !isProcessAlive(ownerPid)) {
                rmSync(lockPath, { force: true });
                continue;
            }
            if (Date.now() >= deadline) {
                throw new Error(
                    `Timed out waiting for codegen lock at ${lockPath} (held by PID ${ownerPid ?? "unknown"})`,
                );
            }
            sleepSync(LOCK_RETRY_INTERVAL_MS);
        }
    }
};

const releaseLock = (lockPath: string): void => {
    rmSync(lockPath, { force: true });
};

/**
 * Wipes the target directory and writes every file from the given map into it.
 *
 * Intermediate directories are created automatically. The destination is
 * cleared first so removed namespaces from a previous run are not left behind.
 *
 * Acquires a sibling lock file before mutating the output so concurrent
 * codegen invocations serialize instead of racing on directory removal.
 * Stale locks left behind by a crashed process are detected via PID liveness
 * and reclaimed automatically.
 *
 * Records a hash of the file map in a sibling state file. Subsequent calls
 * with an identical map skip the rewrite entirely, leaving the directory
 * untouched so concurrent readers (e.g. `tsc -b`) see a stable file set.
 *
 * @param outputDir - Absolute target directory to wipe and populate
 * @param files - Map of paths (relative to `outputDir`) to file contents
 */
export const writeGeneratedDir = (outputDir: string, files: Map<string, string>): void => {
    const lockPath = `${outputDir}.lock`;
    const statePath = `${outputDir}${STATE_SUFFIX}`;
    acquireLock(lockPath);
    try {
        const expectedHash = hashFiles(files);
        if (existsSync(outputDir) && readState(statePath) === expectedHash) return;

        rmSync(outputDir, { recursive: true, force: true });
        rmSync(statePath, { force: true });
        mkdirSync(outputDir, { recursive: true });

        const createdDirs = new Set<string>([outputDir]);

        for (const [relativePath, content] of files) {
            const fullPath = join(outputDir, relativePath);
            const parent = dirname(fullPath);
            if (!createdDirs.has(parent)) {
                mkdirSync(parent, { recursive: true });
                createdDirs.add(parent);
            }
            writeFileSync(fullPath, content);
        }

        writeFileSync(statePath, expectedHash);
    } finally {
        releaseLock(lockPath);
    }
};
