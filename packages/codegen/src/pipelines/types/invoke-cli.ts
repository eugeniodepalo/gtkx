import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const TS_FOR_GIR_BIN: string = require.resolve("@ts-for-gir/cli/lib/start.js");

/**
 * Spawns the bundled `ts-for-gir` CLI to produce raw node-gtk type definitions
 * for every GIR module in `girsDir`, writing the unprocessed output into
 * `outDir`. The output still uses ts-for-gir's relative `./node-<ns>-<ver>.js`
 * import shape; the rewrite pass is responsible for converting those to the
 * `@gtkx/ffi/<ns>` shape we ship.
 *
 * @param girsDir Directory containing the GIR XML files to process.
 * @param outDir Directory to write the raw ts-for-gir output into.
 */
export async function runTsForGir(girsDir: string, outDir: string): Promise<void> {
    await new Promise<void>((resolve, reject) => {
        const proc = spawn(
            process.execPath,
            [
                TS_FOR_GIR_BIN,
                "generate",
                "*",
                "-g",
                girsDir,
                "-e",
                "node",
                "-o",
                outDir,
                "--ignoreVersionConflicts",
                "--noComments=false",
            ],
            { stdio: ["ignore", "pipe", "pipe"] },
        );

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
