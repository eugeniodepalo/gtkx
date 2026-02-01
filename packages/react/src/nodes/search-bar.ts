import type * as Gtk from "@gtkx/ffi/gtk";
import type { GtkSearchBarProps } from "../jsx.js";
import { filterProps, hasChanged } from "./internal/props.js";
import { WidgetNode } from "./widget.js";

const OWN_PROPS = ["onSearchModeChanged"] as const;

type SearchBarProps = Pick<GtkSearchBarProps, (typeof OWN_PROPS)[number]>;

export class SearchBarNode extends WidgetNode<Gtk.SearchBar, SearchBarProps> {
    public override commitUpdate(oldProps: SearchBarProps | null, newProps: SearchBarProps): void {
        super.commitUpdate(oldProps ? filterProps(oldProps, OWN_PROPS) : null, filterProps(newProps, OWN_PROPS));
        this.applyOwnProps(oldProps, newProps);
    }

    private applyOwnProps(oldProps: SearchBarProps | null, newProps: SearchBarProps): void {
        if (hasChanged(oldProps, newProps, "onSearchModeChanged")) {
            const callback = newProps.onSearchModeChanged;
            this.signalStore.set(
                this,
                this.container,
                "notify::search-mode-enabled",
                callback ? () => callback(this.container.getSearchMode()) : undefined,
            );
        }
    }
}
