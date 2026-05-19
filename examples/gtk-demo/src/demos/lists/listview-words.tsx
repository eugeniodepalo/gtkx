import { existsSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import * as Gtk from "@gtkx/ffi/gtk";
import {
    GtkBox,
    GtkButton,
    GtkHeaderBar,
    GtkInscription,
    GtkLabel,
    GtkListView,
    GtkOverlay,
    GtkProgressBar,
    GtkScrolledWindow,
    GtkSearchEntry,
} from "@gtkx/react";

const Slot = "Slot" as const;

import { useCallback, useEffect, useRef, useState } from "react";
import type { Demo, DemoProps } from "../types.js";
import sourceCode from "./listview-words.tsx?raw";

const DICT_FILE = "/usr/share/dict/words";

const LOREM_IPSUM =
    "lorem ipsum dolor sit amet consectetur adipisci elit sed eiusmod tempor incidunt labore et dolore magna aliqua ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquid ex ea commodi consequat";

const FILTER_CHUNK_SIZE = 50000;

function loadInitialWords(): string[] {
    if (existsSync(DICT_FILE)) {
        try {
            return readFileSync(DICT_FILE, "utf-8")
                .split("\n")
                .map((w) => w.trim())
                .filter((w) => w.length > 0);
        } catch {}
    }
    return LOREM_IPSUM.split(" ");
}

const initialWords = loadInitialWords();

const loadWordsFromFile = async (
    filePath: string,
    setWords: (words: string[]) => void,
    setSearchText: (text: string) => void,
) => {
    try {
        const text = await readFile(filePath, "utf-8");
        const wordList = text
            .split("\n")
            .map((w) => w.trim())
            .filter((w) => w.length > 0);
        setWords(wordList);
        setSearchText("");
    } catch {}
};

interface FilterCtx {
    cancelled: boolean;
}

const runFilterStep = ({
    ctx,
    words,
    lower,
    result,
    offset,
    setFilterProgress,
    setFilteredWords,
}: {
    ctx: FilterCtx;
    words: string[];
    lower: string;
    result: string[];
    offset: number;
    setFilterProgress: (n: number) => void;
    setFilteredWords: (w: string[]) => void;
}) => {
    if (ctx.cancelled) return;

    const end = Math.min(offset + FILTER_CHUNK_SIZE, words.length);
    for (let i = offset; i < end; i++) {
        const w = words[i];
        if (w?.toLowerCase().includes(lower)) result.push(w);
    }
    const newOffset = end;
    const progress = words.length > 0 ? newOffset / words.length : 1;
    setFilterProgress(progress);
    setFilteredWords([...result]);

    if (newOffset < words.length) {
        setTimeout(
            () =>
                runFilterStep({
                    ctx,
                    words,
                    lower,
                    result,
                    offset: newOffset,
                    setFilterProgress,
                    setFilteredWords,
                }),
            0,
        );
    }
};

function useFilteredWords(words: string[], searchText: string) {
    const [filteredWords, setFilteredWords] = useState(initialWords);
    const [filterProgress, setFilterProgress] = useState(1);
    const filterRef = useRef<FilterCtx>({ cancelled: false });

    useEffect(() => {
        filterRef.current.cancelled = true;
        const ctx = { cancelled: false };
        filterRef.current = ctx;

        if (searchText === "") {
            setFilteredWords(words);
            setFilterProgress(1);
            return;
        }

        const lower = searchText.toLowerCase();
        const result: string[] = [];
        setFilterProgress(0);
        setTimeout(
            () => runFilterStep({ ctx, words, lower, result, offset: 0, setFilterProgress, setFilteredWords }),
            0,
        );

        return () => {
            ctx.cancelled = true;
        };
    }, [words, searchText]);

    return { filteredWords, filterProgress };
}

const WordsList = ({ filteredWords, filterProgress }: { filteredWords: string[]; filterProgress: number }) => (
    <GtkOverlay vexpand hexpand>
        <GtkScrolledWindow vexpand hexpand>
            <GtkListView
                vexpand
                hexpand
                estimatedItemHeight={32}
                selectionMode={Gtk.SelectionMode.NONE}
                items={filteredWords.map((word) => ({ id: word, value: word }))}
                renderItem={(word: string) => (
                    <GtkInscription
                        text={word}
                        xalign={0}
                        natChars={20}
                        textOverflow={Gtk.InscriptionOverflow.ELLIPSIZE_END}
                    />
                )}
            />
        </GtkScrolledWindow>
        {filterProgress < 1 && (
            <GtkOverlay.Child>
                <GtkProgressBar fraction={filterProgress} halign={Gtk.Align.FILL} valign={Gtk.Align.START} hexpand />
            </GtkOverlay.Child>
        )}
    </GtkOverlay>
);

const ListViewWordsDemo = ({ window }: DemoProps) => {
    const [words, setWords] = useState(initialWords);
    const [searchText, setSearchText] = useState("");
    const { filteredWords, filterProgress } = useFilteredWords(words, searchText);

    const loadFile = useCallback((filePath: string) => loadWordsFromFile(filePath, setWords, setSearchText), []);

    const handleOpen = useCallback(async () => {
        const dialog = new Gtk.FileDialog();
        dialog.setTitle("Open file");
        try {
            const file = await dialog.open(window.current, null);
            const path = file.getPath();
            if (path) await loadFile(path);
        } catch {}
    }, [window, loadFile]);

    return (
        <>
            <Slot id="titlebar">
                <GtkHeaderBar titleWidget={<GtkLabel label={`${filteredWords.length.toLocaleString()} lines`} />}>
                    <GtkHeaderBar.PackStart>
                        <GtkButton label="_Open" useUnderline onClicked={() => void handleOpen()} />
                    </GtkHeaderBar.PackStart>
                </GtkHeaderBar>
            </Slot>
            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={0} vexpand hexpand>
                <GtkSearchEntry
                    text={searchText}
                    placeholderText="Search words..."
                    onSearchChanged={(entry: Gtk.SearchEntry) => setSearchText(entry.getText())}
                    hexpand
                />
                <WordsList filteredWords={filteredWords} filterProgress={filterProgress} />
            </GtkBox>
        </>
    );
};

export const listviewWordsDemo: Demo = {
    id: "listview-words",
    title: "Lists/Words",
    description:
        "This demo shows a listview with a large number of words. The list is loaded from /usr/share/dict/words and filtered incrementally.",
    keywords: ["listview", "words", "dictionary", "GtkListView", "search", "filter", "incremental"],
    component: ListViewWordsDemo,
    sourceCode,
    defaultWidth: 400,
    defaultHeight: 600,
};
