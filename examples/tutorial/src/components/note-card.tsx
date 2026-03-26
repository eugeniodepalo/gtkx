import { css } from "@gtkx/css";
import * as Adw from "@gtkx/ffi/adw";
import * as Gtk from "@gtkx/ffi/gtk";
import { AdwTimedAnimation, GtkBox, GtkLabel } from "@gtkx/react";
import type { Note } from "../types.js";

const card = css`
    background: alpha(@card_bg_color, 0.8);
    border-radius: 12px;
    padding: 16px;

    &:hover {
        background: @card_bg_color;
    }
`;

const title = css`
    font-weight: bold;
    font-size: 14px;
`;

const preview = css`
    color: alpha(@window_fg_color, 0.6);
    font-size: 12px;
`;

const date = css`
    color: alpha(@window_fg_color, 0.4);
    font-size: 11px;
`;

export const NoteCard = ({ note }: { note: Note }) => (
    <AdwTimedAnimation
        initial={{ opacity: 0, translateY: -10 }}
        animate={{ opacity: 1, translateY: 0 }}
        exit={{ opacity: 0, translateX: -50 }}
        duration={200}
        easing={Adw.Easing.EASE_OUT_CUBIC}
        animateOnMount
    >
        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={4} cssClasses={[card]}>
            <GtkLabel label={note.title} halign={Gtk.Align.START} cssClasses={[title]} />
            <GtkLabel
                label={note.body || "Empty note"}
                halign={Gtk.Align.START}
                cssClasses={[preview]}
                ellipsize={2}
                lines={1}
            />
            <GtkLabel label={note.createdAt.toLocaleDateString()} halign={Gtk.Align.START} cssClasses={[date]} />
        </GtkBox>
    </AdwTimedAnimation>
);
