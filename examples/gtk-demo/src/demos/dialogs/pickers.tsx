import * as Gtk from "@gtkx/ffi/gtk";
import {
    GtkBox,
    GtkButton,
    GtkColorDialogButton,
    GtkFontDialogButton,
    GtkFrame,
    GtkLabel,
    useApplication,
} from "@gtkx/react";
import { useState } from "react";
import type { Demo } from "../types.js";
import sourceCode from "./pickers.tsx?raw";

const PickersDemo = () => {
    const app = useApplication();
    const [selectedColor, setSelectedColor] = useState<string | null>(null);
    const [selectedFont, setSelectedFont] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
    const [saveLocation, setSaveLocation] = useState<string | null>(null);

    const handleColorPick = async () => {
        try {
            const colorDialog = new Gtk.ColorDialog();
            colorDialog.setTitle("Choose a Color");
            colorDialog.setModal(true);

            const rgba = await colorDialog.chooseRgba(app.getActiveWindow() ?? undefined);
            const colorStr = `rgba(${Math.round(rgba.red * 255)}, ${Math.round(rgba.green * 255)}, ${Math.round(rgba.blue * 255)}, ${rgba.alpha.toFixed(2)})`;
            setSelectedColor(colorStr);
        } catch {
            // User cancelled
        }
    };

    const handleFontPick = async () => {
        try {
            const fontDialog = new Gtk.FontDialog();
            fontDialog.setTitle("Choose a Font");
            fontDialog.setModal(true);

            const fontDesc = await fontDialog.chooseFont(app.getActiveWindow() ?? undefined);
            setSelectedFont(fontDesc.toString());
        } catch {
            // User cancelled
        }
    };

    const handleFileOpen = async () => {
        try {
            const fileDialog = new Gtk.FileDialog();
            fileDialog.setTitle("Open File");
            fileDialog.setModal(true);

            const file = await fileDialog.open(app.getActiveWindow() ?? undefined);
            setSelectedFile(file.getPath() ?? file.getUri());
        } catch {
            // User cancelled
        }
    };

    const handleFolderSelect = async () => {
        try {
            const fileDialog = new Gtk.FileDialog();
            fileDialog.setTitle("Select Folder");
            fileDialog.setModal(true);

            const folder = await fileDialog.selectFolder(app.getActiveWindow() ?? undefined);
            setSelectedFolder(folder.getPath() ?? folder.getUri());
        } catch {
            // User cancelled
        }
    };

    const handleFileSave = async () => {
        try {
            const fileDialog = new Gtk.FileDialog();
            fileDialog.setTitle("Save File");
            fileDialog.setModal(true);
            fileDialog.setInitialName("untitled.txt");

            const file = await fileDialog.save(app.getActiveWindow() ?? undefined);
            setSaveLocation(file.getPath() ?? file.getUri());
        } catch {
            // User cancelled
        }
    };

    const handleMultipleFiles = async () => {
        try {
            const fileDialog = new Gtk.FileDialog();
            fileDialog.setTitle("Select Multiple Files");
            fileDialog.setModal(true);

            const files = await fileDialog.openMultiple(app.getActiveWindow() ?? undefined);
            const count = files.getNItems();
            setSelectedFile(`${count} file(s) selected`);
        } catch {
            // User cancelled
        }
    };

    return (
        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={24}>
            <GtkLabel label="Picker Dialogs" cssClasses={["title-2"]} halign={Gtk.Align.START} />

            <GtkLabel
                label="GTK4 provides specialized dialogs for picking colors, fonts, and files. These dialogs use async/await patterns and integrate with the native file system."
                wrap
                halign={Gtk.Align.START}
                cssClasses={["dim-label"]}
            />

            {/* Color Picker */}
            <GtkFrame label="Color Picker">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={12}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkLabel
                        label="GtkColorDialog opens a color chooser. GtkColorDialogButton provides a convenient button that shows the selected color."
                        halign={Gtk.Align.START}
                        cssClasses={["dim-label"]}
                        wrap
                    />
                    <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={12}>
                        <GtkButton label="Choose Color..." onClicked={handleColorPick} />
                        <GtkColorDialogButton />
                    </GtkBox>
                    {selectedColor && (
                        <GtkLabel
                            label={`Selected: ${selectedColor}`}
                            halign={Gtk.Align.START}
                            cssClasses={["dim-label"]}
                        />
                    )}
                </GtkBox>
            </GtkFrame>

            {/* Font Picker */}
            <GtkFrame label="Font Picker">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={12}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkLabel
                        label="GtkFontDialog opens a font chooser. GtkFontDialogButton provides a button that displays the selected font name."
                        halign={Gtk.Align.START}
                        cssClasses={["dim-label"]}
                        wrap
                    />
                    <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={12}>
                        <GtkButton label="Choose Font..." onClicked={handleFontPick} />
                        <GtkFontDialogButton />
                    </GtkBox>
                    {selectedFont && (
                        <GtkLabel
                            label={`Selected: ${selectedFont}`}
                            halign={Gtk.Align.START}
                            cssClasses={["dim-label"]}
                        />
                    )}
                </GtkBox>
            </GtkFrame>

            {/* File Picker */}
            <GtkFrame label="File Picker">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={12}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkLabel
                        label="GtkFileDialog provides methods for opening files, selecting folders, saving files, and selecting multiple files."
                        halign={Gtk.Align.START}
                        cssClasses={["dim-label"]}
                        wrap
                    />
                    <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={8}>
                        <GtkButton label="Open File" onClicked={handleFileOpen} />
                        <GtkButton label="Select Multiple" onClicked={handleMultipleFiles} />
                        <GtkButton label="Select Folder" onClicked={handleFolderSelect} />
                        <GtkButton label="Save As..." onClicked={handleFileSave} />
                    </GtkBox>
                    {selectedFile && (
                        <GtkLabel
                            label={`File: ${selectedFile}`}
                            halign={Gtk.Align.START}
                            cssClasses={["dim-label"]}
                            ellipsize={3}
                        />
                    )}
                    {selectedFolder && (
                        <GtkLabel
                            label={`Folder: ${selectedFolder}`}
                            halign={Gtk.Align.START}
                            cssClasses={["dim-label"]}
                            ellipsize={3}
                        />
                    )}
                    {saveLocation && (
                        <GtkLabel
                            label={`Save to: ${saveLocation}`}
                            halign={Gtk.Align.START}
                            cssClasses={["dim-label"]}
                            ellipsize={3}
                        />
                    )}
                </GtkBox>
            </GtkFrame>
        </GtkBox>
    );
};

export const pickersDemo: Demo = {
    id: "pickers",
    title: "Pickers",
    description: "Color, font, and file picker dialogs",
    keywords: [
        "color",
        "font",
        "file",
        "picker",
        "chooser",
        "dialog",
        "GtkColorDialog",
        "GtkFontDialog",
        "GtkFileDialog",
        "open",
        "save",
    ],
    component: PickersDemo,
    sourceCode,
};
