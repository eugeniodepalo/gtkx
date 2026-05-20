import EventEmitter from "node:events";
import * as fs from "node:fs";
import * as net from "node:net";
import { DEFAULT_SOCKET_PATH, type IpcMessage } from "./protocol/types.js";
import { type AppConnection, type AppTransport, type AppTransportEvents, JsonStreamTransport } from "./transport.js";

/**
 * Unix-domain socket server that accepts GTKX-app connections and exposes
 * each as an {@link AppConnection} wrapped by a {@link JsonStreamTransport}.
 *
 * Owns lifecycle (socket file cleanup, `start`, `stop`) and connection
 * acceptance. Framing, schema validation, and pending-request correlation
 * live on each connection's transport.
 */
export class SocketServer extends EventEmitter<AppTransportEvents> implements AppTransport {
    private server: net.Server | null = null;
    private readonly connections: Map<string, AppConnection> = new Map();
    private readonly socketPath: string;

    constructor(socketPath: string = DEFAULT_SOCKET_PATH) {
        super();
        this.socketPath = socketPath;
    }

    async start(): Promise<void> {
        if (this.server) {
            return;
        }

        if (fs.existsSync(this.socketPath)) {
            fs.unlinkSync(this.socketPath);
        }

        return new Promise((resolve, reject) => {
            this.server = net.createServer((socket) => this.handleConnection(socket));

            this.server.on("error", (error) => {
                this.emit("error", error);
                reject(error);
            });

            this.server.listen(this.socketPath, () => {
                resolve();
            });
        });
    }

    async stop(): Promise<void> {
        if (!this.server) {
            return;
        }

        for (const connection of this.connections.values()) {
            connection.transport.rejectPending(new Error("Server stopping"));
        }

        return new Promise((resolve) => {
            this.server?.close(() => {
                this.server = null;
                if (fs.existsSync(this.socketPath)) {
                    fs.unlinkSync(this.socketPath);
                }
                this.connections.clear();
                resolve();
            });
        });
    }

    send(connectionId: string, message: IpcMessage): boolean {
        const connection = this.connections.get(connectionId);
        if (!connection) {
            return false;
        }
        return connection.transport.send(message);
    }

    private handleConnection(socket: net.Socket): void {
        const id = crypto.randomUUID();
        const transport = new JsonStreamTransport(socket);
        const connection: AppConnection = { id, transport };

        this.connections.set(id, connection);

        transport.on("request", (request) => this.emit("request", connection, request));
        transport.on("invalid", ({ id: badId, error }) => {
            transport.send({ id: badId, error: error.toIpcError() });
        });

        socket.on("data", (data: Buffer) => transport.feed(data));

        socket.on("close", () => {
            this.connections.delete(id);
            transport.rejectPending(new Error("Connection closed"));
            this.emit("disconnection", connection);
        });

        socket.on("error", (error) => {
            this.emit("error", error);
        });

        this.emit("connection", connection);
    }
}
