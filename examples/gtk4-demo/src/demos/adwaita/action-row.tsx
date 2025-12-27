import * as Gtk from "@gtkx/ffi/gtk";
import {
    ActionRow,
    AdwActionRow,
    AdwPreferencesGroup,
    GtkBox,
    GtkButton,
    GtkCheckButton,
    GtkImage,
    GtkLabel,
    GtkSwitch,
} from "@gtkx/react";
import { useState } from "react";
import type { Demo } from "../types.js";

const ActionRowDemo = () => {
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [darkModeEnabled, setDarkModeEnabled] = useState(false);
    const [wifiEnabled, setWifiEnabled] = useState(true);
    const [selectedOption, setSelectedOption] = useState<string | null>("option1");

    return (
        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={24}>
            <GtkLabel label="Action Row" cssClasses={["title-2"]} halign={Gtk.Align.START} />

            <GtkLabel
                label="AdwActionRow is a versatile row widget for settings and preferences. It supports prefix and suffix widgets for icons, switches, buttons, and other controls."
                wrap
                halign={Gtk.Align.START}
                cssClasses={["dim-label"]}
            />

            {/* Basic Action Rows */}
            <AdwPreferencesGroup title="Basic Action Rows">
                <AdwActionRow title="Simple Row" subtitle="A basic action row with just title and subtitle" />

                <AdwActionRow title="Row with Icon" subtitle="Uses iconName prop">
                    <ActionRow.Prefix>
                        <GtkImage iconName="emblem-favorite-symbolic" />
                    </ActionRow.Prefix>
                </AdwActionRow>

                <AdwActionRow title="Clickable Row" subtitle="Click to navigate">
                    <ActionRow.Prefix>
                        <GtkImage iconName="folder-symbolic" />
                    </ActionRow.Prefix>
                    <ActionRow.Suffix>
                        <GtkImage iconName="go-next-symbolic" cssClasses={["dim-label"]} />
                    </ActionRow.Suffix>
                </AdwActionRow>
            </AdwPreferencesGroup>

            {/* Rows with Switches */}
            <AdwPreferencesGroup title="Toggle Settings">
                <AdwActionRow title="Notifications" subtitle="Receive push notifications">
                    <ActionRow.Prefix>
                        <GtkImage iconName="preferences-system-notifications-symbolic" />
                    </ActionRow.Prefix>
                    <ActionRow.Suffix>
                        <GtkSwitch
                            active={notificationsEnabled}
                            onStateSet={() => {
                                setNotificationsEnabled(!notificationsEnabled);
                                return true;
                            }}
                            valign={Gtk.Align.CENTER}
                        />
                    </ActionRow.Suffix>
                </AdwActionRow>

                <AdwActionRow title="Dark Mode" subtitle="Use dark color scheme">
                    <ActionRow.Prefix>
                        <GtkImage iconName="weather-clear-night-symbolic" />
                    </ActionRow.Prefix>
                    <ActionRow.Suffix>
                        <GtkSwitch
                            active={darkModeEnabled}
                            onStateSet={() => {
                                setDarkModeEnabled(!darkModeEnabled);
                                return true;
                            }}
                            valign={Gtk.Align.CENTER}
                        />
                    </ActionRow.Suffix>
                </AdwActionRow>

                <AdwActionRow title="Wi-Fi" subtitle={wifiEnabled ? "Connected" : "Disconnected"}>
                    <ActionRow.Prefix>
                        <GtkImage iconName="network-wireless-symbolic" />
                    </ActionRow.Prefix>
                    <ActionRow.Suffix>
                        <GtkSwitch
                            active={wifiEnabled}
                            onStateSet={() => {
                                setWifiEnabled(!wifiEnabled);
                                return true;
                            }}
                            valign={Gtk.Align.CENTER}
                        />
                    </ActionRow.Suffix>
                </AdwActionRow>
            </AdwPreferencesGroup>

            {/* Rows with Check Buttons */}
            <AdwPreferencesGroup title="Selection Options">
                <AdwActionRow title="Option 1" subtitle="First selectable option">
                    <ActionRow.Prefix>
                        <GtkCheckButton
                            active={selectedOption === "option1"}
                            onToggled={() => setSelectedOption("option1")}
                        />
                    </ActionRow.Prefix>
                </AdwActionRow>

                <AdwActionRow title="Option 2" subtitle="Second selectable option">
                    <ActionRow.Prefix>
                        <GtkCheckButton
                            active={selectedOption === "option2"}
                            onToggled={() => setSelectedOption("option2")}
                        />
                    </ActionRow.Prefix>
                </AdwActionRow>

                <AdwActionRow title="Option 3" subtitle="Third selectable option">
                    <ActionRow.Prefix>
                        <GtkCheckButton
                            active={selectedOption === "option3"}
                            onToggled={() => setSelectedOption("option3")}
                        />
                    </ActionRow.Prefix>
                </AdwActionRow>
            </AdwPreferencesGroup>

            {/* Rows with Buttons */}
            <AdwPreferencesGroup title="Action Buttons">
                <AdwActionRow title="Account" subtitle="Manage your account settings">
                    <ActionRow.Prefix>
                        <GtkImage iconName="avatar-default-symbolic" />
                    </ActionRow.Prefix>
                    <ActionRow.Suffix>
                        <GtkButton label="Sign Out" cssClasses={["destructive-action"]} valign={Gtk.Align.CENTER} />
                    </ActionRow.Suffix>
                </AdwActionRow>

                <AdwActionRow title="Storage" subtitle="1.2 GB of 5 GB used">
                    <ActionRow.Prefix>
                        <GtkImage iconName="drive-harddisk-symbolic" />
                    </ActionRow.Prefix>
                    <ActionRow.Suffix>
                        <GtkButton label="Manage" valign={Gtk.Align.CENTER} />
                    </ActionRow.Suffix>
                </AdwActionRow>
            </AdwPreferencesGroup>
        </GtkBox>
    );
};

const sourceCode = `import { useState } from "react";
import * as Gtk from "@gtkx/ffi/gtk";
import {
  ActionRow,
  AdwActionRow,
  AdwPreferencesGroup,
  GtkBox,
  GtkImage,
  GtkSwitch,
} from "@gtkx/react";

const ActionRowDemo = () => {
  const [enabled, setEnabled] = useState(true);

  return (
    <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={24}>
      <AdwPreferencesGroup title="Settings">
        {/* Basic row with icon */}
        <AdwActionRow title="Row with Icon" subtitle="Description text">
          <ActionRow.Prefix>
            <GtkImage iconName="emblem-favorite-symbolic" />
          </ActionRow.Prefix>
        </AdwActionRow>

        {/* Row with switch */}
        <AdwActionRow title="Notifications" subtitle="Receive alerts">
          <ActionRow.Prefix>
            <GtkImage iconName="preferences-system-notifications-symbolic" />
          </ActionRow.Prefix>
          <ActionRow.Suffix>
            <GtkSwitch
              active={enabled}
              onStateSet={() => {
                setEnabled(!enabled);
                return true;
              }}
              valign={Gtk.Align.CENTER}
            />
          </ActionRow.Suffix>
        </AdwActionRow>

        {/* Clickable row with arrow */}
        <AdwActionRow title="More Options" subtitle="View additional settings">
          <ActionRow.Suffix>
            <GtkImage iconName="go-next-symbolic" cssClasses={["dim-label"]} />
          </ActionRow.Suffix>
        </AdwActionRow>
      </AdwPreferencesGroup>
    </GtkBox>
  );
};`;

export const actionRowDemo: Demo = {
    id: "action-row",
    title: "Action Row",
    description: "Versatile row widget for settings and preferences",
    keywords: ["action", "row", "settings", "preferences", "switch", "AdwActionRow", "prefix", "suffix", "libadwaita"],
    component: ActionRowDemo,
    sourceCode,
};
