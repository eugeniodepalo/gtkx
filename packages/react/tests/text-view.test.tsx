import * as Gtk from "@gtkx/ffi/gtk";
import { useState } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { TextView } from "../src/index.js";
import { flushSync, render, setupTests } from "./utils.js";

setupTests();

let lastSetBuffer: Gtk.TextBuffer | undefined;
let setBufferCallCount = 0;
const originalSetBuffer = Gtk.TextView.prototype.setBuffer;

beforeEach(() => {
    lastSetBuffer = undefined;
    setBufferCallCount = 0;

    Gtk.TextView.prototype.setBuffer = function (buffer: Gtk.TextBuffer) {
        lastSetBuffer = buffer;
        setBufferCallCount++;
        return originalSetBuffer.call(this, buffer);
    };
});

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

        expect(lastSetBuffer).toBe(buffer);
        expect(textViewRef?.getBuffer().ptr).toStrictEqual(buffer.ptr);
    });

    it("updates buffer when prop changes", () => {
        const buffer1 = new Gtk.TextBuffer();
        const buffer2 = new Gtk.TextBuffer();
        let setBuffer: (value: Gtk.TextBuffer) => void = () => {};

        const App = () => {
            const [buffer, _setBuffer] = useState(buffer1);
            setBuffer = _setBuffer;
            return <TextView buffer={buffer} />;
        };

        render(<App />);
        expect(lastSetBuffer).toBe(buffer1);

        flushSync(() => setBuffer(buffer2));
        expect(lastSetBuffer).toBe(buffer2);
    });

    it("does not call setBuffer when buffer prop is the same reference", () => {
        const buffer = new Gtk.TextBuffer();
        let setCount: (value: number) => void = () => {};

        const App = () => {
            const [count, _setCount] = useState(0);
            setCount = _setCount;
            return <TextView buffer={buffer} data-count={count} />;
        };

        render(<App />);
        const countBefore = setBufferCallCount;

        flushSync(() => setCount(1));
        expect(setBufferCallCount).toBe(countBefore);
    });
});
