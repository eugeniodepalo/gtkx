import * as Gdk from "@gtkx/ffi/gdk";
import * as Gio from "@gtkx/ffi/gio";
import * as GObject from "@gtkx/ffi/gobject";
import * as Gtk from "@gtkx/ffi/gtk";
import { GtkButton, GtkHeaderBar, GtkImage, GtkPicture, x } from "@gtkx/react";
import { useState } from "react";
import type { Demo, DemoProps } from "../types.js";
import sourceCode from "./paintable-svg.tsx?raw";

const PaintableSvgDemo = ({ window }: DemoProps) => {
    const [texture, setTexture] = useState<Gdk.Texture | null>(null);
    const [isSymbolic, setIsSymbolic] = useState(false);

    const handleOpen = async () => {
        const dialog = new Gtk.FileDialog();
        dialog.setTitle("Open SVG image");

        const filters = new Gio.ListStore(GObject.typeFromName("GtkFileFilter"));
        const filter = new Gtk.FileFilter();
        filter.setName("SVG images");
        filter.addMimeType("image/svg+xml");
        filters.append(filter);
        dialog.setFilters(filters);

        try {
            const file = await dialog.openAsync(window.current);
            const path = file.getPath();
            if (path) {
                const symbolic = path.includes("symbolic");
                setIsSymbolic(symbolic);

                const bytes = file.loadBytes(null);
                const newTexture = Gdk.Texture.newFromBytes(bytes);
                setTexture(newTexture);
            }
        } catch {
            // Dialog was cancelled or error occurred
        }
    };

    return (
        <>
            <x.Slot for="GtkWindow" id="titlebar">
                <GtkHeaderBar>
                    <x.ContainerSlot for={GtkHeaderBar} id="packStart">
                        <GtkButton label="_Open" useUnderline onClicked={() => void handleOpen()} />
                    </x.ContainerSlot>
                </GtkHeaderBar>
            </x.Slot>

            {isSymbolic ? (
                <GtkImage paintable={texture} pixelSize={64} />
            ) : (
                <GtkPicture paintable={texture} canShrink contentFit={Gtk.ContentFit.CONTAIN} />
            )}
        </>
    );
};

export const paintableSvgDemo: Demo = {
    id: "paintable-svg",
    title: "Paintable/SVG",
    description:
        "This demo shows wrapping an SVG in a GdkPaintable to display an SVG image in a GtkPicture that can be scaled by resizing the window.",
    keywords: ["paintable", "svg", "vector", "scalable", "graphics", "GtkPicture"],
    component: PaintableSvgDemo,
    sourceCode,
};
