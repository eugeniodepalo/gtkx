import { batch } from "@gtkx/ffi";
import * as Gdk from "@gtkx/ffi/gdk";
import * as Gtk from "@gtkx/ffi/gtk";
import { GtkBox, GtkButton, GtkPaned, GtkScrolledWindow, GtkTextView } from "@gtkx/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Demo } from "../types.js";
import sourceCode from "./css-shadows.tsx?raw";

const DEFAULT_CSS = `/* You can edit the text in this window to change the
 * appearance of this Window.
 * Be careful, if you screw it up, nothing might be visible
 * anymore. :)
 */

window button {
  color: black;
  padding: 10px;
  border-radius: 5px;
  transition: all 250ms ease-in;
  border: 1px transparent solid;
}

window button:hover {
  text-shadow: 3px 3px 5px alpha(black, 0.75);
  -gtk-icon-shadow: 3px 3px 5px alpha(black, 0.75);
  box-shadow: 3px 3px 5px alpha(black, 0.5) inset;
  border: solid 1px alpha(black, 0.75);
}

window button:active {
  padding: 11px 9px 9px 11px;
  text-shadow: 1px 1px 2.5px alpha(black, 0.6);
  -gtk-icon-shadow: 1px 1px 2.5px alpha(black, 0.6);
}`;

const CssShadowsDemo = () => {
    const textViewRef = useRef<Gtk.TextView | null>(null);
    const providerRef = useRef<Gtk.CssProvider | null>(null);
    const [cssText, setCssText] = useState(DEFAULT_CSS);

    const applyCss = useCallback(() => {
        const display = Gdk.Display.getDefault();
        if (!display) return;

        if (providerRef.current) {
            Gtk.StyleContext.removeProviderForDisplay(display, providerRef.current);
        }

        const provider = new Gtk.CssProvider();
        providerRef.current = provider;
        provider.loadFromString(cssText);
        Gtk.StyleContext.addProviderForDisplay(display, provider, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION);
    }, [cssText]);

    useEffect(() => {
        applyCss();
        return () => {
            const display = Gdk.Display.getDefault();
            if (display && providerRef.current) {
                Gtk.StyleContext.removeProviderForDisplay(display, providerRef.current);
            }
        };
    }, [applyCss]);

    const handleBufferChanged = useCallback((buffer: Gtk.TextBuffer) => {
        const startIter = new Gtk.TextIter();
        const endIter = new Gtk.TextIter();
        batch(() => {
            buffer.getStartIter(startIter);
            buffer.getEndIter(endIter);
        });
        setCssText(buffer.getText(startIter, endIter, true));
    }, []);

    return (
        <GtkPaned
            orientation={Gtk.Orientation.VERTICAL}
            shrinkStartChild={false}
            shrinkEndChild={false}
            vexpand
            hexpand
        >
            <GtkBox spacing={6} valign={Gtk.Align.CENTER}>
                <GtkButton iconName="go-next" />
                <GtkButton iconName="go-previous" />
                <GtkButton label="Hello World" />
            </GtkBox>

            <GtkScrolledWindow vexpand hexpand>
                <GtkTextView
                    ref={textViewRef}
                    monospace
                    wrapMode={Gtk.WrapMode.WORD_CHAR}
                    topMargin={8}
                    bottomMargin={8}
                    leftMargin={8}
                    rightMargin={8}
                    onBufferChanged={handleBufferChanged}
                >
                    {cssText}
                </GtkTextView>
            </GtkScrolledWindow>
        </GtkPaned>
    );
};

export const cssShadowsDemo: Demo = {
    id: "css-shadows",
    title: "Theming/Shadows",
    description:
        "Live CSS editing for box-shadow effects. Edit the CSS to experiment with shadows on buttons in real-time.",
    keywords: ["css", "shadow", "box-shadow", "elevation", "depth", "glow", "live", "editing"],
    component: CssShadowsDemo,
    sourceCode,
};
