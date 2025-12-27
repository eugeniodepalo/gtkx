import * as Gtk from "@gtkx/ffi/gtk";
import {
    GridView,
    GtkBox,
    GtkButton,
    GtkFrame,
    GtkImage,
    GtkLabel,
    GtkScrolledWindow,
    GtkSearchEntry,
    ListItem,
} from "@gtkx/react";
import { useState } from "react";
import type { Demo } from "../types.js";

interface IconItem {
    id: string;
    name: string;
    icon: string;
    category: string;
}

const iconCategories = [
    {
        name: "Actions",
        icons: [
            "document-new-symbolic",
            "document-open-symbolic",
            "document-save-symbolic",
            "document-print-symbolic",
            "edit-copy-symbolic",
            "edit-cut-symbolic",
            "edit-paste-symbolic",
            "edit-delete-symbolic",
            "edit-undo-symbolic",
            "edit-redo-symbolic",
            "list-add-symbolic",
            "list-remove-symbolic",
        ],
    },
    {
        name: "Navigation",
        icons: [
            "go-home-symbolic",
            "go-previous-symbolic",
            "go-next-symbolic",
            "go-up-symbolic",
            "go-down-symbolic",
            "view-refresh-symbolic",
            "zoom-in-symbolic",
            "zoom-out-symbolic",
            "zoom-fit-best-symbolic",
            "pan-start-symbolic",
            "pan-end-symbolic",
            "pan-up-symbolic",
        ],
    },
    {
        name: "Status",
        icons: [
            "dialog-information-symbolic",
            "dialog-warning-symbolic",
            "dialog-error-symbolic",
            "dialog-question-symbolic",
            "emblem-ok-symbolic",
            "window-close-symbolic",
            "process-stop-symbolic",
            "view-more-symbolic",
            "starred-symbolic",
            "non-starred-symbolic",
            "media-playback-start-symbolic",
            "media-playback-pause-symbolic",
        ],
    },
    {
        name: "Devices",
        icons: [
            "computer-symbolic",
            "phone-symbolic",
            "printer-symbolic",
            "drive-harddisk-symbolic",
            "media-optical-symbolic",
            "camera-photo-symbolic",
            "audio-headphones-symbolic",
            "input-keyboard-symbolic",
            "input-mouse-symbolic",
            "network-wired-symbolic",
            "network-wireless-symbolic",
            "battery-full-symbolic",
        ],
    },
];

const allIcons: IconItem[] = iconCategories.flatMap((cat) =>
    cat.icons.map((icon) => ({
        id: icon,
        name: icon.replace("-symbolic", "").replace(/-/g, " "),
        icon,
        category: cat.name,
    })),
);

const IconViewDemo = () => {
    const [searchText, setSearchText] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [selectedIcon, setSelectedIcon] = useState<IconItem | null>(null);

    const filteredIcons = allIcons.filter((icon) => {
        const matchesSearch =
            searchText === "" ||
            icon.name.toLowerCase().includes(searchText.toLowerCase()) ||
            icon.icon.toLowerCase().includes(searchText.toLowerCase());
        const matchesCategory = selectedCategory === null || icon.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const handleActivate = (_grid: Gtk.GridView, position: number) => {
        const icon = filteredIcons[position];
        if (icon) {
            setSelectedIcon(icon);
        }
    };

    return (
        <GtkBox
            orientation={Gtk.Orientation.VERTICAL}
            spacing={24}
            marginStart={20}
            marginEnd={20}
            marginTop={20}
            marginBottom={20}
        >
            <GtkLabel label="Icon View" cssClasses={["title-2"]} halign={Gtk.Align.START} />

            <GtkLabel
                label="GridView displays items in a grid layout with icons and labels. It supports selection, activation, and efficient virtualization for large collections."
                wrap
                halign={Gtk.Align.START}
                cssClasses={["dim-label"]}
            />

            {/* Icon Browser */}
            <GtkFrame label="Icon Browser">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={12}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    {/* Search and Filter */}
                    <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={12}>
                        <GtkSearchEntry
                            text={searchText}
                            placeholderText="Search icons..."
                            onSearchChanged={(entry) => setSearchText(entry.getText())}
                            hexpand
                        />
                    </GtkBox>

                    {/* Category Filters */}
                    <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={8}>
                        <GtkButton
                            label="All"
                            onClicked={() => setSelectedCategory(null)}
                            cssClasses={selectedCategory === null ? ["suggested-action"] : ["flat"]}
                        />
                        {iconCategories.map((cat) => (
                            <GtkButton
                                key={cat.name}
                                label={cat.name}
                                onClicked={() => setSelectedCategory(cat.name)}
                                cssClasses={selectedCategory === cat.name ? ["suggested-action"] : ["flat"]}
                            />
                        ))}
                    </GtkBox>

                    <GtkLabel
                        label={`Showing ${filteredIcons.length} icons`}
                        cssClasses={["dim-label"]}
                        halign={Gtk.Align.START}
                    />

                    {/* Icon Grid */}
                    <GtkScrolledWindow heightRequest={300} hscrollbarPolicy={Gtk.PolicyType.NEVER}>
                        <GridView<IconItem>
                            minColumns={4}
                            maxColumns={8}
                            onActivate={handleActivate}
                            renderItem={(item) => (
                                <GtkBox
                                    orientation={Gtk.Orientation.VERTICAL}
                                    spacing={4}
                                    cssClasses={["card"]}
                                    halign={Gtk.Align.CENTER}
                                    valign={Gtk.Align.CENTER}
                                    widthRequest={80}
                                    marginTop={12}
                                    marginBottom={12}
                                    marginStart={12}
                                    marginEnd={12}
                                >
                                    <GtkImage iconName={item?.icon ?? ""} pixelSize={32} />
                                    <GtkLabel
                                        label={item?.name ?? ""}
                                        cssClasses={["caption"]}
                                        ellipsize={3}
                                        maxWidthChars={10}
                                    />
                                </GtkBox>
                            )}
                        >
                            {filteredIcons.map((icon) => (
                                <ListItem key={icon.id} id={icon.id} value={icon} />
                            ))}
                        </GridView>
                    </GtkScrolledWindow>

                    {/* Selected Icon Info */}
                    {selectedIcon && (
                        <GtkBox
                            orientation={Gtk.Orientation.HORIZONTAL}
                            spacing={16}
                            cssClasses={["card"]}
                            marginTop={8}
                            marginBottom={8}
                            marginStart={12}
                            marginEnd={12}
                        >
                            <GtkImage iconName={selectedIcon.icon} pixelSize={48} />
                            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={4} valign={Gtk.Align.CENTER}>
                                <GtkLabel label={selectedIcon.name} halign={Gtk.Align.START} cssClasses={["heading"]} />
                                <GtkLabel
                                    label={selectedIcon.icon}
                                    cssClasses={["dim-label", "caption"]}
                                    halign={Gtk.Align.START}
                                />
                                <GtkLabel
                                    label={`Category: ${selectedIcon.category}`}
                                    cssClasses={["dim-label", "caption"]}
                                    halign={Gtk.Align.START}
                                />
                            </GtkBox>
                        </GtkBox>
                    )}
                </GtkBox>
            </GtkFrame>

            {/* Key Properties */}
            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                <GtkLabel label="Key Properties" cssClasses={["heading"]} halign={Gtk.Align.START} />
                <GtkLabel
                    label="minColumns/maxColumns: Control grid dimensions. onActivate: Called when item is double-clicked or activated. renderItem: Function to render each grid cell. Use ListItem children to provide data with id and value."
                    wrap
                    cssClasses={["dim-label"]}
                    halign={Gtk.Align.START}
                />
            </GtkBox>
        </GtkBox>
    );
};

const sourceCode = `import { useState } from "react";
import * as Gtk from "@gtkx/ffi/gtk";
import {
  GtkBox,
  GtkImage,
  GtkLabel,
  GtkScrolledWindow,
  GridView,
  ListItem,
} from "@gtkx/react";

interface IconItem {
  id: string;
  name: string;
  icon: string;
}

const icons: IconItem[] = [
  { id: "new", name: "New", icon: "document-new-symbolic" },
  { id: "open", name: "Open", icon: "document-open-symbolic" },
  { id: "save", name: "Save", icon: "document-save-symbolic" },
];

const IconViewDemo = () => {
  const [selected, setSelected] = useState<IconItem | null>(null);

  return (
    <GtkScrolledWindow heightRequest={200}>
      <GridView<IconItem>
        minColumns={3}
        maxColumns={6}
        onActivate={(_, position) => setSelected(icons[position])}
        renderItem={(item) => (
          <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={4}>
            <GtkImage iconName={item?.icon ?? ""} pixelSize={32} />
            <GtkLabel label={item?.name ?? ""} />
          </GtkBox>
        )}
      >
        {icons.map((icon) => (
          <ListItem key={icon.id} id={icon.id} value={icon} />
        ))}
      </GridView>
    </GtkScrolledWindow>
  );
};`;

export const iconviewDemo: Demo = {
    id: "iconview",
    title: "Icon View",
    description: "Grid display of icons with labels using GridView",
    keywords: ["gridview", "icons", "grid", "thumbnails", "GtkGridView", "gallery"],
    component: IconViewDemo,
    sourceCode,
};
