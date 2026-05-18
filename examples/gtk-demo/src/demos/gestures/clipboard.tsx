import type { Context } from "@gtkx/ffi/cairo";
import * as Gdk from "@gtkx/ffi/gdk";
import * as Gio from "@gtkx/ffi/gio";
import type { GType } from "@gtkx/ffi/gobject";
import * as GObject from "@gtkx/ffi/gobject";
import * as Gtk from "@gtkx/ffi/gtk";
import {
    GtkBox,
    GtkButton,
    GtkColorDialogButton,
    GtkDragSource,
    GtkDrawingArea,
    GtkDropDown,
    GtkDropTarget,
    GtkEntry,
    GtkImage,
    GtkLabel,
    GtkSeparator,
    GtkStack,
    GtkToggleButton,
} from "@gtkx/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { makeValue } from "../../gvalue.js";
import gtkLogoSvgPath from "../drawing/gtk-logo.svg";
import type { Demo, DemoProps } from "../types.js";
import sourceCode from "./clipboard.tsx?raw";
import floppyBuddyPath from "./floppybuddy.gif";
import portlandRosePath from "./portland-rose.jpg";

const setClipboardValue = (clipboard: Gdk.Clipboard, value: GObject.Value): void => clipboard.set(value);
const readTextureAsync = (clipboard: Gdk.Clipboard): Promise<Gdk.Texture | null> => clipboard.readTextureAsync(null);
const readValueAsync = (clipboard: Gdk.Clipboard, type: GType): Promise<GObject.Value> =>
    clipboard.readValueAsync(type, 0, null);

type SourceType = "Text" | "Color" | "Image" | "File" | "Folder";
type PastedContentType = "" | "Text" | "Color" | "Image" | "File";

interface PastedContent {
    type: PastedContentType;
    text?: string;
    color?: Gdk.RGBA;
    paintable?: Gdk.Paintable;
    filePath?: string;
}

let gdkRgbaTypeCache: GType | null = null;
const getGdkRgbaType = (): GType => {
    gdkRgbaTypeCache ??= GObject.typeFromName("GdkRGBA");
    return gdkRgbaTypeCache;
};

let gdkPaintableTypeCache: GType | null = null;
const getGdkPaintableType = (): GType => {
    gdkPaintableTypeCache ??= GObject.typeFromName("GdkPaintable");
    return gdkPaintableTypeCache;
};

let gFileTypeCache: GType | null = null;
const getGFileType = (): GType => {
    gFileTypeCache ??= GObject.typeFromName("GFile");
    return gFileTypeCache;
};

const SOURCE_TYPES: SourceType[] = ["Text", "Color", "Image", "File", "Folder"];

function drawColorSwatch(cr: Context, width: number, height: number, rgba: Gdk.RGBA): void {
    cr.setSourceRgba(rgba.red, rgba.green, rgba.blue, rgba.alpha);
    cr.rectangle(0, 0, width, height);
    cr.fill();
}

const makeRgba = (red: number, green: number, blue: number, alpha: number): Gdk.RGBA => {
    const rgba = new Gdk.RGBA();
    rgba.red = red;
    rgba.green = green;
    rgba.blue = blue;
    rgba.alpha = alpha;
    return rgba;
};

const ClipboardDemo = ({ window }: DemoProps) => {
    const [sourceType, setSourceType] = useState<SourceType>("Text");
    const [sourceText, setSourceText] = useState("Copy this!");
    const [sourceColor, setSourceColor] = useState<Gdk.RGBA>(makeRgba(0.5, 0, 0.5, 1));
    const [selectedImage, setSelectedImage] = useState(0);
    const [sourceFile, setSourceFile] = useState<Gio.File | null>(null);
    const [pastedContent, setPastedContent] = useState<PastedContent>({ type: "" });
    const [canPaste, setCanPaste] = useState(false);

    const portlandRoseTexture = useMemo(() => Gdk.Texture.newFromFilename(portlandRosePath), []);
    const floppyBuddyTexture = useMemo(() => Gdk.Texture.newFromFilename(floppyBuddyPath), []);
    const gtkLogoSvgTexture = useMemo(() => Gdk.Texture.newFromFilename(gtkLogoSvgPath), []);
    const [canCopy, setCanCopy] = useState(true);

    const getClipboard = useCallback(() => {
        const display = Gdk.Display.getDefault();
        return display?.getClipboard() ?? null;
    }, []);

    const updatePasteButtonSensitivity = useCallback(() => {
        const clipboard = getClipboard();
        if (!clipboard) {
            setCanPaste(false);
            return;
        }

        const formats = clipboard.getFormats();
        const canPasteContent =
            formats.containGtype(GObject.Type.STRING) ||
            formats.containGtype(getGdkRgbaType()) ||
            formats.containGtype(getGdkPaintableType()) ||
            formats.containGtype(getGFileType()) ||
            formats.containMimeType("image/png");
        setCanPaste(canPasteContent);
    }, [getClipboard]);

    useEffect(() => {
        const clipboard = getClipboard();
        if (!clipboard) return;

        updatePasteButtonSensitivity();
        clipboard.connect("changed", () => {
            updatePasteButtonSensitivity();
        });
    }, [getClipboard, updatePasteButtonSensitivity]);

    useEffect(() => {
        if (sourceType === "Text") {
            setCanCopy(sourceText.length > 0);
        } else if (sourceType === "File" || sourceType === "Folder") {
            setCanCopy(sourceFile !== null);
        } else {
            setCanCopy(true);
        }
    }, [sourceType, sourceText, sourceFile]);

    const createTextDragProvider = useCallback(() => {
        return Gdk.ContentProvider.newForValue(makeValue(GObject.Type.STRING, (v) => v.setString(sourceText)));
    }, [sourceText]);

    const createColorDragProvider = useCallback(() => {
        return Gdk.ContentProvider.newForValue(makeValue(getGdkRgbaType(), (v) => v.setBoxed(sourceColor)));
    }, [sourceColor]);

    const createImageDragProvider = useCallback(() => {
        const paths = [portlandRosePath, floppyBuddyPath, gtkLogoSvgPath];
        const path = paths[selectedImage] ?? portlandRosePath;
        try {
            const texture = Gdk.Texture.newFromFilename(path);
            const value = makeValue(getGdkPaintableType(), (v) => v.setObject(texture));
            return Gdk.ContentProvider.newForValue(value);
        } catch {
            return null;
        }
    }, [selectedImage]);

    const createFileDragProvider = useCallback(() => {
        if (sourceFile) {
            return Gdk.ContentProvider.newForValue(makeValue(getGFileType(), (v) => v.setObject(sourceFile)));
        }
        return null;
    }, [sourceFile]);

    const handleCopy = useCallback(() => {
        const clipboard = getClipboard();
        if (!clipboard) return;

        if (sourceType === "Text") {
            setClipboardValue(
                clipboard,
                makeValue(GObject.Type.STRING, (v) => v.setString(sourceText)),
            );
        } else if (sourceType === "Color") {
            setClipboardValue(
                clipboard,
                makeValue(getGdkRgbaType(), (v) => v.setBoxed(sourceColor)),
            );
        } else if (sourceType === "Image") {
            const paths = [portlandRosePath, floppyBuddyPath, gtkLogoSvgPath];
            const path = paths[selectedImage] ?? portlandRosePath;
            try {
                const texture = Gdk.Texture.newFromFilename(path);
                setClipboardValue(
                    clipboard,
                    makeValue(getGdkPaintableType(), (v) => v.setObject(texture)),
                );
            } catch {}
        } else if ((sourceType === "File" || sourceType === "Folder") && sourceFile) {
            setClipboardValue(
                clipboard,
                makeValue(getGFileType(), (v) => v.setObject(sourceFile)),
            );
        }
    }, [sourceType, sourceText, sourceColor, selectedImage, sourceFile, getClipboard]);

    const tryPasteTexture = useCallback(
        async (clipboard: Gdk.Clipboard, formats: Gdk.ContentFormats): Promise<boolean> => {
            if (!formats.containMimeType("image/png")) return false;
            const texture = await readTextureAsync(clipboard);
            if (!texture) return false;
            setPastedContent({ type: "Image", paintable: texture });
            return true;
        },
        [],
    );

    const tryPastePaintable = useCallback(
        async (clipboard: Gdk.Clipboard, formats: Gdk.ContentFormats): Promise<boolean> => {
            if (!formats.containGtype(getGdkPaintableType())) return false;
            const value = await readValueAsync(clipboard, getGdkPaintableType());
            const obj = value.getObject();
            if (!obj) return false;
            setPastedContent({ type: "Image", paintable: obj as Gdk.Paintable });
            return true;
        },
        [],
    );

    const tryPasteColor = useCallback(
        async (clipboard: Gdk.Clipboard, formats: Gdk.ContentFormats): Promise<boolean> => {
            if (!formats.containGtype(getGdkRgbaType())) return false;
            const value = await readValueAsync(clipboard, getGdkRgbaType());
            const rgba = value.getBoxed<Gdk.RGBA>();
            if (!rgba) return false;
            setPastedContent({
                type: "Color",
                color: makeRgba(rgba.red, rgba.green, rgba.blue, rgba.alpha),
            });
            return true;
        },
        [],
    );

    const tryPasteFile = useCallback(
        async (clipboard: Gdk.Clipboard, formats: Gdk.ContentFormats): Promise<boolean> => {
            if (!formats.containGtype(getGFileType())) return false;
            const value = await readValueAsync(clipboard, getGFileType());
            const obj = value.getObject();
            if (!(obj instanceof Gio.File)) return false;
            setPastedContent({ type: "File", filePath: obj.getPath() ?? obj.getUri() ?? undefined });
            return true;
        },
        [],
    );

    const tryPasteText = useCallback(
        async (clipboard: Gdk.Clipboard, formats: Gdk.ContentFormats): Promise<boolean> => {
            if (!formats.containGtype(GObject.Type.STRING)) return false;
            const text = await clipboard.readTextAsync(null);
            if (text === null) return false;
            setPastedContent({ type: "Text", text });
            return true;
        },
        [],
    );

    const handlePaste = useCallback(async () => {
        const clipboard = getClipboard();
        if (!clipboard) return;
        const formats = clipboard.getFormats();
        try {
            if (await tryPasteTexture(clipboard, formats)) return;
            if (await tryPastePaintable(clipboard, formats)) return;
            if (await tryPasteColor(clipboard, formats)) return;
            if (await tryPasteFile(clipboard, formats)) return;
            await tryPasteText(clipboard, formats);
        } catch {}
    }, [getClipboard, tryPasteTexture, tryPastePaintable, tryPasteColor, tryPasteFile, tryPasteText]);

    const handleFileSelect = useCallback(async () => {
        const dialog = new Gtk.FileDialog();
        try {
            const file = await dialog.open(window.current, null);
            setSourceFile(file);
        } catch {}
    }, [window]);

    const handleFolderSelect = useCallback(async () => {
        const dialog = new Gtk.FileDialog();
        try {
            const file = await dialog.selectFolder(window.current, null);
            setSourceFile(file);
        } catch {}
    }, [window]);

    const handleDrop = useCallback((value: GObject.Value) => {
        const obj = value.getObject();
        if (obj) {
            if (GObject.typeIsA(obj.__gtype__, getGdkPaintableType())) {
                setPastedContent({ type: "Image", paintable: obj as Gdk.Paintable });
                return true;
            }
            if (obj instanceof Gio.File) {
                setPastedContent({ type: "File", filePath: obj.getPath() ?? obj.getUri() ?? undefined });
                return true;
            }
        }
        const rgba = value.getBoxed<Gdk.RGBA>();
        if (rgba) {
            setPastedContent({
                type: "Color",
                color: makeRgba(rgba.red, rgba.green, rgba.blue, rgba.alpha),
            });
            return true;
        }
        const text = value.getString();
        if (text) {
            setPastedContent({ type: "Text", text });
            return true;
        }
        return false;
    }, []);

    return (
        <GtkBox
            orientation={Gtk.Orientation.VERTICAL}
            spacing={12}
            marginStart={12}
            marginEnd={12}
            marginTop={12}
            marginBottom={12}
        >
            <GtkLabel
                label={
                    '"Copy" will copy the selected data the clipboard, "Paste" will show the current clipboard contents. You can also drag the data to the bottom.'
                }
                wrap
                maxWidthChars={40}
            />

            <GtkBox spacing={12}>
                <GtkDropDown
                    valign={Gtk.Align.CENTER}
                    onSelectionChanged={(id) => setSourceType(id as SourceType)}
                    items={SOURCE_TYPES.map((type) => ({ id: type, value: type }))}
                />

                <GtkStack page={sourceType} vexpand>
                    <GtkStack.Page id="Text">
                        <GtkEntry
                            text={sourceText}
                            valign={Gtk.Align.CENTER}
                            accessibleLabel="Text to copy"
                            onChanged={(entry) => setSourceText(entry.getText())}
                        >
                            <GtkDragSource onPrepare={createTextDragProvider} actions={Gdk.DragAction.COPY} />
                        </GtkEntry>
                    </GtkStack.Page>
                    <GtkStack.Page id="Color">
                        <GtkColorDialogButton
                            rgba={sourceColor}
                            valign={Gtk.Align.CENTER}
                            accessibleLabel="Color to copy"
                            onRgbaChanged={(rgba) =>
                                setSourceColor(makeRgba(rgba.red, rgba.green, rgba.blue, rgba.alpha))
                            }
                        >
                            <GtkDragSource onPrepare={createColorDragProvider} actions={Gdk.DragAction.COPY} />
                        </GtkColorDialogButton>
                    </GtkStack.Page>
                    <GtkStack.Page id="Image">
                        <GtkBox valign={Gtk.Align.CENTER} cssClasses={["linked"]}>
                            <GtkToggleButton
                                accessibleLabel="Portland Rose"
                                active={selectedImage === 0}
                                onToggled={(btn) => {
                                    if (btn.getActive()) setSelectedImage(0);
                                }}
                            >
                                <GtkImage paintable={portlandRoseTexture} pixelSize={48} />
                                <GtkDragSource onPrepare={createImageDragProvider} actions={Gdk.DragAction.COPY} />
                            </GtkToggleButton>
                            <GtkToggleButton
                                accessibleLabel="Floppy Buddy"
                                active={selectedImage === 1}
                                onToggled={(btn) => {
                                    if (btn.getActive()) setSelectedImage(1);
                                }}
                            >
                                <GtkImage paintable={floppyBuddyTexture} pixelSize={48} />
                                <GtkDragSource onPrepare={createImageDragProvider} actions={Gdk.DragAction.COPY} />
                            </GtkToggleButton>
                            <GtkToggleButton
                                accessibleLabel="GTK Logo"
                                active={selectedImage === 2}
                                onToggled={(btn) => {
                                    if (btn.getActive()) setSelectedImage(2);
                                }}
                            >
                                <GtkImage paintable={gtkLogoSvgTexture} pixelSize={48} />
                                <GtkDragSource onPrepare={createImageDragProvider} actions={Gdk.DragAction.COPY} />
                            </GtkToggleButton>
                        </GtkBox>
                    </GtkStack.Page>
                    <GtkStack.Page id="File">
                        <GtkButton
                            valign={Gtk.Align.CENTER}
                            accessibleLabel="Select file"
                            onClicked={() => void handleFileSelect()}
                        >
                            <GtkLabel
                                label={sourceFile ? (sourceFile.getPath() ?? "\u2014") : "\u2014"}
                                xalign={0}
                                ellipsize={1}
                            />
                            <GtkDragSource
                                onPrepare={createFileDragProvider}
                                actions={Gdk.DragAction.COPY}
                                propagationPhase={Gtk.PropagationPhase.CAPTURE}
                            />
                        </GtkButton>
                    </GtkStack.Page>
                    <GtkStack.Page id="Folder">
                        <GtkButton
                            valign={Gtk.Align.CENTER}
                            accessibleLabel="Select folder"
                            onClicked={() => void handleFolderSelect()}
                        >
                            <GtkLabel
                                label={sourceFile ? (sourceFile.getPath() ?? "\u2014") : "\u2014"}
                                xalign={0}
                                ellipsize={1}
                            />
                            <GtkDragSource
                                onPrepare={createFileDragProvider}
                                actions={Gdk.DragAction.COPY}
                                propagationPhase={Gtk.PropagationPhase.CAPTURE}
                            />
                        </GtkButton>
                    </GtkStack.Page>
                </GtkStack>

                <GtkButton
                    label="_Copy"
                    useUnderline
                    valign={Gtk.Align.CENTER}
                    sensitive={canCopy}
                    onClicked={handleCopy}
                />
            </GtkBox>

            <GtkSeparator />

            <GtkBox spacing={12}>
                <GtkDropTarget
                    types={[getGdkPaintableType(), getGFileType(), getGdkRgbaType(), GObject.Type.STRING]}
                    actions={Gdk.DragAction.COPY}
                    onDrop={(value: GObject.Value) => handleDrop(value)}
                />
                <GtkButton
                    label="_Paste"
                    useUnderline
                    valign={Gtk.Align.CENTER}
                    sensitive={canPaste}
                    onClicked={() => void handlePaste()}
                />
                <GtkLabel label={pastedContent.type} xalign={0} />
                <GtkStack page={pastedContent.type} halign={Gtk.Align.END} valign={Gtk.Align.CENTER}>
                    <GtkStack.Page id="">
                        <GtkLabel label="" />
                    </GtkStack.Page>
                    <GtkStack.Page id="Text">
                        <GtkLabel
                            label={pastedContent.text ?? ""}
                            halign={Gtk.Align.END}
                            valign={Gtk.Align.CENTER}
                            xalign={0}
                            ellipsize={3}
                        />
                    </GtkStack.Page>
                    <GtkStack.Page id="Image">
                        {pastedContent.paintable ? (
                            <GtkImage
                                paintable={pastedContent.paintable}
                                halign={Gtk.Align.END}
                                valign={Gtk.Align.CENTER}
                                pixelSize={48}
                            />
                        ) : (
                            <GtkLabel label="" />
                        )}
                    </GtkStack.Page>
                    <GtkStack.Page id="Color">
                        <GtkDrawingArea
                            contentWidth={32}
                            contentHeight={32}
                            halign={Gtk.Align.END}
                            valign={Gtk.Align.CENTER}
                            render={(cr, w, h) => {
                                const c = pastedContent.color;
                                if (c) {
                                    drawColorSwatch(cr, w, h, c);
                                }
                            }}
                        />
                    </GtkStack.Page>
                    <GtkStack.Page id="File">
                        <GtkLabel
                            label={pastedContent.filePath ?? ""}
                            halign={Gtk.Align.END}
                            valign={Gtk.Align.CENTER}
                            xalign={0}
                            hexpand
                            ellipsize={1}
                        />
                    </GtkStack.Page>
                </GtkStack>
            </GtkBox>
        </GtkBox>
    );
};

export const clipboardDemo: Demo = {
    id: "clipboard",
    title: "Clipboard",
    description:
        "GdkClipboard is used for clipboard handling. This demo shows how to copy and paste text, images, colors or files to and from the clipboard.",
    keywords: ["clipboard", "copy", "paste", "GdkClipboard", "text", "image", "color", "file", "transfer"],
    component: ClipboardDemo,
    sourceCode,
};
