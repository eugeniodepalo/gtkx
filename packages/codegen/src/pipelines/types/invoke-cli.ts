import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const TS_FOR_GIR_BIN: string = require.resolve("@ts-for-gir/cli/lib/start.js");

/**
 * Spawns the bundled `ts-for-gir` CLI to produce raw node-gtk type definitions
 * for the explicit list of GIR modules, writing the unprocessed output into
 * `outDir`.
 *
 * Passing an explicit module list (rather than `"*"`) prevents ts-for-gir from
 * expanding into every GIR file on the configured search path; only the listed
 * modules and their declared transitive dependencies are processed.
 *
 * @param libraries Explicit GIR module identifiers, e.g. `["Gtk-4.0", "Adw-1"]`.
 * @param girDirectories Directories to search for GIR XML files, passed as
 *     repeated `-g` flags in declared order.
 * @param outDir Directory to write the raw ts-for-gir output into.
 */
export async function runTsForGir(libraries: string[], girDirectories: string[], outDir: string): Promise<void> {
    const girDirArgs = girDirectories.flatMap((dir) => ["-g", dir]);
    const args = [
        TS_FOR_GIR_BIN,
        "generate",
        ...libraries,
        ...girDirArgs,
        "-e",
        "node",
        "-o",
        outDir,
        "--ignoreVersionConflicts",
        "--noComments=false",
        "--noDebugComments",
    ];

    await new Promise<void>((resolve, reject) => {
        const proc = spawn(process.execPath, args, { stdio: ["ignore", "pipe", "pipe"] });

        let stderr = "";
        proc.stderr?.on("data", (chunk: Buffer) => {
            stderr += chunk.toString();
        });

        proc.on("error", reject);
        proc.on("exit", (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`ts-for-gir exited with code ${code}\n${stderr}`));
            }
        });
    });
}
