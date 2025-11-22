import type { ReactNode, ReactPortal } from "react";

/**
 * Creates a portal that renders children into a different GTK widget container.
 *
 * Similar to ReactDOM.createPortal, this allows you to render a subtree into
 * a different part of the widget tree.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const popoverContainer = React.useRef<unknown>(null);
 *
 *   return (
 *     <>
 *       <Box ref={popoverContainer} />
 *       {createPortal(
 *         <Label label="This is rendered in the Box" />,
 *         popoverContainer.current
 *       )}
 *     </>
 *   );
 * }
 * ```
 */
export function createPortal(
  children: ReactNode,
  container: unknown,
  key?: string | null,
): ReactPortal {
  if (!container) {
    throw new Error(
      "createPortal: container is null or undefined. " +
        "Make sure the container widget exists before creating a portal."
    );
  }

  return {
    $$typeof: Symbol.for("react.portal"),
    key: key == null ? null : String(key),
    children,
    containerInfo: container,
    implementation: null,
  } as unknown as ReactPortal;
}
