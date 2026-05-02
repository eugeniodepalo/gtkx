import * as Gtk from "@gtkx/ffi/gtk";
import { GtkButton, GtkEntry, GtkLabel, GtkSwitch } from "@gtkx/react";
import { render } from "@gtkx/testing";
import { createRef, useState } from "react";
import { describe, expect, it } from "vitest";

describe("accessible props - GValue marshaling regression", () => {
    it("sets accessibleLabel (string) without crashing", async () => {
        const ref = createRef<Gtk.Button>();

        await render(<GtkButton ref={ref} accessibleLabel="Zoom in" />);

        expect(ref.current).not.toBeNull();
    });

    it("sets accessibleHasPopup (boolean) without crashing", async () => {
        const ref = createRef<Gtk.Button>();

        await render(<GtkButton ref={ref} accessibleHasPopup />);

        expect(ref.current).not.toBeNull();
    });

    it("sets accessibleKeyShortcuts (string) without crashing", async () => {
        const ref = createRef<Gtk.Switch>();

        await render(<GtkSwitch ref={ref} accessibleKeyShortcuts="Control+M" />);

        expect(ref.current).not.toBeNull();
    });

    it("sets accessibleInvalid (token) without crashing", async () => {
        const ref = createRef<Gtk.Entry>();

        await render(<GtkEntry ref={ref} accessibleInvalid={Gtk.AccessibleInvalidState.TRUE} />);

        expect(ref.current).not.toBeNull();
    });

    it("sets accessibleLabelledBy (reference list) without crashing", async () => {
        const entryRef = createRef<Gtk.Entry>();

        function App() {
            const [label, setLabel] = useState<Gtk.Label | null>(null);
            return (
                <>
                    <GtkLabel ref={setLabel} label="Description" />
                    <GtkEntry ref={entryRef} accessibleLabelledBy={label ? [label] : undefined} />
                </>
            );
        }

        await render(<App />);

        expect(entryRef.current).not.toBeNull();
    });

    it("updates a string accessible prop across renders without crashing", async () => {
        const ref = createRef<Gtk.Button>();

        function App({ label }: { label: string }) {
            return <GtkButton ref={ref} accessibleLabel={label} />;
        }

        await render(<App label="First" />);
        await render(<App label="Second" />);
        await render(<App label="Third" />);

        expect(ref.current).not.toBeNull();
    });

    it("combines multiple accessible props on the same widget", async () => {
        const ref = createRef<Gtk.Button>();

        await render(
            <GtkButton
                ref={ref}
                accessibleLabel="Zoom in"
                accessibleHasPopup
                accessibleDescription="Increase font size"
            />,
        );

        expect(ref.current).not.toBeNull();
    });

    it("clears an accessible prop when set to undefined", async () => {
        const ref = createRef<Gtk.Button>();

        function App({ label }: { label: string | undefined }) {
            return <GtkButton ref={ref} accessibleLabel={label} />;
        }

        await render(<App label="With label" />);
        await render(<App label={undefined} />);

        expect(ref.current).not.toBeNull();
    });
});
