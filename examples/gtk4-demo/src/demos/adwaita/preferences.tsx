import * as Gtk from "@gtkx/ffi/gtk";
import {
    ActionRow,
    AdwActionRow,
    AdwComboRow,
    AdwPreferencesGroup,
    AdwPreferencesPage,
    AdwSwitchRow,
    GtkBox,
    GtkImage,
    GtkLabel,
    GtkSwitch,
    SimpleListItem,
} from "@gtkx/react";
import { useState } from "react";
import type { Demo } from "../types.js";

const PreferencesDemo = () => {
    const [notifications, setNotifications] = useState(true);
    const [sounds, setSounds] = useState(false);

    return (
        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={24}>
            <GtkLabel label="Preferences" cssClasses={["title-2"]} halign={Gtk.Align.START} />

            <GtkLabel
                label="AdwPreferencesPage and AdwPreferencesGroup provide a structured way to organize application settings. Groups contain related rows with titles and optional descriptions."
                wrap
                halign={Gtk.Align.START}
                cssClasses={["dim-label"]}
            />

            {/* General Settings Page */}
            <AdwPreferencesPage title="General" iconName="preferences-system-symbolic">
                <AdwPreferencesGroup title="Editor" description="Configure text editing behavior">
                    <AdwSwitchRow title="Auto-save" subtitle="Automatically save changes" active />

                    <AdwSwitchRow title="Spell Check" subtitle="Highlight spelling errors" active />

                    <AdwSwitchRow title="Line Numbers" subtitle="Show line numbers in margin" />
                </AdwPreferencesGroup>

                <AdwPreferencesGroup title="Appearance" description="Customize the look and feel">
                    <AdwComboRow title="Theme" subtitle="Application color scheme" selected={0}>
                        <SimpleListItem id="system" value="System Default" />
                        <SimpleListItem id="light" value="Light" />
                        <SimpleListItem id="dark" value="Dark" />
                    </AdwComboRow>

                    <AdwComboRow title="Language" subtitle="Display language" selected={0}>
                        <SimpleListItem id="en" value="English" />
                        <SimpleListItem id="es" value="Spanish" />
                        <SimpleListItem id="fr" value="French" />
                        <SimpleListItem id="de" value="German" />
                    </AdwComboRow>
                </AdwPreferencesGroup>

                <AdwPreferencesGroup title="Notifications" description="Control when you receive alerts">
                    <AdwActionRow title="Push Notifications" subtitle="Receive notifications when app is closed">
                        <ActionRow.Prefix>
                            <GtkImage iconName="preferences-system-notifications-symbolic" />
                        </ActionRow.Prefix>
                        <ActionRow.Suffix>
                            <GtkSwitch
                                active={notifications}
                                onStateSet={() => {
                                    setNotifications(!notifications);
                                    return true;
                                }}
                                valign={Gtk.Align.CENTER}
                            />
                        </ActionRow.Suffix>
                    </AdwActionRow>

                    <AdwActionRow
                        title="Sound Effects"
                        subtitle="Play sounds for notifications"
                        sensitive={notifications}
                    >
                        <ActionRow.Prefix>
                            <GtkImage iconName="audio-volume-high-symbolic" />
                        </ActionRow.Prefix>
                        <ActionRow.Suffix>
                            <GtkSwitch
                                active={sounds}
                                onStateSet={() => {
                                    setSounds(!sounds);
                                    return true;
                                }}
                                valign={Gtk.Align.CENTER}
                            />
                        </ActionRow.Suffix>
                    </AdwActionRow>
                </AdwPreferencesGroup>
            </AdwPreferencesPage>

            {/* Key Properties */}
            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                <GtkLabel label="Key Components" cssClasses={["heading"]} halign={Gtk.Align.START} />
                <GtkLabel
                    label="AdwPreferencesPage: Container for preference groups with icon and title. AdwPreferencesGroup: Groups related rows with title and description. AdwActionRow: Individual preference row with prefix/suffix slots. AdwSwitchRow: Specialized row with built-in toggle switch. AdwComboRow: Row with dropdown selection."
                    wrap
                    cssClasses={["dim-label"]}
                    halign={Gtk.Align.START}
                />
            </GtkBox>
        </GtkBox>
    );
};

const sourceCode = `import { useState } from "react";
import * as Gtk from "@gtkx/ffi/gtk";
import {
  ActionRow,
  AdwActionRow,
  AdwPreferencesGroup,
  AdwPreferencesPage,
  AdwSwitchRow,
  AdwComboRow,
  GtkBox,
  GtkImage,
  GtkSwitch,
  SimpleListItem,
} from "@gtkx/react";

const PreferencesDemo = () => {
  return (
    <AdwPreferencesPage title="Settings" iconName="preferences-system-symbolic">
      <AdwPreferencesGroup
        title="Editor"
        description="Configure editing behavior"
      >
        <AdwSwitchRow
          title="Auto-save"
          subtitle="Save changes automatically"
          active
        />
      </AdwPreferencesGroup>

      <AdwPreferencesGroup title="Appearance">
        <AdwComboRow
          title="Theme"
          subtitle="Application color scheme"
          selected={0}
        >
          <SimpleListItem id="system" value="System Default" />
          <SimpleListItem id="light" value="Light" />
          <SimpleListItem id="dark" value="Dark" />
        </AdwComboRow>
      </AdwPreferencesGroup>

      <AdwPreferencesGroup title="Notifications">
        <AdwActionRow title="Push Notifications">
          <ActionRow.Prefix>
            <GtkImage iconName="preferences-system-notifications-symbolic" />
          </ActionRow.Prefix>
          <ActionRow.Suffix>
            <GtkSwitch valign={Gtk.Align.CENTER} />
          </ActionRow.Suffix>
        </AdwActionRow>
      </AdwPreferencesGroup>
    </AdwPreferencesPage>
  );
};`;

export const preferencesDemo: Demo = {
    id: "preferences",
    title: "Preferences",
    description: "Structured settings pages with AdwPreferencesPage/Group",
    keywords: [
        "preferences",
        "settings",
        "page",
        "group",
        "AdwPreferencesPage",
        "AdwPreferencesGroup",
        "AdwSwitchRow",
        "AdwComboRow",
        "libadwaita",
    ],
    component: PreferencesDemo,
    sourceCode,
};
