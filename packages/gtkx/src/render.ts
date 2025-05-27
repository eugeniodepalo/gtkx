import { start, quit as nativeQuit } from "@gtkx/native";

let keepAliveTimeout: NodeJS.Timeout | null = null;

function keepAlive(app: unknown) {
  keepAliveTimeout = setTimeout(() => keepAlive(app), 2147483647);
}

export function render(appId: string) {
  const app = start(appId);
  keepAlive(app);
  return app;
}

export function quit() {
  if (keepAliveTimeout) {
    clearTimeout(keepAliveTimeout);
    keepAliveTimeout = null;
  }

  nativeQuit();
}
