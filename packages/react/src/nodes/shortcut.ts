import * as Gtk from "@gtkx/ffi/gtk";
import { registerNodeClass } from "../registry.js";
import type { Props } from "../types.js";
import { VirtualNode } from "./virtual.js";

/**
 * Props for the Shortcut virtual element.
 *
 * Defines a keyboard shortcut. Must be a child of `x.ShortcutController`.
 *
 * @example
 * ```tsx
 * <x.ShortcutController>
 *     <x.Shortcut trigger="<Control>s" onActivate={save} />
 *     <x.Shortcut trigger={["F5", "<Control>r"]} onActivate={refresh} />
 *     <x.Shortcut trigger="Escape" onActivate={cancel} disabled={!canCancel} />
 * </x.ShortcutController>
 * ```
 */
export interface ShortcutProps extends Props {
    /** The trigger string(s) using GTK accelerator format (e.g., "\<Control\>s", "F1") */
    trigger: string | string[];
    /**
     * Called when the shortcut is activated.
     * Return false to indicate the shortcut was not handled; otherwise it is considered handled.
     */
    // biome-ignore lint/suspicious/noConfusingVoidType: void is intentional - returning nothing means "handled"
    onActivate: () => boolean | void;
    /** Whether the shortcut is disabled */
    disabled?: boolean;
}

export class ShortcutNode extends VirtualNode<ShortcutProps> {
    public static override priority = 1;

    public static override matches(type: string): boolean {
        return type === "Shortcut";
    }

    public shortcut?: Gtk.Shortcut;
    private action?: Gtk.CallbackAction;

    public createShortcut(): void {
        const trigger = this.createTrigger();
        this.action = new Gtk.CallbackAction(() => {
            const result = this.props.onActivate();
            return result !== false;
        });
        this.shortcut = new Gtk.Shortcut(trigger, this.action);
    }

    public override updateProps(oldProps: ShortcutProps | null, newProps: ShortcutProps): void {
        super.updateProps(oldProps, newProps);
        if (this.shortcut && (oldProps?.trigger !== newProps.trigger || oldProps?.disabled !== newProps.disabled)) {
            this.shortcut.setTrigger(this.createTrigger());
        }
    }

    public override unmount(): void {
        this.shortcut = undefined;
        this.action = undefined;
        super.unmount();
    }

    private createTrigger(): Gtk.ShortcutTrigger {
        if (this.props.disabled) {
            return Gtk.NeverTrigger.get();
        }

        const { trigger } = this.props;
        const triggers = Array.isArray(trigger) ? trigger : [trigger];

        if (triggers.length === 0) {
            return Gtk.NeverTrigger.get();
        }

        let result: Gtk.ShortcutTrigger = new Gtk.ShortcutTrigger(triggers[0] as string);
        for (let i = 1; i < triggers.length; i++) {
            result = new Gtk.AlternativeTrigger(result, new Gtk.ShortcutTrigger(triggers[i] as string));
        }
        return result;
    }
}

registerNodeClass(ShortcutNode);
