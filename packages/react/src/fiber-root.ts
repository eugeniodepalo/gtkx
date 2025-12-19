import type * as Gtk from "@gtkx/ffi/gtk";
import type Reconciler from "react-reconciler";
import { ROOT_NODE_CONTAINER } from "./factory.js";
import { reconciler } from "./reconciler.js";

export const createFiberRoot = (container?: Gtk.Widget): Reconciler.FiberRoot => {
    const instance = reconciler.getInstance();

    return instance.createContainer(
        container ?? ROOT_NODE_CONTAINER,
        0,
        null,
        false,
        null,
        "",
        (error: Error) => console.error("Fiber root render error:", error),
        () => {},
        () => {},
        () => {},
        null,
    );
};
