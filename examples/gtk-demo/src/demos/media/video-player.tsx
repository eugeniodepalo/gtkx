import * as Gio from "@gtkx/ffi/gio";
import * as GObject from "@gtkx/ffi/gobject";
import * as Gtk from "@gtkx/ffi/gtk";
import { GtkButton, GtkHeaderBar, GtkVideo, x } from "@gtkx/react";
import { useState } from "react";
import type { Demo, DemoProps } from "../types.js";
import gtkLogoPath from "./gtk-logo.webm";
import sourceCode from "./video-player.tsx?raw";

const VideoPlayerDemo = ({ window }: DemoProps) => {
    const [videoFile, setVideoFile] = useState<Gio.File | null>(null);

    const handleOpen = async () => {
        const dialog = new Gtk.FileDialog();
        dialog.setTitle("Select a video");

        const filters = new Gio.ListStore(GObject.typeFromName("GtkFileFilter"));

        const allFilter = new Gtk.FileFilter();
        allFilter.setName("All Files");
        allFilter.addPattern("*");
        filters.append(allFilter);

        const imageFilter = new Gtk.FileFilter();
        imageFilter.setName("Images");
        imageFilter.addMimeType("image/*");
        filters.append(imageFilter);

        const videoFilter = new Gtk.FileFilter();
        videoFilter.setName("Video");
        videoFilter.addMimeType("video/*");
        filters.append(videoFilter);

        dialog.setFilters(filters);
        dialog.setDefaultFilter(videoFilter);

        try {
            const file = await dialog.openAsync(window.current);
            setVideoFile(file);
        } catch {
            /* User cancelled */
        }
    };

    const handleLogo = () => {
        const file = Gio.fileNewForPath(gtkLogoPath);
        setVideoFile(file);
    };

    const handleBBB = () => {
        const file = Gio.fileNewForUri("https://download.blender.org/peach/trailer/trailer_400p.ogg");
        setVideoFile(file);
    };

    const handleFullscreen = () => {
        window.current?.fullscreen();
    };

    return (
        <>
            <x.Slot for="GtkWindow" id="titlebar">
                <GtkHeaderBar>
                    <x.ContainerSlot for={GtkHeaderBar} id="packStart">
                        <GtkButton label="_Open" useUnderline onClicked={() => void handleOpen()} />
                        <GtkButton label="GTK Logo" onClicked={handleLogo} />
                        <GtkButton label="Big Buck Bunny" onClicked={handleBBB} />
                    </x.ContainerSlot>
                    <x.ContainerSlot for={GtkHeaderBar} id="packEnd">
                        <GtkButton iconName="view-fullscreen-symbolic" onClicked={handleFullscreen} />
                    </x.ContainerSlot>
                </GtkHeaderBar>
            </x.Slot>
            <GtkVideo file={videoFile} autoplay />
        </>
    );
};

export const videoPlayerDemo: Demo = {
    id: "video-player",
    title: "Video Player",
    description: "This is a simple video player using just GTK widgets.",
    keywords: ["video", "player", "media", "GtkVideo", "GtkMediaStream", "GtkMediaFile"],
    component: VideoPlayerDemo,
    sourceCode,
};
