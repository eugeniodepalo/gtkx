import type * as Gtk from "@gtkx/ffi/gtk";
import type { Node } from "./node.js";
import { DropDownItemNode, DropDownNode } from "./nodes/dropdown.js";
import { GridChildNode, GridNode } from "./nodes/grid.js";
import { ListItemNode, ListViewNode } from "./nodes/list.js";
import { OverlayNode } from "./nodes/overlay.js";
import { SlotNode } from "./nodes/slot.js";
import { WidgetNode } from "./nodes/widget.js";

export type Props = Record<string, unknown>;

interface NodeClass {
    matches: (type: string) => boolean;
    new (type: string, props: Props, currentApp?: unknown): Node;
}

const NODE_CLASSES = [
    SlotNode,
    ListItemNode,
    DropDownItemNode,
    DropDownNode,
    GridChildNode,
    GridNode,
    OverlayNode,
    ListViewNode,
    WidgetNode,
] as NodeClass[];

export const createNode = (type: string, props: Props, app: Gtk.Application): Node => {
    for (const NodeClass of NODE_CLASSES) {
        if (NodeClass.matches(type)) {
            return new NodeClass(type, props, app);
        }
    }

    throw new Error(`No matching node class for type: ${type}`);
};
