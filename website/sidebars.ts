import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebars: SidebarsConfig = {
    docsSidebar: [
        "introduction",
        "getting-started",
        {
            type: "category",
            label: "Guides",
            items: ["guides/components", "guides/events", "guides/dialogs", "guides/lists"],
        },
        "architecture",
        "contributing",
    ],
};

export default sidebars;
