import { dirname, join } from "node:path";

const execDir = dirname(process.execPath);

const isPackaged = Boolean(process.env.FLATPAK_ID || process.env.SNAP);

const assetsDir = isPackaged ? join(execDir, "../share/gtkx-example") : join(process.cwd(), "assets");

export function getAssetPath(name: string): string {
    return join(assetsDir, name);
}
