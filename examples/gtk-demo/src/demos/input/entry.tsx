import * as Gtk from "@gtkx/ffi/gtk";
import { GtkBox, GtkButton, GtkEntry, GtkLabel } from "@gtkx/react";
import { useState } from "react";
import type { Demo } from "../types.js";

const EntryDemo = () => {
    const [basicText, setBasicText] = useState("");
    const [maxLengthText, setMaxLengthText] = useState("");
    const [activatedCount, setActivatedCount] = useState(0);

    const handleActivate = () => {
        setActivatedCount((prev) => prev + 1);
    };

    const handleClear = () => {
        setBasicText("");
        setMaxLengthText("");
        setActivatedCount(0);
    };

    return (
        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={20} marginStart={20} marginEnd={20} marginTop={20}>
            <GtkLabel label="Entry" cssClasses={["title-2"]} halign={Gtk.Align.START} />

            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={12}>
                <GtkLabel label="Basic Text Entry" cssClasses={["heading"]} halign={Gtk.Align.START} />
                <GtkLabel
                    label="GtkEntry is a single-line text input widget. It supports placeholder text, icons, and various input modes."
                    wrap
                    cssClasses={["dim-label"]}
                />

                <GtkEntry
                    text={basicText}
                    placeholderText="Enter some text..."
                    onChanged={(entry) => setBasicText(entry.getText())}
                    onActivate={handleActivate}
                />

                <GtkLabel
                    label={`Current value: "${basicText}" (${basicText.length} characters)`}
                    cssClasses={["dim-label"]}
                    halign={Gtk.Align.START}
                />

                <GtkLabel
                    label={`Enter key pressed: ${activatedCount} time(s)`}
                    cssClasses={["dim-label"]}
                    halign={Gtk.Align.START}
                />
            </GtkBox>

            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={12}>
                <GtkLabel label="Max Length Entry" cssClasses={["heading"]} halign={Gtk.Align.START} />
                <GtkLabel label="Limit the number of characters that can be entered." wrap cssClasses={["dim-label"]} />

                <GtkEntry
                    text={maxLengthText}
                    placeholderText="Max 20 characters..."
                    maxLength={20}
                    onChanged={(entry) => setMaxLengthText(entry.getText())}
                />

                <GtkLabel
                    label={`${maxLengthText.length}/20 characters`}
                    cssClasses={["dim-label"]}
                    halign={Gtk.Align.START}
                />
            </GtkBox>

            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={12}>
                <GtkLabel label="Entry States" cssClasses={["heading"]} halign={Gtk.Align.START} />
                <GtkLabel
                    label="Entries can be editable or read-only, and can be made insensitive."
                    wrap
                    cssClasses={["dim-label"]}
                />

                <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                    <GtkLabel label="Editable (default):" halign={Gtk.Align.START} />
                    <GtkEntry placeholderText="You can type here..." />
                </GtkBox>

                <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                    <GtkLabel label="Non-editable:" halign={Gtk.Align.START} />
                    <GtkEntry text="This text cannot be edited" editable={false} />
                </GtkBox>

                <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                    <GtkLabel label="Insensitive:" halign={Gtk.Align.START} />
                    <GtkEntry text="This entry is disabled" sensitive={false} />
                </GtkBox>
            </GtkBox>

            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={12}>
                <GtkLabel label="Entry with Icons" cssClasses={["heading"]} halign={Gtk.Align.START} />
                <GtkLabel
                    label="Entries can display icons on either side for visual cues or actions."
                    wrap
                    cssClasses={["dim-label"]}
                />

                <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                    <GtkLabel label="Primary icon (left):" halign={Gtk.Align.START} />
                    <GtkEntry placeholderText="Email address..." primaryIconName="mail-symbolic" />
                </GtkBox>

                <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                    <GtkLabel label="Secondary icon (right):" halign={Gtk.Align.START} />
                    <GtkEntry placeholderText="With clear button..." secondaryIconName="edit-clear-symbolic" />
                </GtkBox>

                <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                    <GtkLabel label="Both icons:" halign={Gtk.Align.START} />
                    <GtkEntry
                        placeholderText="Username..."
                        primaryIconName="avatar-default-symbolic"
                        secondaryIconName="dialog-information-symbolic"
                    />
                </GtkBox>
            </GtkBox>

            <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={8} marginTop={8}>
                <GtkButton label="Clear All" onClicked={handleClear} />
            </GtkBox>
        </GtkBox>
    );
};

const sourceCode = `import * as Gtk from "@gtkx/ffi/gtk";
import { GtkBox, GtkEntry, GtkLabel } from "@gtkx/react";
import { useState } from "react";

const EntryDemo = () => {
  const [text, setText] = useState("");

  return (
    <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={12}>
      <GtkEntry
        text={text}
        placeholderText="Enter some text..."
        onChanged={(entry) => setText(entry.getText())}
        onActivate={() => console.log("Enter pressed!")}
      />

      <GtkLabel label={\`Value: "\${text}"\`} cssClasses={["dim-label"]} />

      {/* Entry with max length */}
      <GtkEntry placeholderText="Max 20 chars..." maxLength={20} />

      {/* Non-editable entry */}
      <GtkEntry text="Read-only text" editable={false} />

      {/* Entry with icons */}
      <GtkEntry
        placeholderText="Email..."
        primaryIconName="mail-symbolic"
        secondaryIconName="edit-clear-symbolic"
      />
    </GtkBox>
  );
};`;

export const entryDemo: Demo = {
    id: "entry",
    title: "Entry",
    description: "Basic single-line text input with GtkEntry.",
    keywords: ["entry", "text", "input", "GtkEntry", "textfield"],
    component: EntryDemo,
    sourceCode,
};
