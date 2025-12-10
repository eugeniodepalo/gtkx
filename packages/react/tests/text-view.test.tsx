import * as Gtk from "@gtkx/ffi/gtk";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { TextView } from "../src/index.js";
import { flushSync, render, setupTests } from "./test-setup.js";

setupTests();

describe("TextView widget", () => {
    it("renders a TextView", () => {
        let textViewRef: Gtk.TextView | undefined;

        const App = () => (
            <TextView
                ref={(ref: Gtk.TextView | null) => {
                    textViewRef = ref ?? undefined;
                }}
            />
        );

        render(<App />);

        expect(textViewRef).toBeDefined();
    });

    it("applies editable property", () => {
        let textViewRef: Gtk.TextView | undefined;

        const App = () => (
            <TextView
                editable={false}
                ref={(ref: Gtk.TextView | null) => {
                    textViewRef = ref ?? undefined;
                }}
            />
        );

        render(<App />);

        expect(textViewRef?.getEditable()).toBe(false);
    });

    it("applies cursorVisible property", () => {
        let textViewRef: Gtk.TextView | undefined;

        const App = () => (
            <TextView
                cursorVisible={false}
                ref={(ref: Gtk.TextView | null) => {
                    textViewRef = ref ?? undefined;
                }}
            />
        );

        render(<App />);

        expect(textViewRef?.getCursorVisible()).toBe(false);
    });

    it("applies monospace property", () => {
        let textViewRef: Gtk.TextView | undefined;

        const App = () => (
            <TextView
                monospace={true}
                ref={(ref: Gtk.TextView | null) => {
                    textViewRef = ref ?? undefined;
                }}
            />
        );

        render(<App />);

        expect(textViewRef?.getMonospace()).toBe(true);
    });

    it("applies wrapMode property", () => {
        let textViewRef: Gtk.TextView | undefined;

        const App = () => (
            <TextView
                wrapMode={Gtk.WrapMode.WORD}
                ref={(ref: Gtk.TextView | null) => {
                    textViewRef = ref ?? undefined;
                }}
            />
        );

        render(<App />);

        expect(textViewRef?.getWrapMode()).toBe(Gtk.WrapMode.WORD);
    });

    it("sets buffer from buffer prop", () => {
        const buffer = new Gtk.TextBuffer();
        buffer.setText("test content", -1);
        let textViewRef: Gtk.TextView | undefined;

        const App = () => (
            <TextView
                buffer={buffer}
                ref={(ref: Gtk.TextView | null) => {
                    textViewRef = ref ?? undefined;
                }}
            />
        );

        render(<App />);

        expect(textViewRef?.getBuffer().id).toStrictEqual(buffer.id);
    });

    it("updates buffer when prop changes", () => {
        const buffer1 = new Gtk.TextBuffer();
        buffer1.setText("buffer one", -1);
        const buffer2 = new Gtk.TextBuffer();
        buffer2.setText("buffer two", -1);
        let textViewRef: Gtk.TextView | undefined;
        let setBuffer: (value: Gtk.TextBuffer) => void = () => {};

        const App = () => {
            const [buffer, _setBuffer] = useState(buffer1);
            setBuffer = _setBuffer;
            return (
                <TextView
                    buffer={buffer}
                    ref={(ref: Gtk.TextView | null) => {
                        textViewRef = ref ?? undefined;
                    }}
                />
            );
        };

        render(<App />);
        expect(textViewRef?.getBuffer().id).toStrictEqual(buffer1.id);

        flushSync(() => setBuffer(buffer2));
        expect(textViewRef?.getBuffer().id).toStrictEqual(buffer2.id);
    });

    it("preserves buffer when other props change", () => {
        const buffer = new Gtk.TextBuffer();
        buffer.setText("persistent content", -1);
        let textViewRef: Gtk.TextView | undefined;
        let setEditable: (value: boolean) => void = () => {};

        const App = () => {
            const [editable, _setEditable] = useState(true);
            setEditable = _setEditable;
            return (
                <TextView
                    buffer={buffer}
                    editable={editable}
                    ref={(ref: Gtk.TextView | null) => {
                        textViewRef = ref ?? undefined;
                    }}
                />
            );
        };

        render(<App />);
        const initialBufferPtr = textViewRef?.getBuffer().id;

        flushSync(() => setEditable(false));

        expect(textViewRef?.getBuffer().id).toStrictEqual(initialBufferPtr);
        expect(textViewRef?.getEditable()).toBe(false);
    });
});
