import * as Adw from "@gtkx/ffi/adw";
import type { ToastProps } from "../jsx.js";
import { registerNodeClass } from "../registry.js";
import { scheduleAfterCommit } from "../scheduler.js";
import { VirtualNode } from "./virtual.js";

type Props = ToastProps;

export class ToastNode extends VirtualNode<Props> {
    public static override priority = 1;

    public static override matches(type: string): boolean {
        return type === "Toast";
    }

    private toast?: Adw.Toast;
    private parent?: Adw.ToastOverlay;

    public setParent(parent?: Adw.ToastOverlay): void {
        this.parent = parent;
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
        if (!this.parent) return;

        this.toast = this.createToast();

        if (this.props.onButtonClicked) {
            this.signalStore.set(this.toast, "button-clicked", () => {
                this.props.onButtonClicked?.();
            });
        }

        this.signalStore.set(this.toast, "dismissed", () => {
            this.props.onDismissed?.();
        });

        this.parent.addToast(this.toast);
    }

    public override updateProps(oldProps: Props | null, newProps: Props): void {
        super.updateProps(oldProps, newProps);

        if (!oldProps) {
            scheduleAfterCommit(() => this.showToast());
            return;
        }

        if (!this.toast) return;

        if (oldProps.title !== newProps.title) {
            this.toast.setTitle(newProps.title);
        }

        if (oldProps.buttonLabel !== newProps.buttonLabel) {
            this.toast.setButtonLabel(newProps.buttonLabel);
        }

        if (oldProps.actionName !== newProps.actionName) {
            this.toast.setActionName(newProps.actionName);
        }

        if (oldProps.useMarkup !== newProps.useMarkup && newProps.useMarkup !== undefined) {
            this.toast.setUseMarkup(newProps.useMarkup);
        }
    }

    public override unmount(): void {
        if (this.toast) {
            this.toast.dismiss();
        }

        this.parent = undefined;
        super.unmount();
    }
}

registerNodeClass(ToastNode);
