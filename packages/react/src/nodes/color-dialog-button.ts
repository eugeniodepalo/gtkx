import type * as Gdk from "@gtkx/ffi/gdk";
import * as Gtk from "@gtkx/ffi/gtk";
import { registerNodeClass } from "../registry.js";
import type { Container, ContainerClass, Props } from "../types.js";
import { signalStore } from "./internal/signal-store.js";
import { filterProps, hasChanged, matchesAnyClass } from "./internal/utils.js";
import { WidgetNode } from "./widget.js";

export interface ColorDialogButtonProps extends Props {
    rgba?: Gdk.RGBA | null;
    onRgbaChanged?: (rgba: Gdk.RGBA) => void;
    title?: string;
    modal?: boolean;
    withAlpha?: boolean;
}

const OWN_PROPS = ["rgba", "onRgbaChanged", "title", "modal", "withAlpha"] as const;

class ColorDialogButtonNode extends WidgetNode<Gtk.ColorDialogButton, ColorDialogButtonProps> {
    public static override priority = 1;

    private dialog: Gtk.ColorDialog;
    private notifyHandler: ((button: Gtk.ColorDialogButton, propName: string) => void) | null = null;

    public static override matches(_type: string, containerOrClass?: Container | ContainerClass | null): boolean {
        return matchesAnyClass([Gtk.ColorDialogButton], containerOrClass);
    }

    public static override createContainer(
        props: ColorDialogButtonProps,
        containerClass: typeof Gtk.Widget,
    ): Container | null {
        const dialog = new Gtk.ColorDialog();
        const button = new (containerClass as typeof Gtk.ColorDialogButton)(dialog);
        return button;
    }

    constructor(type: string, props: ColorDialogButtonProps, container: Gtk.ColorDialogButton) {
        super(type, props, container);
        this.dialog = container.getDialog()!;
    }

    public override updateProps(oldProps: ColorDialogButtonProps | null, newProps: ColorDialogButtonProps): void {
        super.updateProps(
            oldProps ? (filterProps(oldProps, OWN_PROPS) as ColorDialogButtonProps) : null,
            filterProps(newProps, OWN_PROPS) as ColorDialogButtonProps,
        );
        this.applyOwnProps(oldProps, newProps);
    }

    protected applyOwnProps(oldProps: ColorDialogButtonProps | null, newProps: ColorDialogButtonProps): void {
        if (hasChanged(oldProps, newProps, "title") && newProps.title !== undefined) {
            this.dialog.setTitle(newProps.title);
        }

        if (hasChanged(oldProps, newProps, "modal")) {
            this.dialog.setModal(newProps.modal ?? true);
        }

        if (hasChanged(oldProps, newProps, "withAlpha")) {
            this.dialog.setWithAlpha(newProps.withAlpha ?? true);
        }

        if (hasChanged(oldProps, newProps, "rgba") && newProps.rgba) {
            this.container.setRgba(newProps.rgba);
        }

        if (hasChanged(oldProps, newProps, "onRgbaChanged")) {
            this.setupNotifyHandler(newProps.onRgbaChanged);
        }
    }

    private setupNotifyHandler(callback?: (rgba: Gdk.RGBA) => void): void {
        if (this.notifyHandler) {
            signalStore.set(this, this.container, "notify", undefined);
            this.notifyHandler = null;
        }

        if (callback) {
            this.notifyHandler = (_button: Gtk.ColorDialogButton, propName: string) => {
                if (propName === "rgba") {
                    const rgba = this.container.getRgba();
                    callback(rgba);
                }
            };
            signalStore.set(this, this.container, "notify", this.notifyHandler);
        }
    }

    public override unmount(): void {
        if (this.notifyHandler) {
            signalStore.set(this, this.container, "notify", undefined);
            this.notifyHandler = null;
        }
        super.unmount();
    }
}

registerNodeClass(ColorDialogButtonNode);
