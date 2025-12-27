import * as Gtk from "@gtkx/ffi/gtk";
import { GtkBox, GtkButton, GtkFrame, GtkLabel, GtkLinkButton } from "@gtkx/react";
import { useState } from "react";
import type { Demo } from "../types.js";

const LinksDemo = () => {
    const [clickedLink, setClickedLink] = useState<string | null>(null);
    const [linkClicks, setLinkClicks] = useState<number>(0);

    const handleLinkActivated = (uri: string) => {
        setClickedLink(uri);
        setLinkClicks((prev) => prev + 1);
    };

    return (
        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={24} marginStart={20} marginEnd={20} marginTop={20}>
            <GtkLabel label="Link Buttons" cssClasses={["title-2"]} halign={Gtk.Align.START} />

            <GtkLabel
                label="GtkLinkButton displays a hyperlink that opens a URL when clicked. By default, it uses the system browser to open the link. You can intercept the click to handle the link yourself."
                wrap
                halign={Gtk.Align.START}
                cssClasses={["dim-label"]}
            />

            {/* Basic Link Buttons */}
            <GtkFrame label="Basic Link Buttons">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={12}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkLabel
                        label="Link buttons display a URL as clickable hypertext. The URL is shown as the button label by default."
                        wrap
                        halign={Gtk.Align.START}
                        cssClasses={["dim-label"]}
                    />

                    <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                        <GtkLinkButton uri="https://gtk.org" />
                        <GtkLinkButton uri="https://gnome.org" />
                        <GtkLinkButton uri="https://developer.gnome.org" />
                    </GtkBox>
                </GtkBox>
            </GtkFrame>

            {/* Link Buttons with Custom Labels */}
            <GtkFrame label="Link Buttons with Custom Labels">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={12}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkLabel
                        label="You can provide a custom label instead of showing the raw URL."
                        wrap
                        halign={Gtk.Align.START}
                        cssClasses={["dim-label"]}
                    />

                    <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                        <GtkLinkButton uri="https://gtk.org" label="Visit GTK Website" />
                        <GtkLinkButton uri="https://gnome.org" label="GNOME Project" />
                        <GtkLinkButton uri="https://github.com" label="GitHub" />
                    </GtkBox>
                </GtkBox>
            </GtkFrame>

            {/* Intercepting Link Clicks */}
            <GtkFrame label="Intercepting Link Clicks">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={12}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkLabel
                        label="Return true from onActivateLink to prevent the default browser opening behavior and handle the link yourself."
                        wrap
                        halign={Gtk.Align.START}
                        cssClasses={["dim-label"]}
                    />

                    <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                        <GtkLinkButton
                            uri="app://settings"
                            label="Open Settings (intercepted)"
                            onActivateLink={(self) => {
                                handleLinkActivated(self.getUri());
                                return true;
                            }}
                        />
                        <GtkLinkButton
                            uri="app://profile"
                            label="View Profile (intercepted)"
                            onActivateLink={(self) => {
                                handleLinkActivated(self.getUri());
                                return true;
                            }}
                        />
                        <GtkLinkButton
                            uri="app://help"
                            label="Get Help (intercepted)"
                            onActivateLink={(self) => {
                                handleLinkActivated(self.getUri());
                                return true;
                            }}
                        />
                    </GtkBox>

                    {clickedLink && (
                        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={4} marginTop={8}>
                            <GtkLabel
                                label={`Last clicked: ${clickedLink}`}
                                halign={Gtk.Align.START}
                                cssClasses={["dim-label"]}
                            />
                            <GtkLabel
                                label={`Total intercepted clicks: ${linkClicks}`}
                                halign={Gtk.Align.START}
                                cssClasses={["dim-label"]}
                            />
                        </GtkBox>
                    )}
                </GtkBox>
            </GtkFrame>

            {/* Visited State */}
            <GtkFrame label="Visited State">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={12}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkLabel
                        label="Links have a 'visited' state that changes their appearance. This can be controlled programmatically."
                        wrap
                        halign={Gtk.Align.START}
                        cssClasses={["dim-label"]}
                    />

                    <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                        <GtkLinkButton uri="https://example.com/page1" label="Unvisited Link" visited={false} />
                        <GtkLinkButton uri="https://example.com/page2" label="Visited Link" visited />
                    </GtkBox>
                </GtkBox>
            </GtkFrame>

            {/* Common Use Cases */}
            <GtkFrame label="Common Use Cases">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={12}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkLabel
                        label="Links are commonly used in About dialogs, documentation, and forms for external references."
                        wrap
                        halign={Gtk.Align.START}
                        cssClasses={["dim-label"]}
                    />

                    <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                        <GtkLinkButton uri="https://www.gnu.org/licenses/gpl-3.0.html" label="License: GPL-3.0" />
                        <GtkLinkButton uri="https://github.com/user/repo/issues" label="Report a Bug" />
                        <GtkLinkButton uri="https://docs.example.com" label="View Documentation" />
                    </GtkBox>
                </GtkBox>
            </GtkFrame>

            <GtkButton
                label="Reset Click Counter"
                onClicked={() => {
                    setClickedLink(null);
                    setLinkClicks(0);
                }}
                halign={Gtk.Align.START}
            />
        </GtkBox>
    );
};

const sourceCode = `import { useState } from "react";
import * as Gtk from "@gtkx/ffi/gtk";
import { GtkBox, GtkLabel, GtkLinkButton } from "@gtkx/react";

const LinksDemo = () => {
  const [clickedUri, setClickedUri] = useState<string | null>(null);

  return (
    <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={12}>
      {/* Basic link button - shows URL as label */}
      <GtkLinkButton uri="https://gtk.org" />

      {/* Link button with custom label */}
      <GtkLinkButton
        uri="https://gnome.org"
        label="Visit GNOME"
      />

      {/* Intercept link clicks to handle them yourself */}
      <GtkLinkButton
        uri="app://settings"
        label="Open Settings"
        onActivateLink={(self) => {
          setClickedUri(self.getUri());
          return true; // Return true to prevent default browser opening
        }}
      />

      {/* Control visited state */}
      <GtkLinkButton
        uri="https://example.com"
        label="Already Visited"
        visited
      />

      {clickedUri && (
        <GtkLabel label={\`Clicked: \${clickedUri}\`} />
      )}
    </GtkBox>
  );
};`;

export const linksDemo: Demo = {
    id: "links",
    title: "Links",
    description: "Clickable hyperlinks with GtkLinkButton",
    keywords: ["link", "hyperlink", "url", "uri", "GtkLinkButton", "button", "click", "visited", "web"],
    component: LinksDemo,
    sourceCode,
};
