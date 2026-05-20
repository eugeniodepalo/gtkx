import { createRequire } from "node:module";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { ConnectionManager } from "./connection-manager.js";
import { DEFAULT_SOCKET_PATH } from "./protocol/types.js";
import { SocketServer } from "./socket-server.js";

const require = createRequire(import.meta.url);
const { version } = require("../package.json") as { version: string };

const APP_ID_DESCRIPTION = "App ID to query. If not specified, uses the first connected app.";
const WIDGET_ID_DESCRIPTION = "Widget ID";

const appIdField = z.string().optional().describe(APP_ID_DESCRIPTION);
const widgetIdField = z.string().describe(WIDGET_ID_DESCRIPTION);

const appIdShape = { appId: appIdField };
const widgetIdShape = { ...appIdShape, widgetId: widgetIdField };

const listAppsShape = {
    waitForApps: z
        .boolean()
        .optional()
        .describe(
            "If true, wait for at least one app to register before returning. Useful when app is still starting.",
        ),
    timeout: z.number().optional().describe("Timeout in milliseconds when waitForApps is true (default: 10000)"),
};

const queryWidgetsShape = {
    ...appIdShape,
    by: z.enum(["role", "text", "name", "labelText"]).describe("Query type"),
    value: z.union([z.string(), z.number()]).describe("Value to search for"),
    options: z
        .object({
            name: z.string().optional(),
            exact: z.boolean().optional(),
            timeout: z.number().optional(),
        })
        .optional()
        .describe("Additional query options"),
};

const typeShape = {
    ...widgetIdShape,
    text: z.string().describe("Text to type"),
    clear: z.boolean().optional().describe("Clear existing text before typing"),
};

const fireEventShape = {
    ...widgetIdShape,
    signal: z.string().describe("GTK signal name to emit"),
    args: z.array(z.unknown()).optional().describe("Arguments to pass to the signal"),
};

const screenshotShape = {
    ...appIdShape,
    windowId: z.string().optional().describe("Window ID to capture. If not specified, captures the first window."),
};

const textContent = (text: string) => ({ content: [{ type: "text" as const, text }] });

const textError = (text: string) => ({
    content: [{ type: "text" as const, text }],
    isError: true,
});

const imageContent = (data: string, mimeType: string) => ({
    content: [{ type: "image" as const, data, mimeType }],
});

/**
 * Narrow view of {@link ConnectionManager} consumed by the tool handlers. Each
 * tool needs only app discovery (`getApps`, `hasConnectedApps`, `waitForApp`)
 * and request forwarding (`sendToApp`).
 */
export type AppQueryClient = Pick<ConnectionManager, "getApps" | "hasConnectedApps" | "waitForApp" | "sendToApp">;

/**
 * Result envelope every tool handler returns to the MCP SDK.
 */
type ToolHandlerResult = {
    content: Array<{ type: "text"; text: string } | { type: "image"; data: string; mimeType: string }>;
    isError?: boolean;
};

/**
 * Maps a Zod raw shape to the inferred argument record consumed by a tool
 * handler.
 *
 * @typeParam Shape - The Zod raw shape used as the tool's `inputSchema`.
 */
export type ToolArgs<Shape extends z.ZodRawShape> = { [K in keyof Shape]: z.infer<Shape[K]> };

/**
 * A registered MCP tool — name, MCP config, and a Zod-typed handler.
 *
 * @typeParam Shape - The Zod raw shape used as the tool's `inputSchema`.
 */
export type ToolDefinition<Shape extends z.ZodRawShape = z.ZodRawShape> = {
    name: string;
    config: { description: string; inputSchema: Shape };
    handler: (args: ToolArgs<Shape>) => Promise<ToolHandlerResult>;
};

/**
 * Identity wrapper that lets the handler signature be inferred from
 * `inputSchema` instead of redeclared at the call site.
 *
 * @typeParam Shape - The Zod raw shape used as the tool's `inputSchema`.
 * @param tool - The tool definition.
 * @returns The same `tool` value, but with the handler argument type pinned to
 *   the inferred shape.
 */
const defineTool = <Shape extends z.ZodRawShape>(tool: ToolDefinition<Shape>): ToolDefinition<Shape> => tool;

type ForwardSpec<Shape extends z.ZodRawShape> = {
    name: string;
    description: string;
    inputSchema: Shape;
    cm: AppQueryClient;
    method: string;
    params?: (args: ToolArgs<Shape>) => unknown;
};

const buildForwardParams = <Shape extends z.ZodRawShape>(
    args: ToolArgs<Shape>,
    custom: ForwardSpec<Shape>["params"],
): { appId: string | undefined; params: unknown } => {
    const { appId, ...rest } = args as ToolArgs<Shape> & { appId?: string };
    return { appId, params: custom ? custom(args) : rest };
};

const forwardJson = <Shape extends z.ZodRawShape>(spec: ForwardSpec<Shape>): ToolDefinition<Shape> =>
    defineTool({
        name: spec.name,
        config: { description: spec.description, inputSchema: spec.inputSchema },
        handler: async (args) => {
            const { appId, params } = buildForwardParams(args, spec.params);
            const result = await spec.cm.sendToApp(appId, spec.method, params);
            return textContent(JSON.stringify(result, null, 2));
        },
    });

const forwardAck = <Shape extends z.ZodRawShape>(spec: ForwardSpec<Shape> & { ack: string }): ToolDefinition<Shape> =>
    defineTool({
        name: spec.name,
        config: { description: spec.description, inputSchema: spec.inputSchema },
        handler: async (args) => {
            const { appId, params } = buildForwardParams(args, spec.params);
            await spec.cm.sendToApp(appId, spec.method, params);
            return textContent(spec.ack);
        },
    });

const forwardImage = <Shape extends z.ZodRawShape>(spec: ForwardSpec<Shape>): ToolDefinition<Shape> =>
    defineTool({
        name: spec.name,
        config: { description: spec.description, inputSchema: spec.inputSchema },
        handler: async (args) => {
            const { appId, params } = buildForwardParams(args, spec.params);
            const result = await spec.cm.sendToApp<{ data: string; mimeType: string }>(appId, spec.method, params);
            return imageContent(result.data, result.mimeType);
        },
    });

const listAppsTool = (cm: AppQueryClient) =>
    defineTool({
        name: "gtkx_list_apps",
        config: {
            description: "List all connected GTKX applications",
            inputSchema: listAppsShape,
        },
        handler: async ({ waitForApps, timeout }) => {
            if (waitForApps && !cm.hasConnectedApps()) {
                try {
                    await cm.waitForApp(timeout);
                } catch (error) {
                    return textError(error instanceof Error ? error.message : "Timeout waiting for app");
                }
            }

            const apps = cm.getApps();
            const appsWithWindows = await Promise.all(
                apps.map(async (app) => {
                    try {
                        const result = await cm.sendToApp<{
                            windows: Array<{ id: string; title: string | null }>;
                        }>(app.appId, "app.getWindows", {});
                        return { ...app, windows: result.windows };
                    } catch {
                        return app;
                    }
                }),
            );
            return textContent(JSON.stringify(appsWithWindows, null, 2));
        },
    });

const getWidgetTreeTool = (cm: AppQueryClient) =>
    defineTool({
        name: "gtkx_get_widget_tree",
        config: {
            description:
                "Get the widget hierarchy for a connected GTKX app. Returns a tree of all widgets with their IDs, types, roles, and properties.",
            inputSchema: appIdShape,
        },
        handler: async ({ appId }) => {
            const result = await cm.sendToApp<{ tree: string }>(appId, "widget.getTree", {});
            return textContent(result.tree);
        },
    });

/**
 * Builds the GTKX MCP tool definitions, ready to be registered on a server.
 *
 * Exposed so tests can drive each tool handler against a fake
 * {@link ConnectionManager} without spinning up a real socket server.
 *
 * @param cm - Connection manager that proxies tool requests to the connected
 *   GTKX application.
 * @returns Array of tool definitions in registration order.
 */
export function buildTools(cm: AppQueryClient): ToolDefinition[] {
    return [
        listAppsTool(cm),
        getWidgetTreeTool(cm),
        forwardJson({
            name: "gtkx_query_widgets",
            description:
                "Find widgets by role, text, name, or label. Returns matching widgets with their IDs and properties.",
            inputSchema: queryWidgetsShape,
            cm,
            method: "widget.query",
            params: ({ by, value, options }) => ({ queryType: by, value, options }),
        }),
        forwardJson({
            name: "gtkx_get_widget_props",
            description: "Get all properties of a specific widget by its ID",
            inputSchema: widgetIdShape,
            cm,
            method: "widget.getProps",
        }),
        forwardAck({
            name: "gtkx_click",
            description: "Click a widget. Works with buttons, checkboxes, and other interactive widgets.",
            inputSchema: widgetIdShape,
            cm,
            method: "widget.click",
            ack: "Click successful",
        }),
        forwardAck({
            name: "gtkx_type",
            description: "Type text into an editable widget like Entry or TextView",
            inputSchema: typeShape,
            cm,
            method: "widget.type",
            ack: "Type successful",
        }),
        forwardAck({
            name: "gtkx_fire_event",
            description: "Emit a GTK signal on a widget. Use this for custom interactions.",
            inputSchema: fireEventShape,
            cm,
            method: "widget.fireEvent",
            ack: "Event fired successfully",
        }),
        forwardImage({
            name: "gtkx_take_screenshot",
            description: "Capture a screenshot of a window. Returns base64-encoded PNG image data.",
            inputSchema: screenshotShape,
            cm,
            method: "widget.screenshot",
        }),
    ] as unknown as ToolDefinition[];
}

/**
 * Bootstraps the GTKX MCP server.
 *
 * Starts the Unix-domain socket server, wires the connection manager and the
 * MCP SDK server, registers every tool returned by {@link buildTools}, and
 * installs SIGINT/SIGTERM handlers for graceful shutdown.
 */
export async function main() {
    const socketServer = new SocketServer(DEFAULT_SOCKET_PATH);
    const connectionManager = new ConnectionManager(socketServer);

    socketServer.on("error", (error) => {
        const code = (error as NodeJS.ErrnoException).code;
        if (code !== "EPIPE" && code !== "ECONNRESET") {
            console.error("[gtkx] Socket error:", error.message);
        }
    });

    await socketServer.start();
    console.error(`[gtkx] Socket server listening on ${DEFAULT_SOCKET_PATH}`);

    connectionManager.on("appRegistered", (appInfo) => {
        console.error(`[gtkx] App registered: ${appInfo.appId} (PID: ${appInfo.pid})`);
    });

    connectionManager.on("appUnregistered", (appId) => {
        console.error(`[gtkx] App unregistered: ${appId}`);
    });

    const mcpServer = new McpServer({
        name: "gtkx-mcp",
        version,
    });

    for (const tool of buildTools(connectionManager)) {
        mcpServer.registerTool(tool.name, tool.config, tool.handler as never);
    }

    const transport = new StdioServerTransport();
    await mcpServer.connect(transport);

    let isShuttingDown = false;
    const shutdown = async () => {
        if (isShuttingDown) return;
        isShuttingDown = true;
        try {
            connectionManager.cleanup();
            await socketServer.stop();
            await mcpServer.close();
        } finally {
            process.exit(0);
        }
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
}
