import { start as nativeStart, stop as nativeStop } from "@gtkx/native";

let keepAliveTimeout: NodeJS.Timeout | null = null;

function keepAlive() {
  keepAliveTimeout = setTimeout(() => keepAlive(), 2147483647);
}

export function start(appId: string) {
  const app = nativeStart(appId);
  keepAlive();
  return app;
}

export function stop() {
  if (keepAliveTimeout) {
    clearTimeout(keepAliveTimeout);
    keepAliveTimeout = null;
  }

  nativeStop();
}
