import type * as Gtk from "@gtkx/ffi/gtk";
import type { LevelBarOffsetProps } from "../jsx.js";
import { registerNodeClass } from "../registry.js";
import { VirtualNode } from "./virtual.js";

export class LevelBarOffsetNode extends VirtualNode<LevelBarOffsetProps> {
    public static override priority = 1;

    private levelBar?: Gtk.LevelBar;
    private onRebuild?: () => void;

    public static override matches(type: string): boolean {
        return type === "LevelBarOffset";
    }

    public setLevelBar(levelBar: Gtk.LevelBar, onRebuild: () => void): void {
        this.levelBar = levelBar;
        this.onRebuild = onRebuild;
    }

    public addOffset(): string | undefined {
        if (!this.levelBar) return undefined;

        this.levelBar.addOffsetValue(this.props.id, this.props.value);
        return this.props.id;
    }

    public override updateProps(oldProps: LevelBarOffsetProps | null, newProps: LevelBarOffsetProps): void {
        super.updateProps(oldProps, newProps);

        if (oldProps && this.levelBar) {
            const changed = oldProps.id !== newProps.id || oldProps.value !== newProps.value;

            if (changed) {
                this.onRebuild?.();
            }
        }
    }

    public override unmount(): void {
        this.levelBar = undefined;
        this.onRebuild = undefined;
        super.unmount();
    }
}

registerNodeClass(LevelBarOffsetNode);
