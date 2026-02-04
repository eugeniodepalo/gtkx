#!/usr/bin/env node

import "./refresh-runtime.js";

import { createRequire } from "node:module";
import { resolve } from "node:path";
import { events } from "@gtkx/ffi";
import type * as Gio from "@gtkx/ffi/gio";
import { render } from "@gtkx/react";
import { defineCommand, runMain } from "citty";
import { build } from "./builder.js";
import { createApp } from "./create.js";
import { createDevServer } from "./dev-server.js";
import { startMcpClient, stopMcpClient } from "./mcp-client.js";

const require = createRequire(import.meta.url);
const { version } = require("../package.json") as { version: string };

interface AppModule {
    default: () => React.ReactNode;
    appId?: string;
    appFlags?: Gio.ApplicationFlags;
}

const dev = defineCommand({
    meta: {
        name: "dev",
        description: "Start development server with HMR",
    },
    args: {
        entry: {
            type: "positional",
            description: "Entry file (e.g., src/app.tsx)",
            required: true,
        },
    },
    async run({ args }) {
        const entryPath = resolve(process.cwd(), args.entry);
        console.log(`[gtkx] Starting dev server for ${entryPath}`);

        const server = await createDevServer({
            entry: entryPath,
            vite: {
                root: process.cwd(),
            },
        });

        const mod = (await server.ssrLoadModule(entryPath)) as AppModule;
        const App = mod.default;
        const appId = mod.appId ?? "org.gtkx.dev";
        const appFlags = mod.appFlags;

        if (typeof App !== "function") {
            console.error("[gtkx] Entry file must export a default function component");
            process.exit(1);
        }

        console.log(`[gtkx] Rendering app with ID: ${appId}`);
        render(<App />, appId, appFlags);

        await startMcpClient(appId);
        events.on("stop", () => {
            stopMcpClient();
        });

        console.log("[gtkx] HMR enabled - watching for changes...");
    },
});

const buildCmd = defineCommand({
    meta: {
        name: "build",
        description: "Build application for production",
    },
    args: {
        entry: {
            type: "positional",
            description: "Entry file (default: src/index.tsx)",
            required: false,
        },
        "asset-base": {
            type: "string",
            description: "Asset base path relative to executable directory (e.g., ../share/my-app)",
        },
    },
    async run({ args }) {
        const entry = resolve(process.cwd(), args.entry ?? "src/index.tsx");
        console.log(`[gtkx] Building ${entry}`);

        await build({
            entry,
            assetBase: args["asset-base"],
            vite: {
                root: process.cwd(),
            },
        });

        console.log("[gtkx] Build complete: dist/bundle.js");
    },
});

const create = defineCommand({
    meta: {
        name: "create",
        description: "Create a new GTKX application",
    },
    args: {
        name: {
            type: "positional",
            description: "Project name",
            required: false,
        },
        "app-id": {
            type: "string",
            description: "App ID (e.g., com.example.myapp)",
        },
        pm: {
            type: "string",
            description: "Package manager (pnpm, npm, yarn)",
        },
        testing: {
            type: "string",
            description: "Testing setup (vitest, none)",
        },
        "claude-skills": {
            type: "boolean",
            description: "Include Claude Code skills for AI assistance",
        },
    },
    async run({ args }) {
        await createApp({
            name: args.name,
            appId: args["app-id"],
            packageManager: args.pm as "pnpm" | "npm" | "yarn" | undefined,
            testing: args.testing as "vitest" | "none" | undefined,
            claudeSkills: args["claude-skills"],
        });
    },
});

const main = defineCommand({
    meta: {
        name: "gtkx",
        version,
        description: "CLI for GTKX - create and develop GTK4 React applications",
    },
    subCommands: {
        dev,
        build: buildCmd,
        create,
    },
});

runMain(main);
