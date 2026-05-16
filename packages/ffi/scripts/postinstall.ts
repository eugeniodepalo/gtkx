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
import { join } from "node:path";

const projectRoot = process.env.INIT_CWD ?? process.cwd();
const monorepoCli = join(projectRoot, "packages", "cli", "src", "cli.ts");

const result = existsSync(monorepoCli)
    ? spawnSync(process.execPath, ["--conditions=source", "--import", "tsx", monorepoCli, "codegen"], {
          cwd: projectRoot,
          stdio: "inherit",
      })
    : spawnSync("gtkx", ["codegen"], { cwd: projectRoot, stdio: "inherit", shell: true });

if (result.error || result.status !== 0) {
    console.error("[gtkx] @gtkx/ffi postinstall: codegen failed — see the error above.");
    process.exit(1);
}
