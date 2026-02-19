import * as Gtk from "@gtkx/ffi/gtk";
import { GtkBox, GtkInscription, GtkListView, GtkScrolledWindow, GtkSearchBar, GtkSearchEntry } from "@gtkx/react";
import { useDemo } from "../context/demo-context.js";
import type { TreeItem } from "../demos/types.js";

interface SidebarProps {
    searchMode: boolean;
    onSearchChanged: (text: string) => void;
}

interface SidebarItemData {
    id: string;
    value: TreeItem;
    hideExpander?: true;
    children?: SidebarItemData[];
}

function treeItemToData(item: TreeItem): SidebarItemData {
    if (item.type === "demo") {
        return { id: `demo-${item.demo.id}`, value: item, hideExpander: true };
    }
    return {
        id: `category-${item.title}`,
        value: item,
        children: item.children.map(treeItemToData),
    };
}

export const Sidebar = ({ searchMode, onSearchChanged }: SidebarProps) => {
    const { filteredTreeItems, currentDemo, setCurrentDemo, searchQuery, demos } = useDemo();

    return (
        <GtkBox orientation={Gtk.Orientation.VERTICAL}>
            <GtkSearchBar searchModeEnabled={searchMode}>
                <GtkSearchEntry
                    text={searchQuery}
                    onSearchChanged={(entry: Gtk.SearchEntry) => onSearchChanged(entry.getText())}
                />
            </GtkSearchBar>
            <GtkScrolledWindow
                vexpand
                hscrollbarPolicy={Gtk.PolicyType.NEVER}
                propagateNaturalWidth
                cssClasses={["sidebar"]}
            >
                <GtkListView
                    cssClasses={["navigation-sidebar"]}
                    autoexpand
                    selectionMode={Gtk.SelectionMode.SINGLE}
                    selected={currentDemo ? [`demo-${currentDemo.id}`] : []}
                    onSelectionChanged={(ids: string[]) => {
                        const selectedId = ids[0];
                        if (!selectedId?.startsWith("demo-")) return;
                        const demoId = selectedId.slice(5);
                        const demo = demos.find((d) => d.id === demoId);
                        if (demo) {
                            setCurrentDemo(demo);
                        }
                    }}
                    renderItem={(item: TreeItem) => {
                        if (item.type === "category") {
                            return (
                                <GtkInscription
                                    text={item.title}
                                    natChars={25}
                                    textOverflow={Gtk.InscriptionOverflow.ELLIPSIZE_END}
                                />
                            );
                        }

                        return (
                            <GtkInscription
                                text={item.displayTitle}
                                natChars={25}
                                textOverflow={Gtk.InscriptionOverflow.ELLIPSIZE_END}
                            />
                        );
                    }}
                    items={filteredTreeItems.map(treeItemToData)}
                />
            </GtkScrolledWindow>
        </GtkBox>
    );
};
