import * as Gtk from "@gtkx/ffi/gtk";
import { GtkBox, GtkButton, GtkDropDown, GtkFrame, GtkLabel, SimpleListItem } from "@gtkx/react";
import { useState } from "react";
import type { Demo } from "../types.js";

const fonts = [
    { id: "sans", name: "Sans Serif" },
    { id: "serif", name: "Serif" },
    { id: "mono", name: "Monospace" },
    { id: "cursive", name: "Cursive" },
    { id: "fantasy", name: "Fantasy" },
];

const sizes = [
    { id: "xs", name: "Extra Small", value: "10px" },
    { id: "sm", name: "Small", value: "12px" },
    { id: "md", name: "Medium", value: "14px" },
    { id: "lg", name: "Large", value: "18px" },
    { id: "xl", name: "Extra Large", value: "24px" },
];

const themes = [
    { id: "light", name: "Light", description: "Bright background with dark text" },
    { id: "dark", name: "Dark", description: "Dark background with light text" },
    { id: "sepia", name: "Sepia", description: "Warm, paper-like appearance" },
    { id: "high-contrast", name: "High Contrast", description: "Maximum readability" },
];

const DropDownDemo = () => {
    const [selectedFont, setSelectedFont] = useState("sans");
    const [selectedSize, setSelectedSize] = useState("md");
    const [selectedTheme, setSelectedTheme] = useState("light");
    const [dynamicItems, setDynamicItems] = useState(["Apple", "Banana", "Cherry"]);
    const [selectedDynamic, setSelectedDynamic] = useState("Apple");

    const addFruit = () => {
        const fruits = ["Date", "Elderberry", "Fig", "Grape", "Honeydew", "Kiwi", "Lemon", "Mango"];
        const newFruit = fruits.find((f) => !dynamicItems.includes(f));
        if (newFruit) {
            setDynamicItems([...dynamicItems, newFruit]);
        }
    };

    const removeFruit = () => {
        if (dynamicItems.length > 1) {
            const removed = dynamicItems[dynamicItems.length - 1];
            setDynamicItems(dynamicItems.slice(0, -1));
            if (selectedDynamic === removed) {
                setSelectedDynamic(dynamicItems[0] ?? "");
            }
        }
    };

    const currentFont = fonts.find((f) => f.id === selectedFont);
    const currentSize = sizes.find((s) => s.id === selectedSize);
    const currentTheme = themes.find((t) => t.id === selectedTheme);

    return (
        <GtkBox
            orientation={Gtk.Orientation.VERTICAL}
            spacing={24}
            marginStart={20}
            marginEnd={20}
            marginTop={20}
            marginBottom={20}
        >
            <GtkLabel label="DropDown" cssClasses={["title-2"]} halign={Gtk.Align.START} />

            <GtkLabel
                label="GtkDropDown is a modern dropdown widget that displays a popup list when clicked. It uses GTK's ListModel for efficient data handling and supports custom item rendering."
                wrap
                halign={Gtk.Align.START}
                cssClasses={["dim-label"]}
            />

            {/* Font Selector */}
            <GtkFrame label="Font Family">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={12}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkLabel label="Select a font family:" halign={Gtk.Align.START} />
                    <GtkDropDown selectedId={selectedFont} onSelectionChanged={setSelectedFont}>
                        {fonts.map((font) => (
                            <SimpleListItem key={font.id} id={font.id} value={font.name} />
                        ))}
                    </GtkDropDown>
                    <GtkLabel
                        label={`Selected: ${currentFont?.name ?? "None"}`}
                        cssClasses={["dim-label"]}
                        halign={Gtk.Align.START}
                    />
                </GtkBox>
            </GtkFrame>

            {/* Size Selector */}
            <GtkFrame label="Text Size">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={12}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={12}>
                        <GtkLabel label="Choose text size:" halign={Gtk.Align.START} hexpand />
                        <GtkDropDown selectedId={selectedSize} onSelectionChanged={setSelectedSize}>
                            {sizes.map((size) => (
                                <SimpleListItem key={size.id} id={size.id} value={`${size.name} (${size.value})`} />
                            ))}
                        </GtkDropDown>
                    </GtkBox>
                    <GtkBox
                        orientation={Gtk.Orientation.HORIZONTAL}
                        spacing={8}
                        cssClasses={["card"]}
                        marginTop={8}
                        marginBottom={8}
                        marginStart={12}
                        marginEnd={12}
                    >
                        <GtkLabel label="Preview:" cssClasses={["dim-label"]} />
                        <GtkLabel label={`${currentSize?.name} text (${currentSize?.value})`} />
                    </GtkBox>
                </GtkBox>
            </GtkFrame>

            {/* Theme Selector */}
            <GtkFrame label="Theme">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={12}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkLabel label="Select application theme:" halign={Gtk.Align.START} />
                    <GtkDropDown selectedId={selectedTheme} onSelectionChanged={setSelectedTheme}>
                        {themes.map((theme) => (
                            <SimpleListItem key={theme.id} id={theme.id} value={theme.name} />
                        ))}
                    </GtkDropDown>
                    {currentTheme && (
                        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={4}>
                            <GtkLabel label={currentTheme.name} halign={Gtk.Align.START} cssClasses={["heading"]} />
                            <GtkLabel
                                label={currentTheme.description}
                                cssClasses={["dim-label"]}
                                halign={Gtk.Align.START}
                            />
                        </GtkBox>
                    )}
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
                        label="DropDown items can be added or removed dynamically using React state."
                        wrap
                        cssClasses={["dim-label"]}
                        halign={Gtk.Align.START}
                    />
                    <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={8}>
                        <GtkButton
                            label="Add Fruit"
                            onClicked={addFruit}
                            cssClasses={["suggested-action"]}
                            sensitive={dynamicItems.length < 8}
                        />
                        <GtkButton
                            label="Remove Fruit"
                            onClicked={removeFruit}
                            cssClasses={["destructive-action"]}
                            sensitive={dynamicItems.length > 1}
                        />
                    </GtkBox>
                    <GtkDropDown selectedId={selectedDynamic} onSelectionChanged={setSelectedDynamic}>
                        {dynamicItems.map((item) => (
                            <SimpleListItem key={item} id={item} value={item} />
                        ))}
                    </GtkDropDown>
                    <GtkLabel
                        label={`${dynamicItems.length} items, selected: ${selectedDynamic}`}
                        cssClasses={["dim-label"]}
                        halign={Gtk.Align.START}
                    />
                </GtkBox>
            </GtkFrame>

            {/* Key Properties */}
            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                <GtkLabel label="Key Properties" cssClasses={["heading"]} halign={Gtk.Align.START} />
                <GtkLabel
                    label="selectedId: ID of the currently selected item. onSelectionChanged: Callback when selection changes. enableSearch: Show search entry in popup. Use SimpleListItem children to populate the dropdown with id/value pairs."
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
import { GtkBox, GtkDropDown, GtkLabel, SimpleListItem } from "@gtkx/react";

const fonts = [
  { id: "sans", name: "Sans Serif" },
  { id: "serif", name: "Serif" },
  { id: "mono", name: "Monospace" },
];

const DropDownDemo = () => {
  const [selectedFont, setSelectedFont] = useState("sans");

  return (
    <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={12}>
      <GtkLabel label="Select a font:" />
      <GtkDropDown
        selectedId={selectedFont}
        onSelectionChanged={setSelectedFont}
      >
        {fonts.map((font) => (
          <SimpleListItem key={font.id} id={font.id} value={font.name} />
        ))}
      </GtkDropDown>
      <GtkLabel label={\`Selected: \${selectedFont}\`} />
    </GtkBox>
  );
};`;

export const dropdownDemo: Demo = {
    id: "dropdown",
    title: "DropDown",
    description: "Modern dropdown selection widget with popup list",
    keywords: ["dropdown", "select", "popup", "GtkDropDown", "choice", "picker", "menu"],
    component: DropDownDemo,
    sourceCode,
};
