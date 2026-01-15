import { injectGlobal } from "@gtkx/css";
import * as Gtk from "@gtkx/ffi/gtk";
import { GtkBox, GtkFrame, GtkLabel, GtkScrolledWindow, GtkSourceView, x } from "@gtkx/react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

export interface LiveCssEditorProps {
    initialCss: string;
    previewContent: ReactNode;
    previewLabel?: string;
    editorLabel?: string;
    editorHeight?: number;
    previewHeight?: number;
    orientation?: "horizontal" | "vertical";
}

export const LiveCssEditor = ({
    initialCss,
    previewContent,
    previewLabel = "Preview",
    editorLabel = "CSS Editor",
    editorHeight = 200,
    previewHeight = 200,
    orientation = "horizontal",
}: LiveCssEditorProps) => {
    const [cssText, setCssText] = useState(initialCss);
    const [error, setError] = useState<string | null>(null);
    const injectedRef = useRef<string | null>(null);

    const applyCss = useCallback((css: string) => {
        try {
            const className = injectGlobal`${css}`;
            injectedRef.current = className;
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Invalid CSS");
        }
    }, []);

    useEffect(() => {
        applyCss(cssText);
    }, [cssText, applyCss]);

    const handleTextChanged = useCallback((text: string) => {
        setCssText(text);
    }, []);

    const isHorizontal = orientation === "horizontal";

    return (
        <GtkBox
            orientation={isHorizontal ? Gtk.Orientation.HORIZONTAL : Gtk.Orientation.VERTICAL}
            spacing={16}
            homogeneous={isHorizontal}
        >
            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8} hexpand vexpand>
                <GtkLabel label={editorLabel} cssClasses={["heading"]} halign={Gtk.Align.START} />
                <GtkFrame>
                    <GtkScrolledWindow heightRequest={editorHeight} hscrollbarPolicy={Gtk.PolicyType.AUTOMATIC}>
                        <GtkSourceView
                            editable
                            showLineNumbers
                            tabWidth={4}
                            leftMargin={8}
                            rightMargin={8}
                            topMargin={8}
                            bottomMargin={8}
                            monospace
                            hexpand
                        >
                            <x.SourceBuffer
                                text={cssText}
                                language="css"
                                styleScheme="Adwaita-dark"
                                enableUndo
                                onTextChanged={handleTextChanged}
                            />
                        </GtkSourceView>
                    </GtkScrolledWindow>
                </GtkFrame>
                {error && (
                    <GtkLabel label={`Error: ${error}`} cssClasses={["error", "caption"]} halign={Gtk.Align.START} />
                )}
            </GtkBox>

            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8} hexpand vexpand>
                <GtkLabel label={previewLabel} cssClasses={["heading"]} halign={Gtk.Align.START} />
                <GtkFrame>
                    <GtkBox
                        orientation={Gtk.Orientation.VERTICAL}
                        marginTop={16}
                        marginBottom={16}
                        marginStart={16}
                        marginEnd={16}
                        heightRequest={previewHeight}
                        halign={Gtk.Align.CENTER}
                        valign={Gtk.Align.CENTER}
                    >
                        {previewContent}
                    </GtkBox>
                </GtkFrame>
            </GtkBox>
        </GtkBox>
    );
};
