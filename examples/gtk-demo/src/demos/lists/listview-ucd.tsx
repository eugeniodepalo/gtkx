import * as Gtk from "@gtkx/ffi/gtk";
import { GtkBox, GtkColumnView, GtkFrame, GtkLabel, GtkScrolledWindow, GtkSearchEntry, x } from "@gtkx/react";
import { useMemo, useState } from "react";
import type { Demo } from "../types.js";
import sourceCode from "./listview-ucd.tsx?raw";

interface UnicodeChar {
    id: string;
    codepoint: number;
    char: string;
    name: string;
    category: string;
    generalCategory: string;
    breakType: string;
    block: string;
}

const unicodeBlocks: { name: string; start: number; end: number }[] = [
    { name: "Basic Latin", start: 0x0020, end: 0x007f },
    { name: "Latin-1 Supplement", start: 0x00a0, end: 0x00ff },
    { name: "Latin Extended-A", start: 0x0100, end: 0x017f },
    { name: "Greek and Coptic", start: 0x0370, end: 0x03ff },
    { name: "Cyrillic", start: 0x0400, end: 0x04ff },
    { name: "General Punctuation", start: 0x2000, end: 0x206f },
    { name: "Currency Symbols", start: 0x20a0, end: 0x20cf },
    { name: "Letterlike Symbols", start: 0x2100, end: 0x214f },
    { name: "Number Forms", start: 0x2150, end: 0x218f },
    { name: "Arrows", start: 0x2190, end: 0x21ff },
    { name: "Mathematical Operators", start: 0x2200, end: 0x22ff },
    { name: "Miscellaneous Technical", start: 0x2300, end: 0x23ff },
    { name: "Box Drawing", start: 0x2500, end: 0x257f },
    { name: "Block Elements", start: 0x2580, end: 0x259f },
    { name: "Geometric Shapes", start: 0x25a0, end: 0x25ff },
    { name: "Miscellaneous Symbols", start: 0x2600, end: 0x26ff },
    { name: "Dingbats", start: 0x2700, end: 0x27bf },
];

function getGeneralCategory(cp: number): string {
    if (cp >= 0x41 && cp <= 0x5a) return "Lu";
    if (cp >= 0x61 && cp <= 0x7a) return "Ll";
    if (cp >= 0x30 && cp <= 0x39) return "Nd";
    if (cp === 0x20) return "Zs";
    if (cp >= 0x21 && cp <= 0x2f) return "Po";
    if (cp >= 0x3a && cp <= 0x40) return "Po";
    if (cp >= 0x5b && cp <= 0x60) return "Ps";
    if (cp >= 0x7b && cp <= 0x7e) return "Pe";
    if (cp >= 0x2000 && cp <= 0x200a) return "Zs";
    if (cp >= 0x2190 && cp <= 0x21ff) return "Sm";
    if (cp >= 0x2200 && cp <= 0x22ff) return "Sm";
    if (cp >= 0x2500 && cp <= 0x257f) return "So";
    if (cp >= 0x2600 && cp <= 0x26ff) return "So";
    return "Lo";
}

function getBreakType(cp: number): string {
    if (cp === 0x20) return "SP";
    if (cp >= 0x30 && cp <= 0x39) return "NU";
    if ((cp >= 0x41 && cp <= 0x5a) || (cp >= 0x61 && cp <= 0x7a)) return "AL";
    if (cp >= 0x2000 && cp <= 0x200a) return "BA";
    if (cp >= 0x2028 && cp <= 0x2029) return "BK";
    if (cp === 0x2d || cp === 0x2010 || cp === 0x2011) return "HY";
    if (cp >= 0x21 && cp <= 0x2f) return "EX";
    return "XX";
}

const generateBlockChars = (block: { name: string; start: number; end: number }): UnicodeChar[] => {
    const chars: UnicodeChar[] = [];
    for (let cp = block.start; cp <= block.end; cp++) {
        try {
            const char = String.fromCodePoint(cp);
            if (cp < 0x0020 || (cp >= 0x007f && cp < 0x00a0)) continue;
            const generalCategory = getGeneralCategory(cp);
            chars.push({
                id: `U+${cp.toString(16).toUpperCase().padStart(4, "0")}`,
                codepoint: cp,
                char,
                name: `U+${cp.toString(16).toUpperCase().padStart(4, "0")}`,
                category: generalCategory.startsWith("L")
                    ? "Letter"
                    : generalCategory.startsWith("N")
                      ? "Number"
                      : generalCategory.startsWith("P")
                        ? "Punctuation"
                        : generalCategory.startsWith("S")
                          ? "Symbol"
                          : generalCategory.startsWith("Z")
                            ? "Separator"
                            : "Other",
                generalCategory,
                breakType: getBreakType(cp),
                block: block.name,
            });
        } catch {}
    }
    return chars;
};

const ListViewUcdDemo = () => {
    const [selectedBlock, setSelectedBlock] = useState(unicodeBlocks[0]?.name ?? "Basic Latin");
    const [searchText, setSearchText] = useState("");
    const [selectedChar, setSelectedChar] = useState<UnicodeChar | null>(null);

    const characters = useMemo(() => {
        const block = unicodeBlocks.find((b) => b.name === selectedBlock);
        if (!block) return [];
        return generateBlockChars(block);
    }, [selectedBlock]);

    const filteredCharacters = useMemo(() => {
        if (searchText === "") return characters;
        const search = searchText.toLowerCase();
        return characters.filter(
            (c) =>
                c.char.includes(searchText) ||
                c.id.toLowerCase().includes(search) ||
                c.name.toLowerCase().includes(search),
        );
    }, [characters, searchText]);

    const handleActivate = (_view: Gtk.ColumnView, position: number) => {
        const char = filteredCharacters[position];
        if (char) {
            setSelectedChar(char);
        }
    };

    const formatCodepoint = (cp: number): string => {
        return `U+${cp.toString(16).toUpperCase().padStart(4, "0")}`;
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
            <GtkLabel label="Unicode Character Database" cssClasses={["title-2"]} halign={Gtk.Align.START} />

            <GtkLabel
                label="Browse Unicode characters by block using a ColumnView with multiple property columns including general category and line break type."
                wrap
                halign={Gtk.Align.START}
                cssClasses={["dim-label"]}
            />

            <GtkBox spacing={16}>
                <GtkFrame label="Unicode Blocks">
                    <GtkBox
                        orientation={Gtk.Orientation.VERTICAL}
                        spacing={8}
                        marginTop={8}
                        marginBottom={8}
                        marginStart={8}
                        marginEnd={8}
                        widthRequest={200}
                    >
                        <GtkScrolledWindow heightRequest={450} hscrollbarPolicy={Gtk.PolicyType.NEVER}>
                            <x.ListView<{ name: string }>
                                estimatedItemHeight={40}
                                showSeparators
                                onActivate={(_list, position) => {
                                    const block = unicodeBlocks[position];
                                    if (block) {
                                        setSelectedBlock(block.name);
                                    }
                                }}
                                renderItem={(item) => (
                                    <GtkLabel
                                        label={item?.name ?? ""}
                                        halign={Gtk.Align.START}
                                        marginTop={8}
                                        marginBottom={8}
                                        marginStart={12}
                                        marginEnd={12}
                                        cssClasses={item?.name === selectedBlock ? ["heading"] : []}
                                    />
                                )}
                            >
                                {unicodeBlocks.map((block) => (
                                    <x.ListItem key={block.name} id={block.name} value={{ name: block.name }} />
                                ))}
                            </x.ListView>
                        </GtkScrolledWindow>
                    </GtkBox>
                </GtkFrame>

                <GtkFrame label={selectedBlock} hexpand>
                    <GtkBox
                        orientation={Gtk.Orientation.VERTICAL}
                        spacing={12}
                        marginTop={12}
                        marginBottom={12}
                        marginStart={12}
                        marginEnd={12}
                    >
                        <GtkBox spacing={8}>
                            <GtkSearchEntry
                                text={searchText}
                                placeholderText="Search characters..."
                                onSearchChanged={(entry) => setSearchText(entry.getText())}
                                hexpand
                            />
                        </GtkBox>

                        <GtkLabel
                            label={`${filteredCharacters.length} characters`}
                            cssClasses={["dim-label"]}
                            halign={Gtk.Align.START}
                        />

                        <GtkScrolledWindow heightRequest={350}>
                            <GtkColumnView estimatedRowHeight={40} onActivate={handleActivate}>
                                <x.ColumnViewColumn<UnicodeChar>
                                    id="char"
                                    title="Char"
                                    fixedWidth={60}
                                    renderCell={(item) => (
                                        <GtkLabel
                                            label={item?.char ?? ""}
                                            cssClasses={["title-3"]}
                                            marginTop={6}
                                            marginBottom={6}
                                            marginStart={8}
                                        />
                                    )}
                                />
                                <x.ColumnViewColumn<UnicodeChar>
                                    id="codepoint"
                                    title="Codepoint"
                                    fixedWidth={90}
                                    renderCell={(item) => (
                                        <GtkLabel
                                            label={item?.id ?? ""}
                                            cssClasses={["monospace"]}
                                            halign={Gtk.Align.START}
                                            marginTop={6}
                                            marginBottom={6}
                                            marginStart={8}
                                        />
                                    )}
                                />
                                <x.ColumnViewColumn<UnicodeChar>
                                    id="category"
                                    title="Category"
                                    fixedWidth={100}
                                    renderCell={(item) => (
                                        <GtkLabel
                                            label={item?.category ?? ""}
                                            halign={Gtk.Align.START}
                                            marginTop={6}
                                            marginBottom={6}
                                            marginStart={8}
                                        />
                                    )}
                                />
                                <x.ColumnViewColumn<UnicodeChar>
                                    id="generalCategory"
                                    title="GC"
                                    fixedWidth={50}
                                    renderCell={(item) => (
                                        <GtkLabel
                                            label={item?.generalCategory ?? ""}
                                            cssClasses={["monospace", "dim-label"]}
                                            halign={Gtk.Align.START}
                                            marginTop={6}
                                            marginBottom={6}
                                            marginStart={8}
                                        />
                                    )}
                                />
                                <x.ColumnViewColumn<UnicodeChar>
                                    id="breakType"
                                    title="Break"
                                    fixedWidth={60}
                                    renderCell={(item) => (
                                        <GtkLabel
                                            label={item?.breakType ?? ""}
                                            cssClasses={["monospace", "dim-label"]}
                                            halign={Gtk.Align.START}
                                            marginTop={6}
                                            marginBottom={6}
                                            marginStart={8}
                                        />
                                    )}
                                />
                                <x.ColumnViewColumn<UnicodeChar>
                                    id="decimal"
                                    title="Decimal"
                                    fixedWidth={70}
                                    renderCell={(item) => (
                                        <GtkLabel
                                            label={item ? String(item.codepoint) : ""}
                                            cssClasses={["monospace", "dim-label"]}
                                            halign={Gtk.Align.END}
                                            marginTop={6}
                                            marginBottom={6}
                                            marginEnd={8}
                                        />
                                    )}
                                />
                                {filteredCharacters.map((char) => (
                                    <x.ListItem key={char.id} id={char.id} value={char} />
                                ))}
                            </GtkColumnView>
                        </GtkScrolledWindow>

                        {selectedChar && (
                            <GtkBox spacing={24} cssClasses={["card"]} marginTop={8}>
                                <GtkLabel
                                    label={selectedChar.char}
                                    cssClasses={["title-1"]}
                                    marginStart={24}
                                    marginTop={16}
                                    marginBottom={16}
                                />
                                <GtkBox
                                    orientation={Gtk.Orientation.VERTICAL}
                                    spacing={4}
                                    valign={Gtk.Align.CENTER}
                                    hexpand
                                >
                                    <GtkLabel
                                        label={formatCodepoint(selectedChar.codepoint)}
                                        cssClasses={["heading", "monospace"]}
                                        halign={Gtk.Align.START}
                                    />
                                    <GtkLabel
                                        label={`Block: ${selectedChar.block}`}
                                        cssClasses={["dim-label"]}
                                        halign={Gtk.Align.START}
                                    />
                                    <GtkLabel
                                        label={`Category: ${selectedChar.category} (${selectedChar.generalCategory})`}
                                        cssClasses={["dim-label", "caption"]}
                                        halign={Gtk.Align.START}
                                    />
                                </GtkBox>
                                <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={4} valign={Gtk.Align.CENTER}>
                                    <GtkLabel label="HTML Entity" cssClasses={["dim-label", "caption"]} />
                                    <GtkLabel label={`&#${selectedChar.codepoint};`} cssClasses={["monospace"]} />
                                </GtkBox>
                                <GtkBox
                                    orientation={Gtk.Orientation.VERTICAL}
                                    spacing={4}
                                    valign={Gtk.Align.CENTER}
                                    marginEnd={16}
                                >
                                    <GtkLabel label="Break Type" cssClasses={["dim-label", "caption"]} />
                                    <GtkLabel label={selectedChar.breakType} cssClasses={["monospace"]} />
                                </GtkBox>
                            </GtkBox>
                        )}
                    </GtkBox>
                </GtkFrame>
            </GtkBox>
        </GtkBox>
    );
};

export const listviewUcdDemo: Demo = {
    id: "listview-ucd",
    title: "Lists/Characters",
    description: "Unicode character database browser with grid and list views",
    keywords: ["listview", "unicode", "characters", "GtkListView", "GtkGridView", "ucd", "codepoint"],
    component: ListViewUcdDemo,
    sourceCode,
};
