/**
 * Hand-written runtime augmentation for `Gtk.ScrolledWindow`.
 *
 * node-gtk exposes a `scrollTo` instance method that animates a scrolled
 * window's adjustment toward a target value over a fixed duration. There is no
 * GIR backing for this helper, so the gtkx FFI layers it onto the generated
 * class prototype here.
 */

import type { TickCallback } from "../generated/gtk/gtk.js";
import { ScrolledWindow } from "../generated/gtk/gtk.js";

declare module "../generated/gtk/gtk.js" {
    interface ScrolledWindow {
        /**
         * Animates this scrolled window's adjustment toward `value`.
         *
         * The animation eases out over a fixed duration; a pending animation
         * on the same window is cancelled before a new one starts.
         *
         * @param value - The target adjustment value.
         * @param vertical - Animate the vertical adjustment when `true`
         *   (the default), the horizontal adjustment otherwise.
         * @returns The tick-callback identifier driving the animation.
         */
        scrollTo(value: number, vertical?: boolean): number;
    }
}

const SCROLL_DURATION_MS = 200;
const MICROSECONDS_PER_MS = 1000;

const scrollingWidgets = new WeakMap<ScrolledWindow, number>();

const easeOutCubic = (t: number): number => {
    const p = t - 1;
    return p * p * p + 1;
};

function scrollToImpl(this: ScrolledWindow, value: number, vertical = true): number {
    const adjustment = vertical ? this.getVadjustment() : this.getHadjustment();
    const clock = this.getFrameClock();
    if (!clock) {
        throw new Error("ScrolledWindow.scrollTo requires a realized frame clock");
    }
    const start = adjustment.getValue();
    const startTime = clock.getFrameTime();
    const endTime = startTime + MICROSECONDS_PER_MS * SCROLL_DURATION_MS;

    const previousTickId = scrollingWidgets.get(this);
    if (previousTickId) this.removeTickCallback(previousTickId);

    const tick: TickCallback = (_widget, frameClock) => {
        const now = frameClock.getFrameTime();
        if (now < endTime && adjustment.getValue() !== value) {
            const progress = easeOutCubic((now - startTime) / (endTime - startTime));
            adjustment.setValue(start + progress * (value - start));
            return true;
        }
        adjustment.setValue(value);
        return false;
    };

    const tickId = this.addTickCallback(tick);
    scrollingWidgets.set(this, tickId);
    return tickId;
}

ScrolledWindow.prototype.scrollTo = scrollToImpl;
