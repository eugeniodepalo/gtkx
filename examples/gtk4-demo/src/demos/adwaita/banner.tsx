import * as Adw from "@gtkx/ffi/adw";
import * as Gtk from "@gtkx/ffi/gtk";
import { AdwBanner, GtkBox, GtkButton, GtkEntry, GtkFrame, GtkLabel } from "@gtkx/react";
import { useState } from "react";
import type { Demo } from "../types.js";

const BannerDemo = () => {
    const [showInfo, setShowInfo] = useState(true);
    const [showWarning, setShowWarning] = useState(true);
    const [showOffline, setShowOffline] = useState(true);
    const [showUpdate, setShowUpdate] = useState(true);
    const [customMessage, setCustomMessage] = useState("Custom banner message");
    const [showCustom, setShowCustom] = useState(false);

    return (
        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={24}>
            <GtkLabel label="Banner" cssClasses={["title-2"]} halign={Gtk.Align.START} />

            <GtkLabel
                label="AdwBanner displays prominent messages at the top of the window. It's ideal for showing app-wide notifications, connectivity status, or important alerts that require user attention."
                wrap
                halign={Gtk.Align.START}
                cssClasses={["dim-label"]}
            />

            {/* Basic Banner */}
            <GtkFrame label="Basic Banner">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={12}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkLabel
                        label="Simple banner with just a title message"
                        halign={Gtk.Align.START}
                        cssClasses={["dim-label"]}
                    />
                    <AdwBanner title="This is an informational banner" revealed={showInfo} />
                    <GtkButton
                        label={showInfo ? "Hide Banner" : "Show Banner"}
                        onClicked={() => setShowInfo(!showInfo)}
                        halign={Gtk.Align.START}
                    />
                </GtkBox>
            </GtkFrame>

            {/* Banner with Button */}
            <GtkFrame label="Banner with Action Button">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={12}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkLabel
                        label="Banners can include an action button for user interaction"
                        halign={Gtk.Align.START}
                        cssClasses={["dim-label"]}
                        wrap
                    />
                    <AdwBanner
                        title="A new version is available"
                        buttonLabel="Update Now"
                        revealed={showUpdate}
                        onButtonClicked={() => {
                            setShowUpdate(false);
                        }}
                    />
                    {!showUpdate && (
                        <GtkButton
                            label="Show Update Banner"
                            onClicked={() => setShowUpdate(true)}
                            halign={Gtk.Align.START}
                        />
                    )}
                </GtkBox>
            </GtkFrame>

            {/* Warning Banner */}
            <GtkFrame label="Warning Banner">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={12}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkLabel
                        label="Use CSS classes or styling to create warning appearances"
                        halign={Gtk.Align.START}
                        cssClasses={["dim-label"]}
                        wrap
                    />
                    <AdwBanner
                        title="Warning: Your session will expire in 5 minutes"
                        buttonLabel="Extend"
                        revealed={showWarning}
                        onButtonClicked={() => {
                            setShowWarning(false);
                        }}
                    />
                    {!showWarning && (
                        <GtkButton
                            label="Show Warning Banner"
                            onClicked={() => setShowWarning(true)}
                            halign={Gtk.Align.START}
                        />
                    )}
                </GtkBox>
            </GtkFrame>

            {/* Offline Banner */}
            <GtkFrame label="Connectivity Banner">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={12}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkLabel
                        label="Common use case: showing offline/connectivity status"
                        halign={Gtk.Align.START}
                        cssClasses={["dim-label"]}
                        wrap
                    />
                    <AdwBanner
                        title="You are currently offline"
                        buttonLabel="Retry"
                        revealed={showOffline}
                        onButtonClicked={() => {
                            setShowOffline(false);
                        }}
                    />
                    <GtkButton
                        label={showOffline ? "Go Online" : "Go Offline"}
                        onClicked={() => setShowOffline(!showOffline)}
                        halign={Gtk.Align.START}
                    />
                </GtkBox>
            </GtkFrame>

            {/* Custom Banner */}
            <GtkFrame label="Custom Message">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={12}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkLabel
                        label="Enter your own message to display in a banner"
                        halign={Gtk.Align.START}
                        cssClasses={["dim-label"]}
                    />
                    <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={8}>
                        <GtkEntry
                            text={customMessage}
                            onChanged={(entry) => setCustomMessage(entry.getText())}
                            placeholderText="Enter banner message..."
                            hexpand
                        />
                        <GtkButton
                            label={showCustom ? "Hide" : "Show"}
                            onClicked={() => setShowCustom(!showCustom)}
                            sensitive={customMessage.trim().length > 0}
                        />
                    </GtkBox>
                    {showCustom && customMessage && (
                        <AdwBanner
                            title={customMessage}
                            buttonLabel="Dismiss"
                            revealed={showCustom}
                            onButtonClicked={() => setShowCustom(false)}
                        />
                    )}
                </GtkBox>
            </GtkFrame>

            {/* Button Styles */}
            <GtkFrame label="Button Styles">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={12}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkLabel
                        label="Banners support different button styles for different contexts"
                        halign={Gtk.Align.START}
                        cssClasses={["dim-label"]}
                        wrap
                    />
                    <AdwBanner
                        title="Default button style"
                        buttonLabel="Action"
                        revealed
                        buttonStyle={Adw.BannerButtonStyle.DEFAULT}
                    />
                    <AdwBanner
                        title="Suggested button style"
                        buttonLabel="Action"
                        revealed
                        buttonStyle={Adw.BannerButtonStyle.SUGGESTED}
                    />
                </GtkBox>
            </GtkFrame>

            {/* Key Properties */}
            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                <GtkLabel label="Key Properties" cssClasses={["heading"]} halign={Gtk.Align.START} />
                <GtkLabel
                    label="title: The banner message text. buttonLabel: Optional action button (empty string hides it). revealed: Controls visibility with animation. buttonStyle: DEFAULT or SUGGESTED appearance. onButtonClicked: Callback when button is clicked. useMarkup: Enable Pango markup in title."
                    wrap
                    cssClasses={["dim-label"]}
                    halign={Gtk.Align.START}
                />
            </GtkBox>
        </GtkBox>
    );
};

const sourceCode = `import { useState } from "react";
import * as Adw from "@gtkx/ffi/adw";
import { AdwBanner, GtkBox, GtkButton, GtkLabel } from "@gtkx/react";

const BannerDemo = () => {
  const [isOffline, setIsOffline] = useState(true);
  const [hasUpdate, setHasUpdate] = useState(true);

  return (
    <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={12}>
      {/* Connectivity status banner */}
      <AdwBanner
        title="You are currently offline"
        buttonLabel="Retry"
        revealed={isOffline}
        onButtonClicked={() => setIsOffline(false)}
      />

      {/* Update available banner */}
      <AdwBanner
        title="A new version is available"
        buttonLabel="Update Now"
        buttonStyle={Adw.BannerButtonStyle.SUGGESTED}
        revealed={hasUpdate}
        onButtonClicked={() => {
          setHasUpdate(false);
          // Trigger update...
        }}
      />

      {/* App content */}
      <GtkLabel label="Your app content here" />

      <GtkButton
        label="Toggle Offline"
        onClicked={() => setIsOffline(!isOffline)}
      />
    </GtkBox>
  );
};`;

export const bannerDemo: Demo = {
    id: "banner",
    title: "Banner",
    description: "Prominent app-wide messages and notifications",
    keywords: ["banner", "notification", "alert", "message", "status", "offline", "AdwBanner", "libadwaita"],
    component: BannerDemo,
    sourceCode,
};
