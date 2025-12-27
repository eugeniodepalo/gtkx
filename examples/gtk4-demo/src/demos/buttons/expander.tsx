import * as Gtk from "@gtkx/ffi/gtk";
import { GtkBox, GtkButton, GtkCheckButton, GtkExpander, GtkFrame, GtkLabel } from "@gtkx/react";
import { useState } from "react";
import type { Demo } from "../types.js";

const ExpanderDemo = () => {
    const [basicExpanded, setBasicExpanded] = useState(false);
    const [detailsExpanded, setDetailsExpanded] = useState(false);
    const [settingsExpanded, setSettingsExpanded] = useState(true);

    return (
        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={24}>
            <GtkLabel label="Expander" cssClasses={["title-2"]} halign={Gtk.Align.START} />

            <GtkLabel
                label="GtkExpander is a container that can hide its child widget. It has a clickable header with an arrow indicator that shows/hides the content when clicked."
                wrap
                halign={Gtk.Align.START}
                cssClasses={["dim-label"]}
            />

            {/* Basic Expander */}
            <GtkFrame label="Basic Expander">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={12}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkExpander
                        label="Click to expand"
                        expanded={basicExpanded}
                        onActivate={(expander: Gtk.Expander) => setBasicExpanded(!expander.getExpanded())}
                    >
                        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={6} marginTop={6}>
                            <GtkLabel label="This is the hidden content that appears when you expand!" wrap />
                            <GtkLabel label="You can put any widgets here." cssClasses={["dim-label"]} />
                        </GtkBox>
                    </GtkExpander>
                    <GtkLabel
                        label={`State: ${basicExpanded ? "Expanded" : "Collapsed"}`}
                        halign={Gtk.Align.START}
                        cssClasses={["dim-label"]}
                    />
                </GtkBox>
            </GtkFrame>

            {/* Details/Info Expander */}
            <GtkFrame label="Details Section">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={12}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkLabel label="File: document.pdf" halign={Gtk.Align.START} cssClasses={["heading"]} />
                    <GtkLabel label="A sample document file." halign={Gtk.Align.START} />
                    <GtkExpander
                        label="More details"
                        expanded={detailsExpanded}
                        onActivate={(expander: Gtk.Expander) => setDetailsExpanded(!expander.getExpanded())}
                    >
                        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={6} marginTop={6}>
                            <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={12}>
                                <GtkLabel label="Size:" cssClasses={["dim-label"]} widthChars={12} xalign={0} />
                                <GtkLabel label="2.4 MB" />
                            </GtkBox>
                            <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={12}>
                                <GtkLabel label="Created:" cssClasses={["dim-label"]} widthChars={12} xalign={0} />
                                <GtkLabel label="December 15, 2024" />
                            </GtkBox>
                            <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={12}>
                                <GtkLabel label="Modified:" cssClasses={["dim-label"]} widthChars={12} xalign={0} />
                                <GtkLabel label="December 27, 2024" />
                            </GtkBox>
                            <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={12}>
                                <GtkLabel label="Type:" cssClasses={["dim-label"]} widthChars={12} xalign={0} />
                                <GtkLabel label="PDF Document" />
                            </GtkBox>
                        </GtkBox>
                    </GtkExpander>
                </GtkBox>
            </GtkFrame>

            {/* Settings Expander */}
            <GtkFrame label="Advanced Settings">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={12}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkExpander
                        label="Advanced Options"
                        expanded={settingsExpanded}
                        onActivate={(expander: Gtk.Expander) => setSettingsExpanded(!expander.getExpanded())}
                    >
                        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={12} marginTop={6}>
                            <GtkCheckButton label="Enable debug mode" />
                            <GtkCheckButton label="Show hidden files" />
                            <GtkCheckButton label="Auto-save on exit" active />
                            <GtkCheckButton label="Use hardware acceleration" active />
                        </GtkBox>
                    </GtkExpander>
                </GtkBox>
            </GtkFrame>

            {/* Multiple Expanders */}
            <GtkFrame label="FAQ Style">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={6}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkExpander label="What is GTKX?">
                        <GtkLabel
                            label="GTKX is a React framework for building native GTK4 desktop applications on Linux."
                            wrap
                            marginTop={6}
                        />
                    </GtkExpander>
                    <GtkExpander label="How do I get started?">
                        <GtkLabel
                            label="Install GTKX using npm, then use the CLI to create a new project with 'npx gtkx create my-app'."
                            wrap
                            marginTop={6}
                        />
                    </GtkExpander>
                    <GtkExpander label="Is GTKX production ready?">
                        <GtkLabel
                            label="GTKX is actively developed and used in production applications. Check the documentation for the latest stability information."
                            wrap
                            marginTop={6}
                        />
                    </GtkExpander>
                </GtkBox>
            </GtkFrame>

            {/* Programmatic Control */}
            <GtkFrame label="Programmatic Control">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={12}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={12} halign={Gtk.Align.CENTER}>
                        <GtkButton
                            label="Expand All"
                            onClicked={() => {
                                setBasicExpanded(true);
                                setDetailsExpanded(true);
                                setSettingsExpanded(true);
                            }}
                        />
                        <GtkButton
                            label="Collapse All"
                            onClicked={() => {
                                setBasicExpanded(false);
                                setDetailsExpanded(false);
                                setSettingsExpanded(false);
                            }}
                        />
                    </GtkBox>
                </GtkBox>
            </GtkFrame>
        </GtkBox>
    );
};

const sourceCode = `import { useState } from "react";
import * as Gtk from "@gtkx/ffi/gtk";
import { GtkBox, GtkExpander, GtkLabel, GtkCheckButton } from "@gtkx/react";

const ExpanderDemo = () => {
  const [expanded, setExpanded] = useState(false);

  return (
    <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={24}>
      {/* Basic Expander */}
      <GtkExpander
        label="Click to expand"
        expanded={expanded}
        onNotifyExpanded={() => setExpanded(!expanded)}
      >
        <GtkLabel label="Hidden content revealed!" />
      </GtkExpander>

      {/* Details Section */}
      <GtkExpander label="More details">
        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={6}>
          <GtkLabel label="Size: 2.4 MB" />
          <GtkLabel label="Created: December 15, 2024" />
        </GtkBox>
      </GtkExpander>

      {/* Settings with checkboxes */}
      <GtkExpander label="Advanced Options" expanded>
        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={12}>
          <GtkCheckButton label="Enable debug mode" />
          <GtkCheckButton label="Show hidden files" />
          <GtkCheckButton label="Auto-save on exit" active />
        </GtkBox>
      </GtkExpander>

      {/* FAQ Style - multiple expanders */}
      <GtkExpander label="What is GTKX?">
        <GtkLabel
          label="GTKX is a React framework for GTK4 apps."
          wrap
        />
      </GtkExpander>
      <GtkExpander label="How do I get started?">
        <GtkLabel
          label="Use 'npx gtkx create my-app' to start."
          wrap
        />
      </GtkExpander>
    </GtkBox>
  );
};`;

export const expanderDemo: Demo = {
    id: "expander",
    title: "Expander",
    description: "Collapsible content container",
    keywords: ["expander", "collapse", "expand", "toggle", "GtkExpander", "hide", "show", "accordion"],
    component: ExpanderDemo,
    sourceCode,
};
