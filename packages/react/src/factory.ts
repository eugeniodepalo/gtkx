import type * as Gtk from "@gtkx/ffi/gtk";
import type { Node } from "./node.js";
import { AboutDialogNode } from "./nodes/about-dialog.js";
import { ActionBarNode } from "./nodes/action-bar.js";
import { ColumnViewColumnNode, ColumnViewItemNode, ColumnViewNode } from "./nodes/column-view.js";
import { ComboRowNode } from "./nodes/combo-row.js";
import { DropDownItemNode, DropDownNode } from "./nodes/drop-down.js";
import { FlowBoxNode } from "./nodes/flow-box.js";
import { GridChildNode, GridNode } from "./nodes/grid.js";
import { AdwHeaderBarNode, HeaderBarNode, PackEndNode, PackStartNode } from "./nodes/header-bar.js";
import { ListBoxNode } from "./nodes/list-box.js";
import { ListItemNode, ListViewNode } from "./nodes/list-view.js";
import {
    ApplicationMenuNode,
    MenuItemNode,
    MenuSectionNode,
    MenuSubmenuNode,
    PopoverMenuBarNode,
    PopoverMenuRootNode,
} from "./nodes/menu.js";
import { NotebookNode, NotebookPageNode } from "./nodes/notebook.js";
import { OverlayNode } from "./nodes/overlay.js";
import { type ROOT_NODE_CONTAINER, RootNode } from "./nodes/root.js";
import { SlotNode } from "./nodes/slot.js";
import { StackNode, StackPageNode } from "./nodes/stack.js";
import { TextViewNode } from "./nodes/text-view.js";
import { ToggleButtonNode } from "./nodes/toggle-button.js";
import { ToolbarViewSlotNode } from "./nodes/toolbar-view.js";
import { ViewStackNode } from "./nodes/view-stack.js";
import { WidgetNode } from "./nodes/widget.js";
import { WindowNode } from "./nodes/window.js";

export type Props = Record<string, unknown>;

export { ROOT_NODE_CONTAINER } from "./nodes/root.js";

type NodeClass = {
    matches: (type: string, widget?: Gtk.Widget | typeof ROOT_NODE_CONTAINER) => boolean;
    new (type: string, widget?: Gtk.Widget | typeof ROOT_NODE_CONTAINER): Node;
};

const VIRTUAL_NODES = [
    ColumnViewColumnNode,
    ColumnViewItemNode,
    ListItemNode,
    DropDownItemNode,
    GridChildNode,
    NotebookPageNode,
    StackPageNode,
    MenuItemNode,
    MenuSectionNode,
    MenuSubmenuNode,
    ToolbarViewSlotNode,
    PackStartNode,
    PackEndNode,
    SlotNode,
] as NodeClass[];

const SPECIALIZED_NODES = [
    WindowNode,
    AboutDialogNode,
    TextViewNode,
    ToggleButtonNode,
    ApplicationMenuNode,
    PopoverMenuRootNode,
    PopoverMenuBarNode,
] as NodeClass[];

const CONTAINER_NODES = [
    ActionBarNode,
    FlowBoxNode,
    ListBoxNode,
    DropDownNode,
    ComboRowNode,
    GridNode,
    OverlayNode,
    ColumnViewNode,
    ListViewNode,
    NotebookNode,
    StackNode,
    ViewStackNode,
    AdwHeaderBarNode,
    HeaderBarNode,
] as NodeClass[];

const NODE_CLASSES = [RootNode, ...VIRTUAL_NODES, ...SPECIALIZED_NODES, ...CONTAINER_NODES, WidgetNode] as NodeClass[];

export const createNode = (type: string, props: Props, widget?: Gtk.Widget | typeof ROOT_NODE_CONTAINER): Node => {
    for (const NodeClass of NODE_CLASSES) {
        if (NodeClass.matches(type, widget)) {
            const node = new NodeClass(type, widget);
            node.initialize(props);
            return node;
        }
    }

    throw new Error(`No matching node class for type: ${type}`);
};
