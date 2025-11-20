import type { ReactNode } from "react";
import type Reconciler from "react-reconciler";
import { reconciler, setAppForRendering } from "./reconciler.js";

import { start } from "@gtkx/ffi";

export function render(element: ReactNode, appId: string): void {
  // Start the GTK application
  const app = start(appId);

  // Store app reference for the reconciler
  setAppForRendering(app);

  // Create container with appId
  const container = (
    reconciler.createContainer as (
      containerInfo: unknown,
      tag: number,
      hydrationCallbacks: unknown,
      isStrictMode: boolean,
      concurrentUpdatesByDefault: boolean,
      identifierPrefix: string,
      onRecoverableError: (
        error: Error,
        info: Reconciler.BaseErrorInfo
      ) => void,
      transitionCallbacks: unknown,
      formState: unknown,
      useModernStrictMode: unknown,
      useClient: unknown
    ) => unknown
  )(
    appId,
    0, // ConcurrentRoot
    null, // hydrationCallbacks
    false, // isStrictMode
    false, // concurrentUpdatesByDefault
    "", // identifierPrefix
    (error: Error, info: Reconciler.BaseErrorInfo) => {
      console.error("React reconciler error:", error, info);
    }, // onRecoverableError
    null, // transitionCallbacks
    null, // formState
    null, // useModernStrictMode
    null // useClient
  );

  reconciler.updateContainer(element, container, null, () => {
    // Render complete
  });
}
