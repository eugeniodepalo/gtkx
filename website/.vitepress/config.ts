import { defineConfig } from "vitepress";

export default defineConfig({
    title: "GTKX",
    description: "Linux application development for the modern age powered by GTK4 and React",
    appearance: "force-dark",
    head: [["link", { rel: "icon", href: "/favicon.svg" }]],
    themeConfig: {
        logo: "/logo.svg",
        nav: [
            {
                text: "Docs",
                link: "/docs/introduction",
                activeMatch: "^/docs/",
            },
            {
                text: "API",
                link: "/api/react/",
                activeMatch: "^/api/",
            },
        ],
        socialLinks: [{ icon: "github", link: "https://github.com/gtkx-org/gtkx" }],
        sidebar: {
            "/docs/": [
                {
                    text: "Introduction",
                    link: "/docs/introduction",
                },
                {
                    text: "Getting Started",
                    link: "/docs/getting-started",
                },
                {
                    text: "Core Concepts",
                    collapsed: false,
                    items: [
                        { text: "FFI Bindings", link: "/docs/ffi-bindings" },
                        { text: "Styling and CSS", link: "/docs/styling" },
                        { text: "Portals", link: "/docs/portals" },
                        { text: "Testing", link: "/docs/testing" },
                    ],
                },
                {
                    text: "Tutorial: Building a Notes App",
                    collapsed: false,
                    items: [
                        { text: "1. Window & Header Bar", link: "/docs/tutorial/1-window-and-header-bar" },
                        { text: "2. Styling with CSS-in-JS", link: "/docs/tutorial/2-styling" },
                        { text: "3. Lists & Data", link: "/docs/tutorial/3-lists" },
                        { text: "4. Menus & Shortcuts", link: "/docs/tutorial/4-menus-and-shortcuts" },
                        { text: "5. Navigation & Split Views", link: "/docs/tutorial/5-navigation" },
                        { text: "6. Dialogs & Animations", link: "/docs/tutorial/6-dialogs-and-animations" },
                        { text: "7. Deploying", link: "/docs/tutorial/7-deploying" },
                    ],
                },
                {
                    text: "Reference",
                    collapsed: true,
                    items: [
                        { text: "CLI", link: "/docs/cli" },
                        { text: "MCP", link: "/docs/mcp" },
                    ],
                },
            ],
            "/api/": [
                {
                    text: "@gtkx/react",
                    link: "/api/react/",
                },
                {
                    text: "@gtkx/css",
                    link: "/api/css/",
                },
                {
                    text: "@gtkx/testing",
                    link: "/api/testing/",
                },
                {
                    text: "@gtkx/ffi",
                    link: "/api/ffi/",
                },
            ],
        },
        search: {
            provider: "local",
        },
        editLink: {
            pattern: "https://github.com/gtkx-org/gtkx/edit/main/website/:path",
        },
        footer: {
            message: '<img src="/logo.svg" alt="GTKX" class="footer-logo">',
            copyright: `Copyright \u00A9 ${new Date().getFullYear()} the GTKX team`,
        },
    },
});
