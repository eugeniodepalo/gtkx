import * as Gtk from "@gtkx/ffi/gtk";
import { GtkBox, GtkInscription, GtkListView, GtkScrolledWindow, GtkSearchBar, GtkSearchEntry, x } from "@gtkx/react";
import { useDemo } from "../context/demo-context.js";
import type { TreeItem } from "../demos/types.js";

interface SidebarProps {
    searchMode: boolean;
    onSearchChanged: (text: string) => void;
}

const TreeItemNode = ({ item }: { item: TreeItem }) => {
    if (item.type === "demo") {
        return (
            <x.ListItem key={item.demo.id} id={`demo-${item.demo.id}`} value={item} hideExpander>
                {null}
            </x.ListItem>
        );
    }

    return (
        <x.ListItem key={`category-${item.title}`} id={`category-${item.title}`} value={item}>
            {item.children.map((child) => (
                <TreeItemNode key={child.type === "demo" ? child.demo.id : child.title} item={child} />
            ))}
        </x.ListItem>
    );
};

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
                    renderItem={(item: TreeItem | null) => {
                        if (!item) return null;

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
                >
                    {filteredTreeItems.map((item) => (
                        <TreeItemNode key={item.type === "demo" ? item.demo.id : item.title} item={item} />
                    ))}
                </GtkListView>
            </GtkScrolledWindow>
        </GtkBox>
    );
};
