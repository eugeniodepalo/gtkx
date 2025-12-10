import type * as Gtk from "@gtkx/ffi/gtk";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { Entry } from "../src/index.js";
import { flushSync, render, setupTests } from "./test-setup.js";

setupTests();

describe("Entry widget", () => {
    describe("uncontrolled - text={value} only", () => {
        it("renders with initial text", () => {
            let entryRef: Gtk.Entry | undefined;
            let currentState = "";

            const App = () => {
                const [text] = useState("initial");
                currentState = text;
                return (
                    <Entry
                        text={text}
                        ref={(ref: Gtk.Entry | null) => {
                            entryRef = ref ?? undefined;
                        }}
                    />
                );
            };

            render(<App />);

            expect(entryRef?.getText()).toBe("initial");
            expect(currentState).toBe("initial");
        });

        it("widget can diverge from state without onChanged", () => {
            let entryRef: Gtk.Entry | undefined;
            let currentState = "";

            const App = () => {
                const [text] = useState("initial");
                currentState = text;
                return (
                    <Entry
                        text={text}
                        ref={(ref: Gtk.Entry | null) => {
                            entryRef = ref ?? undefined;
                        }}
                    />
                );
            };

            render(<App />);

            entryRef?.setText("user typed");

            expect(entryRef?.getText()).toBe("user typed");
            expect(currentState).toBe("initial");
        });

        it("state update syncs widget", () => {
            let entryRef: Gtk.Entry | undefined;
            let setText: (value: string) => void = () => {};
            let currentState = "";

            const App = () => {
                const [text, _setText] = useState("initial");
                setText = _setText;
                currentState = text;
                return (
                    <Entry
                        text={text}
                        ref={(ref: Gtk.Entry | null) => {
                            entryRef = ref ?? undefined;
                        }}
                    />
                );
            };

            render(<App />);

            flushSync(() => setText("updated"));

            expect(currentState).toBe("updated");
            expect(entryRef?.getText()).toBe("updated");
        });
    });

    describe("controlled - text={value} with onChanged={handler}", () => {
        it("renders with initial text", () => {
            let entryRef: Gtk.Entry | undefined;
            let currentState = "";

            const App = () => {
                const [text, setText] = useState("initial");
                currentState = text;
                return (
                    <Entry
                        text={text}
                        onChanged={(entry: Gtk.Entry) => setText(entry.getText())}
                        ref={(ref: Gtk.Entry | null) => {
                            entryRef = ref ?? undefined;
                        }}
                    />
                );
            };

            render(<App />);

            expect(entryRef?.getText()).toBe("initial");
            expect(currentState).toBe("initial");
        });

        it("state update syncs widget", () => {
            let entryRef: Gtk.Entry | undefined;
            let setText: (value: string) => void = () => {};
            let currentState = "";

            const App = () => {
                const [text, _setText] = useState("initial");
                setText = _setText;
                currentState = text;
                return (
                    <Entry
                        text={text}
                        onChanged={(entry: Gtk.Entry) => _setText(entry.getText())}
                        ref={(ref: Gtk.Entry | null) => {
                            entryRef = ref ?? undefined;
                        }}
                    />
                );
            };

            render(<App />);

            flushSync(() => setText("updated"));

            expect(currentState).toBe("updated");
            expect(entryRef?.getText()).toBe("updated");
        });
    });
});
