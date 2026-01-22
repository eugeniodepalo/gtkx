import { isStarted } from "@gtkx/ffi";
import * as Gdk from "@gtkx/ffi/gdk";
import * as Gtk from "@gtkx/ffi/gtk";

const STYLE_PROVIDER_PRIORITY_ANIMATIONS = 700;

let instance: AnimationStyleSheet | null = null;

export function getAnimationStyleSheet(): AnimationStyleSheet {
    if (!instance) {
        instance = new AnimationStyleSheet();
    }
    return instance;
}

class AnimationStyleSheet {
    private provider: Gtk.CssProvider | null = null;
    private display: Gdk.Display | null = null;
    private rules = new Map<string, string>();
    private dirty = false;
    private flushScheduled = false;

    setRule(widgetId: string, transformCss: string): void {
        const rule = `#${widgetId} { transform-origin: center center; transform: ${transformCss}; }`;
        this.rules.set(widgetId, rule);
        this.markDirty();
    }

    removeRule(widgetId: string): void {
        if (this.rules.delete(widgetId)) {
            this.markDirty();
        }
    }

    private markDirty(): void {
        this.dirty = true;
        this.scheduleFlush();
    }

    private scheduleFlush(): void {
        if (this.flushScheduled) return;
        this.flushScheduled = true;

        if (isStarted) {
            queueMicrotask(() => this.flush());
        }
    }

    private flush(): void {
        this.flushScheduled = false;

        if (!this.dirty) return;
        this.dirty = false;

        if (!isStarted) return;

        this.ensureProvider();

        if (this.rules.size === 0) {
            this.provider?.loadFromString("");
            return;
        }

        const css = [...this.rules.values()].join("\n");
        this.provider?.loadFromString(css);
    }

    private ensureProvider(): void {
        if (this.provider) return;

        this.provider = new Gtk.CssProvider();
        this.display = Gdk.DisplayManager.get().getDefaultDisplay();

        if (this.display) {
            Gtk.StyleContext.addProviderForDisplay(this.display, this.provider, STYLE_PROVIDER_PRIORITY_ANIMATIONS);
        }
    }

    dispose(): void {
        if (this.provider && this.display) {
            Gtk.StyleContext.removeProviderForDisplay(this.display, this.provider);
        }
        this.provider = null;
        this.display = null;
        this.rules.clear();
        this.dirty = false;
        this.flushScheduled = false;
    }
}
