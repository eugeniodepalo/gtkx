import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { GirRepository } from "@gtkx/gir";
import { defineCommand } from "citty";
import { intro, log, outro } from "../core/utils/progress.js";
import { GIRS_DIR, SYSTEM_GIRS_DIR } from "./constants.js";

/** Default root namespace keys whose transitive dependencies form the full GIR set. */
const DEFAULT_ROOTS = ["Gtk-4.0", "Adw-1", "GES-1.0", "GtkSource-5", "Vte-3.91", "WebKit-6.0"];

export const sync = defineCommand({
    meta: {
        name: "sync",
        description: "Sync GIR files from system to workspace",
    },
    args: {
        "girs-dir": {
            type: "string",
            description: "Destination directory for GIR files",
            default: GIRS_DIR,
        },
        "system-girs-dir": {
            type: "string",
            description: "System GIR source directory",
            default: SYSTEM_GIRS_DIR,
        },
        libraries: {
            type: "string",
            description: "Comma-separated namespace roots to sync (default: GTK4 stack)",
        },
    },
    run: async ({ args }) => {
        const girsDir = args["girs-dir"];
        const systemGirsDir = args["system-girs-dir"];
        const roots = args.libraries
            ? args.libraries
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean)
            : DEFAULT_ROOTS;

        intro("Syncing GIR files");

        if (!existsSync(girsDir)) {
            mkdirSync(girsDir, { recursive: true });
            log.info(`Created directory: ${girsDir}`);
        }

        const graph = await GirRepository.discoverDependencies(roots, {
            girPath: [systemGirsDir],
        });

        log.info(`Discovered ${graph.size} GIR files from roots: ${roots.join(", ")}`);

        for (const [key, { filePath }] of graph) {
            copyFileSync(filePath, join(girsDir, `${key}.gir`));
        }

        outro(`Synced ${graph.size} GIR files to ${girsDir}`);
    },
});
