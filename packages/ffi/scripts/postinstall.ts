#!/usr/bin/env node
/**
 * Runs `gtkx codegen` after `@gtkx/ffi` is installed so the generated FFI and
 * React bindings are present without a separate build step.
 *
 * In the gtkx monorepo the CLI is run from TypeScript source via the `tsx`
 * loader (no build needed); in a downstream project the installed `gtkx`
 * binary is used. A codegen failure fails the install — `@gtkx/ffi` is
 * unusable without its generated bindings.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const monorepoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const monorepoCli = join(monorepoRoot, "packages", "cli", "src", "cli.ts");
const downstreamRoot = process.env.INIT_CWD ?? process.cwd();
const downstreamCli = join(downstreamRoot, "node_modules", ".bin", "gtkx");

const result = existsSync(monorepoCli)
    ? spawnSync(process.execPath, ["--conditions=source", "--import", "tsx", monorepoCli, "codegen"], {
          cwd: monorepoRoot,
          stdio: "inherit",
      })
    : spawnSync(downstreamCli, ["codegen"], { cwd: downstreamRoot, stdio: "inherit" });

if (result.error || result.status !== 0) {
    if (result.error) {
        console.error(result.error.message);
    }
    console.error("[gtkx] @gtkx/ffi postinstall: codegen failed — see the error above.");
    process.exit(1);
}
