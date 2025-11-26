import type * as Preset from "@docusaurus/preset-classic";
import type { Config } from "@docusaurus/types";
import { themes as prismThemes } from "prism-react-renderer";

const config: Config = {
    title: "GTKX",
    tagline: "Build GTK4 desktop applications with React and TypeScript",
    favicon: "img/favicon.ico",

    future: {
        v4: true,
    },

    url: "https://eugeniodepalo.github.io",
    baseUrl: "/gtkx/",

    organizationName: "eugeniodepalo",
    projectName: "gtkx",
    trailingSlash: false,

    onBrokenLinks: "warn",

    markdown: {
        hooks: {
            onBrokenMarkdownLinks: "warn",
        },
    },

    i18n: {
        defaultLocale: "en",
        locales: ["en"],
    },

    presets: [
        [
            "classic",
            {
                docs: {
                    sidebarPath: "./sidebars.ts",
                    editUrl: "https://github.com/eugeniodepalo/gtkx/tree/main/website/",
                },
                blog: false,
                theme: {
                    customCss: "./src/css/custom.css",
                },
            } satisfies Preset.Options,
        ],
    ],

    plugins: [
        [
            "docusaurus-plugin-typedoc",
            {
                entryPoints: ["../packages/gtkx/src/index.ts"],
                tsconfig: "../packages/gtkx/tsconfig.lib.json",
                out: "docs/api",
                readme: "none",
                sidebar: {
                    autoConfiguration: true,
                    pretty: true,
                },
                plugin: ["typedoc-plugin-frontmatter"],
                frontmatterGlobals: {
                    displayed_sidebar: "apiSidebar",
                },
                textContentMappings: {
                    "title.indexPage": "API Reference",
                    "title.memberPage": "{name}",
                },
                parametersFormat: "table",
                enumMembersFormat: "table",
                indexFormat: "table",
                expandObjects: true,
                useCodeBlocks: true,
            },
        ],
    ],

    themeConfig: {
        image: "img/social-card.png",
        colorMode: {
            respectPrefersColorScheme: true,
        },
        navbar: {
            title: "GTKX",
            logo: {
                alt: "GTKX Logo",
                src: "img/logo.svg",
            },
            items: [
                {
                    type: "docSidebar",
                    sidebarId: "docsSidebar",
                    position: "left",
                    label: "Docs",
                },
                {
                    to: "/docs/api",
                    position: "left",
                    label: "API",
                },
                {
                    href: "https://github.com/eugeniodepalo/gtkx",
                    label: "GitHub",
                    position: "right",
                },
            ],
        },
        footer: {
            style: "dark",
            links: [
                {
                    title: "Docs",
                    items: [
                        {
                            label: "Getting Started",
                            to: "/docs/getting-started",
                        },
                        {
                            label: "API Reference",
                            to: "/docs/api",
                        },
                    ],
                },
                {
                    title: "Learn",
                    items: [
                        {
                            label: "Architecture",
                            to: "/docs/architecture",
                        },
                        {
                            label: "Contributing",
                            to: "/docs/contributing",
                        },
                    ],
                },
                {
                    title: "More",
                    items: [
                        {
                            label: "GitHub",
                            href: "https://github.com/eugeniodepalo/gtkx",
                        },
                        {
                            label: "llms.txt",
                            href: "pathname:///llms.txt",
                        },
                    ],
                },
            ],
            copyright: `Copyright ${new Date().getFullYear()} Eugenio Depalo.`,
        },
        prism: {
            theme: prismThemes.github,
            darkTheme: prismThemes.dracula,
            additionalLanguages: ["bash", "tsx", "typescript"],
        },
    } satisfies Preset.ThemeConfig,
};

export default config;
