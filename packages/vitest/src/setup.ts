import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll } from "vitest";

const display = 100 + (process.pid % 5000);
const socketPath = `/tmp/.X11-unix/X${display}`;

const xvfb = spawn("Xvfb", [`:${display}`, "-screen", "0", "1024x768x24"], {
    stdio: "ignore",
});

xvfb.unref();

const busDir = mkdtempSync(join(tmpdir(), "gtkx-dbus-"));
const busConfigPath = join(busDir, "session.conf");
const busSocketPath = join(busDir, "bus");

writeFileSync(
    busConfigPath,
    `<!DOCTYPE busconfig PUBLIC "-//freedesktop//DTD D-BUS Bus Configuration 1.0//EN" "http://www.freedesktop.org/standards/dbus/1.0/busconfig.dtd">
<busconfig>
  <type>session</type>
  <listen>unix:path=${busSocketPath}</listen>
  <auth>EXTERNAL</auth>
  <policy context="default">
    <allow send_destination="*" eavesdrop="true"/>
    <allow eavesdrop="true"/>
    <allow own="*"/>
  </policy>
</busconfig>`,
);

const dbus = spawn("dbus-daemon", [`--config-file=${busConfigPath}`], {
    stdio: "ignore",
});

dbus.unref();

process.env.DBUS_SESSION_BUS_ADDRESS = `unix:path=${busSocketPath}`;
process.env.DISPLAY = `:${display}`;
process.env.GDK_BACKEND = "x11";
process.env.GDK_DISABLE = "vulkan";
process.env.GSK_RENDERER = "cairo";
process.env.GTK_A11Y = "none";
process.env.LIBGL_ALWAYS_SOFTWARE = "1";

const killChildren = (): void => {
    if (xvfb.pid !== undefined) {
        try {
            process.kill(xvfb.pid, "SIGTERM");
        } catch {}
    }
    if (dbus.pid !== undefined) {
        try {
            process.kill(dbus.pid, "SIGTERM");
        } catch {}
    }
};

process.on("exit", killChildren);

process.on("SIGTERM", () => {
    killChildren();
    process.exit(143);
});

process.on("SIGINT", () => {
    killChildren();
    process.exit(130);
});

const waitForFile = async (path: string, label: string, timeout = 15000): Promise<void> => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
        if (existsSync(path)) {
            return;
        }
        await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error(`${label} did not become available within ${timeout}ms`);
};

beforeAll(async () => {
    await Promise.all([
        waitForFile(socketPath, `Xvfb display :${display}`),
        waitForFile(busSocketPath, "D-Bus session bus"),
    ]);
});
