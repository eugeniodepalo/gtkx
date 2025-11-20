import type { ReactNode } from "react";
import { start } from "@gtkx/ffi";
import { reconciler, setAppForRendering } from "./reconciler.js";

export function render(element: ReactNode, appId: string): void {
  // Start the GTK application
  const app = start(appId);
  
  // Store app reference for the reconciler
  setAppForRendering(app);
  
  // Create container with appId
  const container = reconciler.createContainer(
    appId,
    0, // ConcurrentRoot
    null,
    false,
    null,
    "",
    console.error,
    null,
  );

  reconciler.updateContainer(element, container, null, () => {
    // Render complete
  });
}
