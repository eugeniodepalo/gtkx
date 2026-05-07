import { execFileSync } from "node:child_process";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { cleanup } from "@gtkx/testing";
import { afterAll, afterEach } from "vitest";

const fixturesDir = dirname(fileURLToPath(new URL("./fixtures/com.gtkx.test.useSetting.gschema.xml", import.meta.url)));
execFileSync("glib-compile-schemas", [fixturesDir], { stdio: "ignore" });

const existing = process.env.GSETTINGS_SCHEMA_DIR;
process.env.GSETTINGS_SCHEMA_DIR = existing ? `${fixturesDir}:${existing}` : fixturesDir;
process.env.GSETTINGS_BACKEND = "memory";

afterEach(async () => {
    await cleanup();
});

afterAll(async () => {
    await cleanup();
});
