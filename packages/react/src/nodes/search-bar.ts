import type * as GObject from "@gtkx/ffi/gobject";
import type * as Gtk from "@gtkx/ffi/gtk";
import type { GtkSearchBarProps } from "../jsx.js";
import { filterProps, hasChanged } from "./internal/props.js";
import type { SignalHandler } from "./internal/signal-store.js";
import { WidgetNode } from "./widget.js";

const OWN_PROPS = ["onSearchModeChanged"] as const;

type SearchBarProps = Pick<GtkSearchBarProps, (typeof OWN_PROPS)[number]>;

export class SearchBarNode extends WidgetNode<Gtk.SearchBar, SearchBarProps> {
    private notifyHandler: SignalHandler | null = null;

    public override commitUpdate(oldProps: SearchBarProps | null, newProps: SearchBarProps): void {
        super.commitUpdate(oldProps ? filterProps(oldProps, OWN_PROPS) : null, filterProps(newProps, OWN_PROPS));

        if (hasChanged(oldProps, newProps, "onSearchModeChanged")) {
            this.setSearchModeChanged(newProps.onSearchModeChanged);
        }
    }

    private setSearchModeChanged(callback?: ((searchMode: boolean) => void) | null): void {
        if (this.notifyHandler) {
            this.signalStore.set(this, this.container, "notify", undefined);
            this.notifyHandler = null;
        }

        if (callback) {
            this.notifyHandler = (_searchBar: Gtk.SearchBar, pspec: GObject.ParamSpec) => {
                if (pspec.getName() === "search-mode-enabled") {
                    callback(this.container.getSearchMode());
                }
            };
            this.signalStore.set(this, this.container, "notify", this.notifyHandler);
        }
    }

    public override detachDeletedInstance(): void {
        if (this.notifyHandler) {
            this.signalStore.set(this, this.container, "notify", undefined);
            this.notifyHandler = null;
        }
        super.detachDeletedInstance();
    }
}
