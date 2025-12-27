import * as Gtk from "@gtkx/ffi/gtk";
import { GtkBox, GtkButton, GtkComboBoxText, GtkFrame, GtkLabel } from "@gtkx/react";
import { useState } from "react";
import type { Demo } from "../types.js";

const countries = [
    { id: "us", name: "United States" },
    { id: "uk", name: "United Kingdom" },
    { id: "de", name: "Germany" },
    { id: "fr", name: "France" },
    { id: "jp", name: "Japan" },
    { id: "au", name: "Australia" },
    { id: "ca", name: "Canada" },
    { id: "br", name: "Brazil" },
];

const priorities = ["Low", "Medium", "High", "Critical"];

const ComboBoxDemo = () => {
    const [selectedCountry, setSelectedCountry] = useState("us");
    const [selectedPriority, setSelectedPriority] = useState(1);
    const [dynamicItems, setDynamicItems] = useState(["Option A", "Option B", "Option C"]);
    const [selectedDynamic, setSelectedDynamic] = useState(0);

    const addDynamicItem = () => {
        const newItem = `Option ${String.fromCharCode(65 + dynamicItems.length)}`;
        setDynamicItems([...dynamicItems, newItem]);
    };

    const removeDynamicItem = () => {
        if (dynamicItems.length > 1) {
            setDynamicItems(dynamicItems.slice(0, -1));
            if (selectedDynamic >= dynamicItems.length - 1) {
                setSelectedDynamic(Math.max(0, dynamicItems.length - 2));
            }
        }
    };

    return (
        <GtkBox
            orientation={Gtk.Orientation.VERTICAL}
            spacing={24}
            marginStart={20}
            marginEnd={20}
            marginTop={20}
            marginBottom={20}
        >
            <GtkLabel label="ComboBox" cssClasses={["title-2"]} halign={Gtk.Align.START} />

            <GtkLabel
                label="GtkComboBoxText is a simple text-only combobox widget. It allows users to select from a dropdown list of predefined options."
                wrap
                halign={Gtk.Align.START}
                cssClasses={["dim-label"]}
            />

            {/* Basic Country Selector */}
            <GtkFrame label="Country Selector">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={12}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkLabel label="Select a country:" halign={Gtk.Align.START} />
                    <GtkComboBoxText
                        active={countries.findIndex((c) => c.id === selectedCountry)}
                        onChanged={(combo) => {
                            const activeIndex = combo.getActive();
                            const country = countries[activeIndex];
                            if (activeIndex >= 0 && country) {
                                setSelectedCountry(country.id);
                            }
                        }}
                    >
                        {countries.map((country) => (
                            <GtkLabel key={country.id} label={country.name} />
                        ))}
                    </GtkComboBoxText>
                    <GtkLabel
                        label={`Selected: ${countries.find((c) => c.id === selectedCountry)?.name ?? "None"}`}
                        cssClasses={["dim-label"]}
                        halign={Gtk.Align.START}
                    />
                </GtkBox>
            </GtkFrame>

            {/* Priority Selector */}
            <GtkFrame label="Priority Level">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={12}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkLabel label="Set priority level:" halign={Gtk.Align.START} />
                    <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={12}>
                        <GtkComboBoxText
                            active={selectedPriority}
                            onChanged={(combo) => setSelectedPriority(combo.getActive())}
                            hexpand
                        >
                            {priorities.map((priority) => (
                                <GtkLabel key={priority} label={priority} />
                            ))}
                        </GtkComboBoxText>
                        <GtkLabel
                            label={priorities[selectedPriority]}
                            cssClasses={[
                                selectedPriority === 3 ? "error" : selectedPriority === 2 ? "warning" : "dim-label",
                            ]}
                            valign={Gtk.Align.CENTER}
                        />
                    </GtkBox>
                </GtkBox>
            </GtkFrame>

            {/* Dynamic Items */}
            <GtkFrame label="Dynamic Items">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={12}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkLabel
                        label="Items can be added or removed dynamically."
                        wrap
                        cssClasses={["dim-label"]}
                        halign={Gtk.Align.START}
                    />
                    <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={8}>
                        <GtkButton label="Add Item" onClicked={addDynamicItem} cssClasses={["suggested-action"]} />
                        <GtkButton
                            label="Remove Item"
                            onClicked={removeDynamicItem}
                            cssClasses={["destructive-action"]}
                            sensitive={dynamicItems.length > 1}
                        />
                    </GtkBox>
                    <GtkComboBoxText
                        active={selectedDynamic}
                        onChanged={(combo) => setSelectedDynamic(combo.getActive())}
                    >
                        {dynamicItems.map((item) => (
                            <GtkLabel key={item} label={item} />
                        ))}
                    </GtkComboBoxText>
                    <GtkLabel
                        label={`${dynamicItems.length} items, selected: ${dynamicItems[selectedDynamic] ?? "None"}`}
                        cssClasses={["dim-label"]}
                        halign={Gtk.Align.START}
                    />
                </GtkBox>
            </GtkFrame>

            {/* Key Properties */}
            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                <GtkLabel label="Key Properties" cssClasses={["heading"]} halign={Gtk.Align.START} />
                <GtkLabel
                    label="active: Index of the currently selected item (0-based). onChanged: Callback when selection changes. hasEntry: If true, allows text entry (GtkComboBoxText only)."
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
import { GtkBox, GtkComboBoxText, GtkLabel } from "@gtkx/react";

const countries = [
  { id: "us", name: "United States" },
  { id: "uk", name: "United Kingdom" },
  { id: "de", name: "Germany" },
  // ...more countries
];

const ComboBoxDemo = () => {
  const [selectedCountry, setSelectedCountry] = useState("us");

  return (
    <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={12}>
      <GtkLabel label="Select a country:" />
      <GtkComboBoxText
        active={countries.findIndex((c) => c.id === selectedCountry)}
        onChanged={(combo) => {
          const index = combo.getActive();
          if (index >= 0) {
            setSelectedCountry(countries[index].id);
          }
        }}
      >
        {countries.map((country) => (
          <GtkLabel key={country.id} label={country.name} />
        ))}
      </GtkComboBoxText>
      <GtkLabel label={\`Selected: \${selectedCountry}\`} />
    </GtkBox>
  );
};`;

export const comboboxDemo: Demo = {
    id: "combobox",
    title: "ComboBox",
    description: "Dropdown selection widget for choosing from a list of options",
    keywords: ["combobox", "dropdown", "select", "GtkComboBoxText", "choice", "picker"],
    component: ComboBoxDemo,
    sourceCode,
};
