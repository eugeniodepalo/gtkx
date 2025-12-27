import * as Gtk from "@gtkx/ffi/gtk";
import { GtkBox, GtkButton, GtkLabel, GtkNotebook, NotebookPage } from "@gtkx/react";
import { useState } from "react";
import type { Demo } from "../types.js";

const sourceCode = `import * as Gtk from "@gtkx/ffi/gtk";
import { GtkBox, GtkButton, GtkLabel, GtkNotebook, NotebookPage } from "@gtkx/react";
import { useState } from "react";

const NotebookDemo = () => {
    const [currentPage, setCurrentPage] = useState(0);
    const [tabs, setTabs] = useState([
        { id: 1, title: "Tab 1", content: "Content for Tab 1" },
        { id: 2, title: "Tab 2", content: "Content for Tab 2" },
        { id: 3, title: "Tab 3", content: "Content for Tab 3" },
    ]);

    return (
        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={20}>
            <GtkNotebook page={currentPage} onSwitchPage={(_self, _page, pageNum) => setCurrentPage(pageNum)}>
                {tabs.map((tab) => (
                    <NotebookPage key={tab.id} label={tab.title}>
                        <GtkBox orientation={Gtk.Orientation.VERTICAL} margin={20}>
                            <GtkLabel label={tab.content} />
                        </GtkBox>
                    </NotebookPage>
                ))}
            </GtkNotebook>
        </GtkBox>
    );
};`;

interface Tab {
    id: number;
    title: string;
    content: string;
}

const NotebookDemo = () => {
    const [currentPage, setCurrentPage] = useState(0);
    const [tabs, setTabs] = useState<Tab[]>([
        { id: 1, title: "Home", content: "Welcome to the Home tab. This is the main content area." },
        { id: 2, title: "Settings", content: "Configure your application settings here." },
        { id: 3, title: "Help", content: "Find help and documentation in this tab." },
    ]);
    const [nextId, setNextId] = useState(4);

    const addTab = () => {
        const newTab = {
            id: nextId,
            title: `Tab ${nextId}`,
            content: `This is the content for Tab ${nextId}.`,
        };
        setTabs([...tabs, newTab]);
        setNextId(nextId + 1);
        // Switch to the new tab
        setCurrentPage(tabs.length);
    };

    const removeTab = (id: number) => {
        const index = tabs.findIndex((t) => t.id === id);
        if (tabs.length > 1) {
            setTabs(tabs.filter((t) => t.id !== id));
            // Adjust current page if needed
            if (currentPage >= tabs.length - 1) {
                setCurrentPage(Math.max(0, tabs.length - 2));
            } else if (currentPage > index) {
                setCurrentPage(currentPage - 1);
            }
        }
    };

    return (
        <GtkBox
            orientation={Gtk.Orientation.VERTICAL}
            spacing={20}
            marginStart={20}
            marginEnd={20}
            marginTop={20}
            marginBottom={20}
        >
            <GtkLabel label="Notebook" cssClasses={["title-2"]} halign={Gtk.Align.START} />

            {/* About Notebook */}
            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                <GtkLabel label="About Notebook" cssClasses={["heading"]} halign={Gtk.Align.START} />
                <GtkLabel
                    label="GtkNotebook is a container that shows one page at a time with tabs for switching. Use NotebookPage to define each tab with its label and content."
                    wrap
                    cssClasses={["dim-label"]}
                    halign={Gtk.Align.START}
                />
            </GtkBox>

            {/* Basic Notebook */}
            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                <GtkLabel label="Basic Notebook" cssClasses={["heading"]} halign={Gtk.Align.START} />
                <GtkLabel
                    label="Click tabs to switch between pages."
                    wrap
                    cssClasses={["dim-label"]}
                    halign={Gtk.Align.START}
                />
                <GtkNotebook cssClasses={["card"]}>
                    <NotebookPage label="Overview">
                        <GtkBox
                            orientation={Gtk.Orientation.VERTICAL}
                            spacing={8}
                            marginStart={16}
                            marginEnd={16}
                            marginTop={16}
                            marginBottom={16}
                        >
                            <GtkLabel label="Overview" cssClasses={["title-3"]} halign={Gtk.Align.START} />
                            <GtkLabel
                                label="This is the overview page. Notebooks are useful for organizing content into separate pages that users can switch between."
                                wrap
                                cssClasses={["dim-label"]}
                                halign={Gtk.Align.START}
                            />
                        </GtkBox>
                    </NotebookPage>
                    <NotebookPage label="Details">
                        <GtkBox
                            orientation={Gtk.Orientation.VERTICAL}
                            spacing={8}
                            marginStart={16}
                            marginEnd={16}
                            marginTop={16}
                            marginBottom={16}
                        >
                            <GtkLabel label="Details" cssClasses={["title-3"]} halign={Gtk.Align.START} />
                            <GtkLabel
                                label="This is the details page. Each tab can contain completely different content and widgets."
                                wrap
                                cssClasses={["dim-label"]}
                                halign={Gtk.Align.START}
                            />
                        </GtkBox>
                    </NotebookPage>
                    <NotebookPage label="Actions">
                        <GtkBox
                            orientation={Gtk.Orientation.VERTICAL}
                            spacing={8}
                            marginStart={16}
                            marginEnd={16}
                            marginTop={16}
                            marginBottom={16}
                        >
                            <GtkLabel label="Actions" cssClasses={["title-3"]} halign={Gtk.Align.START} />
                            <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={8}>
                                <GtkButton label="Save" cssClasses={["suggested-action"]} />
                                <GtkButton label="Cancel" />
                            </GtkBox>
                        </GtkBox>
                    </NotebookPage>
                </GtkNotebook>
            </GtkBox>

            {/* Dynamic Tabs */}
            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                <GtkLabel label="Dynamic Tabs" cssClasses={["heading"]} halign={Gtk.Align.START} />
                <GtkLabel
                    label="Tabs can be added and removed dynamically with React state."
                    wrap
                    cssClasses={["dim-label"]}
                    halign={Gtk.Align.START}
                />
                <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={8}>
                    <GtkButton label="Add Tab" onClicked={addTab} cssClasses={["suggested-action"]} />
                    <GtkLabel label={`${tabs.length} tabs`} cssClasses={["dim-label"]} valign={Gtk.Align.CENTER} />
                </GtkBox>
                <GtkNotebook
                    page={currentPage}
                    onSwitchPage={(_self, _page, pageNum) => setCurrentPage(pageNum)}
                    cssClasses={["card"]}
                >
                    {tabs.map((tab) => (
                        <NotebookPage key={tab.id} label={tab.title}>
                            <GtkBox
                                orientation={Gtk.Orientation.VERTICAL}
                                spacing={12}
                                marginStart={16}
                                marginEnd={16}
                                marginTop={16}
                                marginBottom={16}
                            >
                                <GtkLabel label={tab.title} cssClasses={["title-3"]} halign={Gtk.Align.START} />
                                <GtkLabel
                                    label={tab.content}
                                    wrap
                                    cssClasses={["dim-label"]}
                                    halign={Gtk.Align.START}
                                />
                                <GtkButton
                                    label={`Close ${tab.title}`}
                                    onClicked={() => removeTab(tab.id)}
                                    cssClasses={["destructive-action"]}
                                    halign={Gtk.Align.START}
                                    sensitive={tabs.length > 1}
                                />
                            </GtkBox>
                        </NotebookPage>
                    ))}
                </GtkNotebook>
            </GtkBox>

            {/* Tab Positions */}
            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                <GtkLabel label="Tab Position" cssClasses={["heading"]} halign={Gtk.Align.START} />
                <GtkLabel
                    label="Tabs can be positioned at top, bottom, left, or right using tabPos prop."
                    wrap
                    cssClasses={["dim-label"]}
                    halign={Gtk.Align.START}
                />
                <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={12}>
                    <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={4} hexpand>
                        <GtkLabel label="Left Tabs" cssClasses={["dim-label"]} />
                        <GtkNotebook tabPos={Gtk.PositionType.LEFT} cssClasses={["card"]} heightRequest={120}>
                            <NotebookPage label="A">
                                <GtkLabel label="Page A" marginStart={12} marginEnd={12} />
                            </NotebookPage>
                            <NotebookPage label="B">
                                <GtkLabel label="Page B" marginStart={12} marginEnd={12} />
                            </NotebookPage>
                        </GtkNotebook>
                    </GtkBox>
                    <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={4} hexpand>
                        <GtkLabel label="Bottom Tabs" cssClasses={["dim-label"]} />
                        <GtkNotebook tabPos={Gtk.PositionType.BOTTOM} cssClasses={["card"]} heightRequest={120}>
                            <NotebookPage label="A">
                                <GtkLabel label="Page A" />
                            </NotebookPage>
                            <NotebookPage label="B">
                                <GtkLabel label="Page B" />
                            </NotebookPage>
                        </GtkNotebook>
                    </GtkBox>
                </GtkBox>
            </GtkBox>

            {/* Controlled Page */}
            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                <GtkLabel label="Controlled Page" cssClasses={["heading"]} halign={Gtk.Align.START} />
                <GtkLabel
                    label="The current page can be controlled programmatically."
                    wrap
                    cssClasses={["dim-label"]}
                    halign={Gtk.Align.START}
                />
                <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={8}>
                    <GtkButton label="Go to Tab 1" onClicked={() => setCurrentPage(0)} />
                    <GtkButton label="Go to Tab 2" onClicked={() => setCurrentPage(1)} />
                    <GtkButton label="Go to Tab 3" onClicked={() => setCurrentPage(2)} />
                </GtkBox>
                <GtkLabel label={`Current page index: ${currentPage}`} cssClasses={["dim-label"]} />
            </GtkBox>

            {/* Properties */}
            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                <GtkLabel label="Key Properties" cssClasses={["heading"]} halign={Gtk.Align.START} />
                <GtkLabel
                    label="page: Current page index (0-based). tabPos: Position of tabs (TOP, BOTTOM, LEFT, RIGHT). showTabs: Show or hide the tab labels. scrollable: Allow scrolling when many tabs. onSwitchPage: Callback when page changes."
                    wrap
                    cssClasses={["dim-label"]}
                    halign={Gtk.Align.START}
                />
            </GtkBox>
        </GtkBox>
    );
};

export const notebookDemo: Demo = {
    id: "notebook",
    title: "Notebook",
    description: "Tabbed container that shows one page at a time.",
    keywords: ["notebook", "tabs", "pages", "tabbed", "switch", "GtkNotebook"],
    component: NotebookDemo,
    sourceCode,
};
