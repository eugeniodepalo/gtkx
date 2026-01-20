import * as Gio from "@gtkx/ffi/gio";
import * as GLib from "@gtkx/ffi/glib";
import * as Gtk from "@gtkx/ffi/gtk";
import {
    GtkBox,
    GtkButton,
    GtkHeaderBar,
    GtkImage,
    GtkLabel,
    GtkScrolledWindow,
    GtkToggleButton,
    x,
} from "@gtkx/react";
import { useCallback, useEffect, useState } from "react";
import type { Demo } from "../types.js";
import sourceCode from "./listview-filebrowser.tsx?raw";

interface FileItem {
    name: string;
    displayName: string;
    isDirectory: boolean;
    size: number;
    iconName: string;
    contentType: string | null;
}

type ViewMode = "list" | "grid" | "paged";

const ATTRIBUTES =
    "standard::name,standard::display-name,standard::type,standard::size,standard::icon,standard::content-type";

const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

const getIconName = (icon: Gio.Icon | null): string => {
    if (!icon) return "text-x-generic-symbolic";
    if (icon instanceof Gio.ThemedIcon) {
        const names = icon.getNames();
        return names[0] ?? "text-x-generic-symbolic";
    }
    return "text-x-generic-symbolic";
};

const ListItem = ({ item, mode }: { item: FileItem | null; mode: ViewMode }) => {
    if (!item) return null;

    if (mode === "grid") {
        return (
            <GtkBox orientation={Gtk.Orientation.VERTICAL} halign={Gtk.Align.CENTER}>
                <GtkImage iconName={item.iconName} iconSize={Gtk.IconSize.LARGE} />
                <GtkLabel
                    label={item.displayName}
                    wrap
                    wrapMode={2}
                    lines={2}
                    ellipsize={3}
                    widthChars={10}
                    maxWidthChars={30}
                />
            </GtkBox>
        );
    }

    if (mode === "paged") {
        return (
            <GtkBox>
                <GtkImage iconName={item.iconName} iconSize={Gtk.IconSize.LARGE} />
                <GtkBox orientation={Gtk.Orientation.VERTICAL}>
                    <GtkLabel label={item.displayName} halign={Gtk.Align.START} />
                    <GtkLabel
                        label={item.isDirectory ? "folder" : formatSize(item.size)}
                        halign={Gtk.Align.START}
                        cssClasses={["dim-label"]}
                    />
                    <GtkLabel label={item.contentType ?? ""} halign={Gtk.Align.START} cssClasses={["dim-label"]} />
                </GtkBox>
            </GtkBox>
        );
    }

    return (
        <GtkBox>
            <GtkImage iconName={item.iconName} />
            <GtkLabel label={item.displayName} halign={Gtk.Align.START} />
        </GtkBox>
    );
};

const ListViewFilebrowserDemo = () => {
    const [currentPath, setCurrentPath] = useState(() => GLib.getCurrentDir() ?? GLib.getHomeDir() ?? "/");
    const [files, setFiles] = useState<FileItem[]>([]);
    const [viewMode, setViewMode] = useState<ViewMode>("list");

    useEffect(() => {
        const file = Gio.fileNewForPath(currentPath);
        const dirList = new Gtk.DirectoryList(ATTRIBUTES, file);

        const checkLoading = () => {
            if (dirList.isLoading()) {
                setTimeout(checkLoading, 50);
                return;
            }

            const items: FileItem[] = [];
            const count = dirList.getNItems();

            for (let i = 0; i < count; i++) {
                const obj = dirList.getObject(i);
                if (obj instanceof Gio.FileInfo) {
                    items.push({
                        name: obj.getName(),
                        displayName: obj.getDisplayName(),
                        isDirectory: obj.getFileType() === Gio.FileType.DIRECTORY,
                        size: obj.getSize(),
                        iconName: getIconName(obj.getIcon()),
                        contentType: obj.getContentType(),
                    });
                }
            }

            items.sort((a, b) => {
                if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
                return a.displayName.localeCompare(b.displayName);
            });

            setFiles(items);
        };

        checkLoading();
    }, [currentPath]);

    const navigateUp = useCallback(() => {
        const file = Gio.fileNewForPath(currentPath);
        const parent = file.getParent();
        if (parent) {
            setCurrentPath(parent.getPath() ?? "/");
        }
    }, [currentPath]);

    const handleActivate = useCallback(
        (_view: Gtk.GridView, position: number) => {
            const item = files[position];
            if (!item) return;

            if (item.isDirectory) {
                const newPath = currentPath === "/" ? `/${item.name}` : `${currentPath}/${item.name}`;
                setCurrentPath(newPath);
            }
        },
        [files, currentPath],
    );

    return (
        <>
            <x.Slot for="GtkWindow" id="titlebar">
                <GtkHeaderBar>
                    <x.PackStart>
                        <GtkButton iconName="go-up-symbolic" onClicked={navigateUp} />
                    </x.PackStart>
                    <x.PackEnd>
                        <GtkBox cssClasses={["linked"]}>
                            <GtkToggleButton
                                iconName="view-list-symbolic"
                                tooltipText="List"
                                active={viewMode === "list"}
                                onToggled={() => setViewMode("list")}
                            />
                            <GtkToggleButton
                                iconName="view-grid-symbolic"
                                tooltipText="Grid"
                                active={viewMode === "grid"}
                                onToggled={() => setViewMode("grid")}
                            />
                            <GtkToggleButton
                                iconName="view-paged-symbolic"
                                tooltipText="Paged"
                                active={viewMode === "paged"}
                                onToggled={() => setViewMode("paged")}
                            />
                        </GtkBox>
                    </x.PackEnd>
                </GtkHeaderBar>
            </x.Slot>

            <GtkScrolledWindow vexpand hexpand>
                <x.GridView<FileItem>
                    estimatedItemHeight={viewMode === "grid" ? 80 : 48}
                    maxColumns={15}
                    orientation={viewMode === "grid" ? Gtk.Orientation.VERTICAL : Gtk.Orientation.HORIZONTAL}
                    onActivate={handleActivate}
                    renderItem={(item) => <ListItem item={item} mode={viewMode} />}
                >
                    {files.map((file) => (
                        <x.ListItem key={file.name} id={file.name} value={file} />
                    ))}
                </x.GridView>
            </GtkScrolledWindow>
        </>
    );
};

export const listviewFilebrowserDemo: Demo = {
    id: "listview-filebrowser",
    title: "Lists/File browser",
    description:
        "This demo shows off the different layouts that are quickly achievable with GtkGridView by implementing a file browser with different views.",
    keywords: ["listview", "gridview", "files", "browser", "GtkGridView", "GtkDirectoryList", "views"],
    component: ListViewFilebrowserDemo,
    sourceCode,
};
