import * as Gtk from "@gtkx/ffi/gtk";
import { GtkBox, GtkEntry, GtkLabel } from "@gtkx/react";
import { useState } from "react";
import type { Demo } from "../types.js";

const countries = [
    "Argentina",
    "Australia",
    "Austria",
    "Belgium",
    "Brazil",
    "Canada",
    "Chile",
    "China",
    "Colombia",
    "Denmark",
    "Egypt",
    "Finland",
    "France",
    "Germany",
    "Greece",
    "India",
    "Indonesia",
    "Ireland",
    "Italy",
    "Japan",
    "Kenya",
    "Mexico",
    "Netherlands",
    "New Zealand",
    "Norway",
    "Peru",
    "Poland",
    "Portugal",
    "Russia",
    "South Africa",
    "South Korea",
    "Spain",
    "Sweden",
    "Switzerland",
    "Thailand",
    "Turkey",
    "Ukraine",
    "United Kingdom",
    "United States",
    "Vietnam",
];

const EntryCompletionDemo = () => {
    const [text, setText] = useState("");
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    const handleTextChange = (newText: string) => {
        setText(newText);
        if (newText.length > 0) {
            const filtered = countries.filter((country) => country.toLowerCase().startsWith(newText.toLowerCase()));
            setSuggestions(filtered.slice(0, 5));
            setShowSuggestions(filtered.length > 0);
        } else {
            setSuggestions([]);
            setShowSuggestions(false);
        }
    };

    const _selectSuggestion = (suggestion: string) => {
        setText(suggestion);
        setShowSuggestions(false);
        setSuggestions([]);
    };

    return (
        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={20} marginStart={20} marginEnd={20} marginTop={20}>
            <GtkLabel label="Entry with Completion" cssClasses={["title-2"]} halign={Gtk.Align.START} />

            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={12}>
                <GtkLabel label="Autocomplete Country" cssClasses={["heading"]} halign={Gtk.Align.START} />
                <GtkLabel
                    label="Start typing a country name to see suggestions. This demo shows a simple text-based completion system."
                    wrap
                    cssClasses={["dim-label"]}
                />

                <GtkEntry
                    text={text}
                    placeholderText="Type a country name..."
                    onChanged={(entry) => handleTextChange(entry.getText())}
                />

                {showSuggestions && suggestions.length > 0 && (
                    <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={4} cssClasses={["card"]}>
                        <GtkLabel
                            label="Suggestions:"
                            cssClasses={["dim-label"]}
                            halign={Gtk.Align.START}
                            marginStart={8}
                            marginTop={4}
                        />
                        {suggestions.map((suggestion) => (
                            <GtkLabel
                                key={suggestion}
                                label={suggestion}
                                halign={Gtk.Align.START}
                                marginStart={12}
                                marginBottom={4}
                            />
                        ))}
                    </GtkBox>
                )}

                <GtkLabel label={`Current value: "${text}"`} cssClasses={["dim-label"]} halign={Gtk.Align.START} />
            </GtkBox>

            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={12}>
                <GtkLabel label="How It Works" cssClasses={["heading"]} halign={Gtk.Align.START} />
                <GtkLabel
                    label="This demo filters a list of countries as you type. In a real GTK application, you would use GtkEntryCompletion attached to a GtkEntry for native completion popups. This React-based demo shows the concept with a custom suggestion display."
                    wrap
                    cssClasses={["dim-label"]}
                />
            </GtkBox>
        </GtkBox>
    );
};

const sourceCode = `import * as Gtk from "@gtkx/ffi/gtk";
import { GtkBox, GtkEntry, GtkLabel } from "@gtkx/react";
import { useState } from "react";

const countries = [
  "Argentina", "Australia", "Austria", "Belgium", "Brazil",
  "Canada", "Chile", "China", "Colombia", "Denmark",
  // ... more countries
];

const EntryCompletionDemo = () => {
  const [text, setText] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleTextChange = (newText: string) => {
    setText(newText);
    if (newText.length > 0) {
      const filtered = countries.filter((country) =>
        country.toLowerCase().startsWith(newText.toLowerCase()),
      );
      setSuggestions(filtered.slice(0, 5));
      setShowSuggestions(filtered.length > 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  return (
    <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={12}>
      <GtkEntry
        text={text}
        placeholderText="Type a country name..."
        onChanged={(entry) => handleTextChange(entry.getText())}
      />

      {showSuggestions && suggestions.length > 0 && (
        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={4}>
          {suggestions.map((suggestion) => (
            <GtkLabel key={suggestion} label={suggestion} />
          ))}
        </GtkBox>
      )}
    </GtkBox>
  );
};`;

export const entryCompletionDemo: Demo = {
    id: "entry-completion",
    title: "Entry Completion",
    description: "GtkEntry with autocomplete suggestions as you type.",
    keywords: ["entry", "completion", "autocomplete", "suggestions", "GtkEntry"],
    component: EntryCompletionDemo,
    sourceCode,
};
