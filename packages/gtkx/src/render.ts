import { start, stop as nativeStop } from "@gtkx/native";

let keepAliveTimeout: NodeJS.Timeout | null = null;
let app: unknown | null = null;

function keepAlive() {
  keepAliveTimeout = setTimeout(() => keepAlive(), 2147483647);
}

export function render(appId: string) {
  app = start(appId);
  console.log("Started GTK application: ", app);
  keepAlive();
  return app;
}

export function stop() {
  if (keepAliveTimeout) {
    clearTimeout(keepAliveTimeout);
    keepAliveTimeout = null;
  }

  nativeStop(app);
}
