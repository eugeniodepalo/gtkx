import type * as Gtk from "@gtkx/ffi/gtk";
import { Node } from "../node.js";

export class WidgetNode extends Node<Gtk.Widget> {
    static matches(_type: string): boolean {
        return true;
    }
}
