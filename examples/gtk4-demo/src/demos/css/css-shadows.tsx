import * as Gdk from "@gtkx/ffi/gdk";
import * as Gtk from "@gtkx/ffi/gtk";
import { GtkBox, GtkButton, GtkFrame, GtkLabel } from "@gtkx/react";
import { useEffect, useState } from "react";
import type { Demo } from "../types.js";

const STYLE_PROVIDER_PRIORITY_APPLICATION = 600;

const SHADOW_CSS = `
  .shadow-card {
    padding: 24px;
    border-radius: 12px;
    background-color: @theme_bg_color;
    min-height: 80px;
    min-width: 120px;
  }

  .colored-card {
    padding: 24px;
    border-radius: 12px;
    min-height: 60px;
    min-width: 100px;
  }

  .shadow-subtle {
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.08);
  }

  .shadow-medium {
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .shadow-large {
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2), 0 3px 6px rgba(0, 0, 0, 0.12);
  }

  .shadow-xl {
    box-shadow: 0 15px 30px rgba(0, 0, 0, 0.25), 0 5px 15px rgba(0, 0, 0, 0.15);
  }

  .shadow-inner {
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.15);
  }

  .shadow-colored-blue {
    box-shadow: 0 8px 20px rgba(53, 132, 228, 0.4);
  }

  .shadow-colored-green {
    box-shadow: 0 8px 20px rgba(46, 194, 126, 0.4);
  }

  .shadow-colored-red {
    box-shadow: 0 8px 20px rgba(224, 27, 36, 0.4);
  }

  .shadow-colored-purple {
    box-shadow: 0 8px 20px rgba(145, 65, 172, 0.4);
  }

  .shadow-glow {
    box-shadow: 0 0 20px rgba(53, 132, 228, 0.6), 0 0 40px rgba(53, 132, 228, 0.3);
  }

  .shadow-layered {
    box-shadow:
      0 1px 1px rgba(0, 0, 0, 0.08),
      0 2px 2px rgba(0, 0, 0, 0.08),
      0 4px 4px rgba(0, 0, 0, 0.08),
      0 8px 8px rgba(0, 0, 0, 0.08),
      0 16px 16px rgba(0, 0, 0, 0.08);
  }

  .shadow-offset {
    box-shadow: 8px 8px 0 @accent_bg_color;
  }

  .colored-card-blue {
    background-color: #3584e4;
    color: white;
  }

  .colored-card-green {
    background-color: #2ec27e;
    color: white;
  }

  .colored-card-red {
    background-color: #e01b24;
    color: white;
  }

  .colored-card-purple {
    background-color: #9141ac;
    color: white;
  }
`;

interface ShadowCardProps {
    label: string;
    shadowClass: string;
    description: string;
}

const ShadowCard = ({ label, shadowClass, description }: ShadowCardProps) => (
    <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8} valign={Gtk.Align.START}>
        <GtkBox
            cssClasses={["shadow-card", shadowClass]}
            orientation={Gtk.Orientation.VERTICAL}
            spacing={0}
            halign={Gtk.Align.CENTER}
            valign={Gtk.Align.CENTER}
        >
            <GtkLabel label={label} cssClasses={["heading"]} />
        </GtkBox>
        <GtkLabel label={description} cssClasses={["dim-label", "caption"]} halign={Gtk.Align.CENTER} />
    </GtkBox>
);

const CssShadowsDemo = () => {
    const [selectedShadow, setSelectedShadow] = useState("shadow-medium");
    const [cssProvider] = useState(() => new Gtk.CssProvider());

    // Register CSS provider
    useEffect(() => {
        const display = Gdk.DisplayManager.get().getDefaultDisplay();
        if (display) {
            cssProvider.loadFromString(SHADOW_CSS);
            Gtk.StyleContext.addProviderForDisplay(display, cssProvider, STYLE_PROVIDER_PRIORITY_APPLICATION);
        }

        return () => {
            if (display) {
                Gtk.StyleContext.removeProviderForDisplay(display, cssProvider);
            }
        };
    }, [cssProvider]);

    return (
        <GtkBox
            orientation={Gtk.Orientation.VERTICAL}
            spacing={24}
            marginStart={20}
            marginEnd={20}
            marginTop={20}
            marginBottom={20}
        >
            <GtkLabel label="CSS Shadows" cssClasses={["title-2"]} halign={Gtk.Align.START} />

            <GtkLabel
                label="GTK CSS supports box-shadow for creating depth and elevation effects. Shadows can be used for cards, buttons, dialogs, and other elevated surfaces."
                wrap
                halign={Gtk.Align.START}
                cssClasses={["dim-label"]}
            />

            {/* Elevation Levels */}
            <GtkFrame label="Elevation Levels">
                <GtkBox
                    orientation={Gtk.Orientation.HORIZONTAL}
                    spacing={32}
                    marginTop={24}
                    marginBottom={24}
                    marginStart={24}
                    marginEnd={24}
                    homogeneous
                >
                    <ShadowCard label="Subtle" shadowClass="shadow-subtle" description="Minimal elevation" />
                    <ShadowCard label="Medium" shadowClass="shadow-medium" description="Cards, panels" />
                    <ShadowCard label="Large" shadowClass="shadow-large" description="Modals, dialogs" />
                    <ShadowCard label="XL" shadowClass="shadow-xl" description="Floating elements" />
                </GtkBox>
            </GtkFrame>

            {/* Special Effects */}
            <GtkFrame label="Special Effects">
                <GtkBox
                    orientation={Gtk.Orientation.HORIZONTAL}
                    spacing={32}
                    marginTop={24}
                    marginBottom={24}
                    marginStart={24}
                    marginEnd={24}
                    homogeneous
                >
                    <ShadowCard label="Inner" shadowClass="shadow-inner" description="Inset shadow" />
                    <ShadowCard label="Layered" shadowClass="shadow-layered" description="Smooth depth" />
                    <ShadowCard label="Glow" shadowClass="shadow-glow" description="Glowing effect" />
                    <ShadowCard label="Offset" shadowClass="shadow-offset" description="Retro style" />
                </GtkBox>
            </GtkFrame>

            {/* Colored Shadows */}
            <GtkFrame label="Colored Shadows">
                <GtkBox
                    orientation={Gtk.Orientation.HORIZONTAL}
                    spacing={32}
                    marginTop={24}
                    marginBottom={24}
                    marginStart={24}
                    marginEnd={24}
                    homogeneous
                >
                    <GtkBox
                        cssClasses={["colored-card", "shadow-colored-blue", "colored-card-blue"]}
                        orientation={Gtk.Orientation.VERTICAL}
                        spacing={0}
                        halign={Gtk.Align.CENTER}
                        valign={Gtk.Align.CENTER}
                    >
                        <GtkLabel label="Blue" cssClasses={["heading"]} />
                    </GtkBox>

                    <GtkBox
                        cssClasses={["colored-card", "shadow-colored-green", "colored-card-green"]}
                        orientation={Gtk.Orientation.VERTICAL}
                        spacing={0}
                        halign={Gtk.Align.CENTER}
                        valign={Gtk.Align.CENTER}
                    >
                        <GtkLabel label="Green" cssClasses={["heading"]} />
                    </GtkBox>

                    <GtkBox
                        cssClasses={["colored-card", "shadow-colored-red", "colored-card-red"]}
                        orientation={Gtk.Orientation.VERTICAL}
                        spacing={0}
                        halign={Gtk.Align.CENTER}
                        valign={Gtk.Align.CENTER}
                    >
                        <GtkLabel label="Red" cssClasses={["heading"]} />
                    </GtkBox>

                    <GtkBox
                        cssClasses={["colored-card", "shadow-colored-purple", "colored-card-purple"]}
                        orientation={Gtk.Orientation.VERTICAL}
                        spacing={0}
                        halign={Gtk.Align.CENTER}
                        valign={Gtk.Align.CENTER}
                    >
                        <GtkLabel label="Purple" cssClasses={["heading"]} />
                    </GtkBox>
                </GtkBox>
            </GtkFrame>

            {/* Interactive Demo */}
            <GtkFrame label="Interactive Demo">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={16}
                    marginTop={20}
                    marginBottom={20}
                    marginStart={20}
                    marginEnd={20}
                >
                    <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={8} halign={Gtk.Align.CENTER}>
                        <GtkButton
                            label="Subtle"
                            cssClasses={selectedShadow === "shadow-subtle" ? ["suggested-action"] : []}
                            onClicked={() => setSelectedShadow("shadow-subtle")}
                        />
                        <GtkButton
                            label="Medium"
                            cssClasses={selectedShadow === "shadow-medium" ? ["suggested-action"] : []}
                            onClicked={() => setSelectedShadow("shadow-medium")}
                        />
                        <GtkButton
                            label="Large"
                            cssClasses={selectedShadow === "shadow-large" ? ["suggested-action"] : []}
                            onClicked={() => setSelectedShadow("shadow-large")}
                        />
                        <GtkButton
                            label="Glow"
                            cssClasses={selectedShadow === "shadow-glow" ? ["suggested-action"] : []}
                            onClicked={() => setSelectedShadow("shadow-glow")}
                        />
                    </GtkBox>

                    <GtkBox
                        cssClasses={["shadow-card", selectedShadow]}
                        halign={Gtk.Align.CENTER}
                        orientation={Gtk.Orientation.VERTICAL}
                        spacing={8}
                    >
                        <GtkLabel label="Dynamic Shadow" cssClasses={["title-3"]} />
                        <GtkLabel label="Click the buttons above to change the shadow" cssClasses={["dim-label"]} />
                    </GtkBox>
                </GtkBox>
            </GtkFrame>

            {/* CSS Code */}
            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                <GtkLabel label="CSS Syntax" cssClasses={["heading"]} halign={Gtk.Align.START} />
                <GtkLabel
                    label="box-shadow: [inset] <offset-x> <offset-y> <blur-radius> [spread-radius] <color>. Multiple shadows can be separated by commas. Use rgba() for transparency."
                    wrap
                    cssClasses={["dim-label"]}
                    halign={Gtk.Align.START}
                />
            </GtkBox>
        </GtkBox>
    );
};

const sourceCode = `import { injectGlobal } from "@gtkx/css";
import * as Gtk from "@gtkx/ffi/gtk";
import { GtkBox, GtkLabel } from "@gtkx/react";

// Define shadow styles
injectGlobal\`
  .shadow-subtle {
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
  }

  .shadow-medium {
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.15);
  }

  .shadow-large {
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
  }

  .shadow-colored {
    box-shadow: 0 8px 20px rgba(53, 132, 228, 0.4);
  }

  .shadow-glow {
    box-shadow: 0 0 20px rgba(53, 132, 228, 0.6);
  }
\`;

const ShadowDemo = () => (
  <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={24}>
    <GtkBox cssClasses={["card", "shadow-subtle"]}>
      <GtkLabel label="Subtle" />
    </GtkBox>

    <GtkBox cssClasses={["card", "shadow-medium"]}>
      <GtkLabel label="Medium" />
    </GtkBox>

    <GtkBox cssClasses={["card", "shadow-large"]}>
      <GtkLabel label="Large" />
    </GtkBox>

    <GtkBox cssClasses={["card", "shadow-glow"]}>
      <GtkLabel label="Glow" />
    </GtkBox>
  </GtkBox>
);`;

export const cssShadowsDemo: Demo = {
    id: "css-shadows",
    title: "CSS Shadows",
    description: "Box shadow effects for depth and elevation",
    keywords: ["css", "shadow", "box-shadow", "elevation", "depth", "glow"],
    component: CssShadowsDemo,
    sourceCode,
};
