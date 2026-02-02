import type * as Gio from "@gtkx/ffi/gio";
import * as Gtk from "@gtkx/ffi/gtk";
import { GtkBox, GtkButton, GtkColorDialogButton, GtkFontDialogButton, GtkGrid, GtkLabel, x } from "@gtkx/react";
import { useCallback, useState } from "react";
import type { Demo, DemoProps } from "../types.js";
import sourceCode from "./pickers.tsx?raw";

const PickersDemo = ({ window }: DemoProps) => {
    const [selectedFile, setSelectedFile] = useState<Gio.File | null>(null);
    const [fileName, setFileName] = useState("None");
    const [isPdf, setIsPdf] = useState(false);

    const handleOpenFile = async () => {
        try {
            const fileDialog = new Gtk.FileDialog();
            const file = await fileDialog.openAsync(window.current ?? undefined);
            setSelectedFile(file);
            setFileName(file.getBasename() ?? file.getUri());
            const info = file.queryInfo("standard::content-type", 0, null);
            setIsPdf(info.getContentType() === "application/pdf");
        } catch {
            setSelectedFile(null);
            setFileName("None");
            setIsPdf(false);
        }
    };

    const handleLaunchApp = useCallback(async () => {
        if (!selectedFile) return;
        try {
            const launcher = new Gtk.FileLauncher(selectedFile);
            await launcher.launchAsync(window.current ?? undefined);
        } catch {}
    }, [window, selectedFile]);

    const handleOpenFolder = useCallback(async () => {
        if (!selectedFile) return;
        try {
            const launcher = new Gtk.FileLauncher(selectedFile);
            await launcher.openContainingFolderAsync(window.current ?? undefined);
        } catch {}
    }, [window, selectedFile]);

    const handlePrintFile = useCallback(async () => {
        if (!selectedFile || !isPdf) return;
        try {
            const printDialog = new Gtk.PrintDialog();
            await printDialog.printFileAsync(selectedFile, window.current ?? undefined);
        } catch {}
    }, [window, selectedFile, isPdf]);

    const handleLaunchUri = useCallback(async () => {
        try {
            const launcher = new Gtk.UriLauncher("http://www.gtk.org");
            await launcher.launchAsync(window.current ?? undefined);
        } catch {}
    }, [window]);

    return (
        <GtkGrid rowSpacing={6} columnSpacing={6} marginStart={20} marginEnd={20} marginTop={20} marginBottom={20}>
            <x.GridChild column={0} row={0}>
                <GtkLabel label="_Color:" useUnderline halign={Gtk.Align.START} hexpand />
            </x.GridChild>
            <x.GridChild column={1} row={0}>
                <GtkColorDialogButton />
            </x.GridChild>

            <x.GridChild column={0} row={1}>
                <GtkLabel label="_Font:" useUnderline halign={Gtk.Align.START} hexpand />
            </x.GridChild>
            <x.GridChild column={1} row={1}>
                <GtkFontDialogButton />
            </x.GridChild>

            <x.GridChild column={0} row={2}>
                <GtkLabel label="_File:" useUnderline halign={Gtk.Align.START} hexpand />
            </x.GridChild>
            <x.GridChild column={1} row={2}>
                <GtkBox spacing={6}>
                    <GtkLabel label={fileName} xalign={0} ellipsize={3} hexpand />
                    <GtkButton iconName="document-open-symbolic" onClicked={() => void handleOpenFile()} />
                    <GtkButton
                        iconName="emblem-system-symbolic"
                        sensitive={selectedFile !== null}
                        onClicked={() => void handleLaunchApp()}
                    />
                    <GtkButton
                        iconName="folder-symbolic"
                        sensitive={selectedFile !== null}
                        onClicked={() => void handleOpenFolder()}
                    />
                    <GtkButton
                        iconName="printer-symbolic"
                        tooltipText="Print file"
                        sensitive={isPdf}
                        onClicked={() => void handlePrintFile()}
                    />
                </GtkBox>
            </x.GridChild>

            <x.GridChild column={0} row={3}>
                <GtkLabel label="_URI:" useUnderline halign={Gtk.Align.START} hexpand />
            </x.GridChild>
            <x.GridChild column={1} row={3}>
                <GtkButton label="www.gtk.org" onClicked={() => void handleLaunchUri()} />
            </x.GridChild>
        </GtkGrid>
    );
};

export const pickersDemo: Demo = {
    id: "pickers",
    title: "Pickers and Launchers",
    description:
        "The dialogs are mainly intended for use in preference dialogs. They allow to select colors, fonts and files.",
    keywords: [
        "color",
        "font",
        "file",
        "picker",
        "GtkColorDialog",
        "GtkFontDialog",
        "GtkFileDialog",
        "GtkPrintDialog",
        "GtkFileLauncher",
        "GtkUriLauncher",
    ],
    component: PickersDemo,
    sourceCode,
};
