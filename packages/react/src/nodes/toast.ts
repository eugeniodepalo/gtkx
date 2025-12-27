import * as Adw from "@gtkx/ffi/adw";
import type { ToastProps } from "../jsx.js";
import { registerNodeClass } from "../registry.js";
import { VirtualNode } from "./virtual.js";

type Props = ToastProps;

export class ToastNode extends VirtualNode<Props> {
    public static override priority = 1;

    public static override matches(type: string): boolean {
        return type === "Toast";
    }

    private toast: Adw.Toast | null = null;
    private overlay: Adw.ToastOverlay | null = null;
    private isShown = false;

    public setToastOverlay(overlay?: Adw.ToastOverlay): void {
        if (!overlay) {
            if (this.toast && this.isShown) {
                this.toast.dismiss();
            }
            this.cleanup();
            this.overlay = null;
            return;
        }

        this.overlay = overlay;
        this.showToast();
    }

    private createToast(): Adw.Toast {
        const toast = new Adw.Toast(this.props.title);

        if (this.props.timeout !== undefined) {
            toast.setTimeout(this.props.timeout);
        }

        if (this.props.priority !== undefined) {
            toast.setPriority(this.props.priority);
        }

        if (this.props.buttonLabel) {
            toast.setButtonLabel(this.props.buttonLabel);
        }

        if (this.props.actionName) {
            toast.setActionName(this.props.actionName);
        }

        if (this.props.useMarkup !== undefined) {
            toast.setUseMarkup(this.props.useMarkup);
        }

        return toast;
    }

    private showToast(): void {
        if (!this.overlay || this.isShown) return;

        this.cleanup();
        this.toast = this.createToast();

        if (this.props.onButtonClicked) {
            this.signalStore.set(this.toast, "button-clicked", () => {
                this.props.onButtonClicked?.();
            });
        }

        this.signalStore.set(this.toast, "dismissed", () => {
            this.isShown = false;
            this.props.onDismissed?.();
        });

        this.overlay.addToast(this.toast);
        this.isShown = true;
    }

    private cleanup(): void {
        this.signalStore.clear();
        this.toast = null;
        this.isShown = false;
    }

    public override updateProps(oldProps: Props | null, newProps: Props): void {
        super.updateProps(oldProps, newProps);

        if (!this.toast || !this.isShown) return;

        if (oldProps?.title !== newProps.title) {
            this.toast.setTitle(newProps.title);
        }

        if (oldProps?.buttonLabel !== newProps.buttonLabel) {
            this.toast.setButtonLabel(newProps.buttonLabel);
        }

        if (oldProps?.actionName !== newProps.actionName) {
            this.toast.setActionName(newProps.actionName);
        }

        if (oldProps?.useMarkup !== newProps.useMarkup && newProps.useMarkup !== undefined) {
            this.toast.setUseMarkup(newProps.useMarkup);
        }
    }
}

registerNodeClass(ToastNode);
