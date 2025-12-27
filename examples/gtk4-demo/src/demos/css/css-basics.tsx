import { beginBatch, endBatch } from "@gtkx/ffi";
import * as Gdk from "@gtkx/ffi/gdk";
import * as GObject from "@gtkx/ffi/gobject";
import * as Gtk from "@gtkx/ffi/gtk";
import { GtkBox, GtkButton, GtkFrame, GtkLabel, GtkScrolledWindow, GtkTextView } from "@gtkx/react";
import { useEffect, useState } from "react";
import type { Demo } from "../types.js";

const STYLE_PROVIDER_PRIORITY_APPLICATION = 600;

const DEFAULT_CSS = `/* Try editing this CSS! */
.demo-box {
  background-color: @accent_bg_color;
  color: @accent_fg_color;
  padding: 24px;
  border-radius: 12px;
}

.demo-box:hover {
  background-color: shade(@accent_bg_color, 1.1);
}

.demo-label {
  font-size: 18px;
  font-weight: bold;
}

.demo-button {
  padding: 12px 24px;
  border-radius: 8px;
  background-color: @success_bg_color;
  color: @success_fg_color;
}

.demo-button:hover {
  background-color: shade(@success_bg_color, 1.15);
}`;

const getBufferText = (buffer: Gtk.TextBuffer): string => {
    beginBatch();
    const startIter = new Gtk.TextIter();
    const endIter = new Gtk.TextIter();
    buffer.getStartIter(startIter);
    buffer.getEndIter(endIter);
    endBatch();
    return buffer.getText(startIter, endIter, true);
};

const CssBasicsDemo = () => {
    const [buffer] = useState(() => new Gtk.TextBuffer());
    const [cssProvider] = useState(() => new Gtk.CssProvider());
    const [error, setError] = useState<string | null>(null);
    const [initialized, setInitialized] = useState(false);

    // Initialize CSS provider and register it
    useEffect(() => {
        const display = Gdk.DisplayManager.get().getDefaultDisplay();
        if (display) {
            Gtk.StyleContext.addProviderForDisplay(display, cssProvider, STYLE_PROVIDER_PRIORITY_APPLICATION);
        }

        // Set initial CSS
        buffer.setText(DEFAULT_CSS, -1);
        setInitialized(true);

        return () => {
            if (display) {
                Gtk.StyleContext.removeProviderForDisplay(display, cssProvider);
            }
        };
    }, [buffer, cssProvider]);

    // Apply CSS when buffer changes
    useEffect(() => {
        if (!initialized) return;

        const handlerId = buffer.connect("changed", () => {
            const css = getBufferText(buffer);
            try {
                cssProvider.loadFromString(css);
                setError(null);
            } catch (e) {
                setError(e instanceof Error ? e.message : "Invalid CSS");
            }
        });

        // Apply initial CSS
        try {
            cssProvider.loadFromString(DEFAULT_CSS);
            setError(null);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Invalid CSS");
        }

        return () => {
            GObject.signalHandlerDisconnect(buffer, handlerId);
        };
    }, [buffer, cssProvider, initialized]);

    const handleReset = () => {
        buffer.setText(DEFAULT_CSS, -1);
    };

    return (
        <GtkBox
            orientation={Gtk.Orientation.VERTICAL}
            spacing={20}
            marginStart={20}
            marginEnd={20}
            marginTop={20}
            marginBottom={20}
        >
            <GtkLabel label="CSS Basics" cssClasses={["title-2"]} halign={Gtk.Align.START} />

            <GtkLabel
                label="GTK4 uses CSS for styling widgets. Edit the CSS below to see changes applied in real-time to the preview widgets. GTK CSS supports theme variables like @accent_bg_color and functions like shade()."
                wrap
                halign={Gtk.Align.START}
                cssClasses={["dim-label"]}
            />

            <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={20} vexpand>
                {/* CSS Editor */}
                <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={12} hexpand>
                    <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={12}>
                        <GtkLabel label="CSS Editor" cssClasses={["heading"]} halign={Gtk.Align.START} hexpand />
                        <GtkButton label="Reset" onClicked={handleReset} cssClasses={["flat"]} />
                    </GtkBox>

                    <GtkFrame>
                        <GtkScrolledWindow minContentHeight={300} hexpand vexpand>
                            <GtkTextView
                                buffer={buffer}
                                monospace
                                leftMargin={12}
                                rightMargin={12}
                                topMargin={12}
                                bottomMargin={12}
                                wrapMode={Gtk.WrapMode.WORD_CHAR}
                            />
                        </GtkScrolledWindow>
                    </GtkFrame>

                    {error && (
                        <GtkLabel label={`CSS Error: ${error}`} cssClasses={["error"]} halign={Gtk.Align.START} wrap />
                    )}
                </GtkBox>

                {/* Preview */}
                <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={12} hexpand>
                    <GtkLabel label="Live Preview" cssClasses={["heading"]} halign={Gtk.Align.START} />

                    <GtkFrame>
                        <GtkBox
                            orientation={Gtk.Orientation.VERTICAL}
                            spacing={16}
                            marginTop={20}
                            marginBottom={20}
                            marginStart={20}
                            marginEnd={20}
                        >
                            <GtkBox
                                cssClasses={["demo-box"]}
                                orientation={Gtk.Orientation.VERTICAL}
                                spacing={12}
                                halign={Gtk.Align.CENTER}
                            >
                                <GtkLabel label="Styled Box" cssClasses={["demo-label"]} />
                                <GtkLabel label="Hover over this box!" />
                            </GtkBox>

                            <GtkButton
                                label="Styled Button"
                                cssClasses={["demo-button"]}
                                halign={Gtk.Align.CENTER}
                                onClicked={() => {}}
                            />

                            <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={12} halign={Gtk.Align.CENTER}>
                                <GtkButton label="Normal" onClicked={() => {}} />
                                <GtkButton label="Suggested" cssClasses={["suggested-action"]} onClicked={() => {}} />
                                <GtkButton
                                    label="Destructive"
                                    cssClasses={["destructive-action"]}
                                    onClicked={() => {}}
                                />
                            </GtkBox>
                        </GtkBox>
                    </GtkFrame>
                </GtkBox>
            </GtkBox>

            {/* CSS Reference */}
            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                <GtkLabel label="GTK CSS Reference" cssClasses={["heading"]} halign={Gtk.Align.START} />
                <GtkLabel
                    label="Common theme variables: @theme_bg_color, @theme_fg_color, @accent_bg_color, @accent_fg_color, @success_bg_color, @warning_bg_color, @error_bg_color. Functions: shade(color, factor), mix(color1, color2, factor), alpha(color, alpha)."
                    wrap
                    cssClasses={["dim-label"]}
                    halign={Gtk.Align.START}
                />
            </GtkBox>
        </GtkBox>
    );
};

const sourceCode = `import { beginBatch, endBatch } from "@gtkx/ffi";
import * as Gdk from "@gtkx/ffi/gdk";
import * as Gtk from "@gtkx/ffi/gtk";
import { GtkBox, GtkTextView, GtkScrolledWindow } from "@gtkx/react";
import { useEffect, useState } from "react";

const STYLE_PROVIDER_PRIORITY_APPLICATION = 600;

const CssEditor = () => {
  const [buffer] = useState(() => new Gtk.TextBuffer());
  const [cssProvider] = useState(() => new Gtk.CssProvider());

  useEffect(() => {
    // Register the CSS provider globally
    const display = Gdk.DisplayManager.get().getDefaultDisplay();
    if (display) {
      Gtk.StyleContext.addProviderForDisplay(
        display,
        cssProvider,
        STYLE_PROVIDER_PRIORITY_APPLICATION,
      );
    }

    // Listen for buffer changes
    buffer.connect("changed", () => {
      const css = getBufferText(buffer);
      try {
        cssProvider.loadFromString(css);
      } catch (e) {
        console.error("Invalid CSS:", e);
      }
    });

    return () => {
      if (display) {
        Gtk.StyleContext.removeProviderForDisplay(display, cssProvider);
      }
    };
  }, [buffer, cssProvider]);

  return (
    <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={12}>
      <GtkScrolledWindow minContentHeight={200}>
        <GtkTextView buffer={buffer} monospace />
      </GtkScrolledWindow>

      {/* Preview widgets with custom CSS classes */}
      <GtkBox cssClasses={["demo-box"]}>
        <GtkLabel label="Styled content" cssClasses={["demo-label"]} />
      </GtkBox>
    </GtkBox>
  );
};`;

export const cssBasicsDemo: Demo = {
    id: "css-basics",
    title: "CSS Basics",
    description: "Live CSS editor to explore GTK styling",
    keywords: ["css", "style", "theme", "editor", "live", "CssProvider"],
    component: CssBasicsDemo,
    sourceCode,
};
