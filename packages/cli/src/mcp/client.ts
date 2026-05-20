import * as net from "node:net";
import * as Gio from "@gtkx/ffi/gio";
import * as Gtk from "@gtkx/ffi/gtk";
import {
    DEFAULT_SOCKET_PATH,
    type IpcRequest,
    IpcRequestSchema,
    type IpcResponse,
    IpcResponseSchema,
    McpError,
    McpErrorCode,
} from "@gtkx/mcp";
import { dispatch } from "./handlers.js";
import { WidgetRegistry } from "./widget-registry.js";

/**
 * Options for constructing an {@link McpClient}.
 */
export type McpClientOptions = {
    /** Socket path to connect to; defaults to `@gtkx/mcp`'s {@link DEFAULT_SOCKET_PATH}. */
    socketPath?: string;
    /** The GTK application ID the client should register with. */
    appId: string;
};

type PendingRequest = {
    resolve: (result: unknown) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
};

const RECONNECT_DELAY_MS = 2000;
const REQUEST_TIMEOUT_MS = 30000;

/**
 * Newline-delimited JSON transport that connects a GTKX app to the MCP
 * socket server.
 *
 * Responsibilities are limited to the socket lifecycle (connect, reconnect,
 * disconnect), the wire framing (newline-delimited JSON), request/response
 * correlation (UUID-keyed pending map), and handing incoming requests off
 * to {@link dispatch}. Domain behavior — widget identity, handler
 * implementations — lives in sibling modules.
 */
export class McpClient {
    private socket: net.Socket | null = null;
    private buffer = "";
    private readonly socketPath: string;
    private readonly appId: string;
    private reconnectTimer: NodeJS.Timeout | null = null;
    private hasConnected = false;
    private isStopping = false;
    private readonly pendingRequests = new Map<string, PendingRequest>();
    private readonly registry = new WidgetRegistry();

    constructor(options: McpClientOptions) {
        this.socketPath = options.socketPath ?? DEFAULT_SOCKET_PATH;
        this.appId = options.appId;
    }

    /**
     * Establishes the initial connection and registers this app with the
     * MCP server. Subsequent disconnects are handled transparently by the
     * built-in reconnect timer.
     */
    async connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.attemptConnect(resolve, reject);
        });
    }

    /**
     * Tears down the socket and cancels any pending reconnect timer.
     */
    disconnect(): void {
        this.isStopping = true;
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        this.rejectPendingRequests(new Error("Client disconnected"));
        if (this.socket) {
            this.send({ id: crypto.randomUUID(), method: "app.unregister" });
            this.socket.destroy();
            this.socket = null;
        }
        this.hasConnected = false;
    }

    private attemptConnect(onSuccess?: () => void, onError?: (error: Error) => void): void {
        let settled = false;

        const settle = <T extends unknown[]>(callback: ((...args: T) => void) | undefined, ...args: T) => {
            if (settled) return;
            settled = true;
            callback?.(...args);
        };

        this.socket = net.createConnection(this.socketPath, () => {
            console.log(`[gtkx] Connected to MCP server at ${this.socketPath}`);
            this.hasConnected = true;
            this.register()
                .then(() => {
                    console.log("[gtkx] Registered with MCP server");
                    settle(onSuccess);
                })
                .catch((error) => {
                    console.error("[gtkx] Failed to register with MCP server:", error.message);
                    settle(onError, error instanceof Error ? error : new Error(String(error)));
                });
        });

        this.socket.on("data", (data: Buffer) => this.handleData(data));

        this.socket.on("close", () => {
            if (this.hasConnected) {
                console.log("[gtkx] Disconnected from MCP server");
                this.hasConnected = false;
            }
            this.socket = null;
            this.rejectPendingRequests(new Error("Connection closed"));
            this.scheduleReconnect();
        });

        this.socket.on("error", (error) => {
            const code = (error as NodeJS.ErrnoException).code;
            const isDisconnectError =
                code === "ENOENT" || code === "ECONNREFUSED" || code === "EPIPE" || code === "ECONNRESET";
            if (isDisconnectError) {
                this.scheduleReconnect();
            } else {
                console.error("[gtkx] Socket error:", error.message);
            }
            settle(onError, error);
        });
    }

    private scheduleReconnect(): void {
        if (this.reconnectTimer || this.isStopping) return;
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.attemptConnect();
        }, RECONNECT_DELAY_MS);
    }

    private rejectPendingRequests(error: Error): void {
        for (const pending of this.pendingRequests.values()) {
            clearTimeout(pending.timeout);
            pending.reject(error);
        }
        this.pendingRequests.clear();
    }

    private async register(): Promise<void> {
        await this.sendRequest("app.register", {
            appId: this.appId,
            pid: process.pid,
        });
    }

    private send(message: IpcRequest | IpcResponse): void {
        if (!this.socket?.writable) return;
        this.socket.write(`${JSON.stringify(message)}\n`);
    }

    private sendRequest(method: string, params?: unknown): Promise<unknown> {
        return new Promise((resolve, reject) => {
            if (!this.socket?.writable) {
                reject(new Error("Socket not connected"));
                return;
            }

            const id = crypto.randomUUID();
            const timeout = setTimeout(() => {
                this.pendingRequests.delete(id);
                reject(new Error(`Request timed out: ${method}`));
            }, REQUEST_TIMEOUT_MS);

            this.pendingRequests.set(id, { resolve, reject, timeout });
            this.send({ id, method, params });
        });
    }

    private handleData(data: Buffer): void {
        this.buffer += data.toString();

        let newlineIndex = this.buffer.indexOf("\n");
        while (newlineIndex !== -1) {
            const line = this.buffer.slice(0, newlineIndex);
            this.buffer = this.buffer.slice(newlineIndex + 1);

            if (line.trim()) {
                this.processMessage(line);
            }
            newlineIndex = this.buffer.indexOf("\n");
        }
    }

    private processMessage(line: string): void {
        let parsed: unknown;
        try {
            parsed = JSON.parse(line);
        } catch {
            console.warn("[gtkx] Received invalid JSON from MCP server");
            return;
        }

        const responseResult = IpcResponseSchema.safeParse(parsed);
        if (responseResult.success) {
            const response = responseResult.data;
            const pending = this.pendingRequests.get(response.id);
            if (pending) {
                clearTimeout(pending.timeout);
                this.pendingRequests.delete(response.id);
                if (response.error) {
                    pending.reject(new Error(response.error.message));
                } else {
                    pending.resolve(response.result);
                }
                return;
            }
        }

        const requestResult = IpcRequestSchema.safeParse(parsed);
        if (!requestResult.success) {
            return;
        }

        this.handleRequest(requestResult.data).catch((error) => {
            console.error("[gtkx] Error handling request:", error);
        });
    }

    private async handleRequest(request: IpcRequest): Promise<void> {
        const { id, method, params } = request;

        try {
            const defaultApp = Gio.Application.getDefault();
            if (!(defaultApp instanceof Gtk.Application)) {
                throw new TypeError("Application not initialized");
            }
            this.registry.refresh();
            const result = await dispatch(method, params, { app: defaultApp, registry: this.registry });
            this.send({ id, result });
        } catch (error) {
            if (error instanceof McpError) {
                this.send({ id, error: error.toIpcError() });
            } else {
                const message = error instanceof Error ? error.message : String(error);
                this.send({
                    id,
                    error: {
                        code: McpErrorCode.INTERNAL_ERROR,
                        message,
                    },
                });
            }
        }
    }
}
