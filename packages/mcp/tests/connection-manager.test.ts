import EventEmitter from "node:events";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConnectionManager } from "../src/connection-manager.js";
import { McpError, McpErrorCode } from "../src/protocol/errors.js";
import type { IpcMessage, IpcRequest, IpcResponse } from "../src/protocol/types.js";
import type { AppConnection, SocketServer } from "../src/socket-server.js";

type SocketServerEventMap = {
    connection: [AppConnection];
    disconnection: [AppConnection];
    request: [AppConnection, IpcRequest];
    response: [AppConnection, IpcResponse];
    error: [Error];
};

class FakeSocketServer extends EventEmitter<SocketServerEventMap> {
    readonly sent: Array<{ connectionId: string; message: IpcMessage }> = [];
    sendReturn = true;

    send(connectionId: string, message: IpcMessage): boolean {
        this.sent.push({ connectionId, message });
        return this.sendReturn;
    }
}

function makeConnection(id: string): AppConnection {
    return { id, socket: {} as never, buffer: "" };
}

function lastResponse(server: FakeSocketServer): IpcResponse | undefined {
    const entry = server.sent[server.sent.length - 1];
    return entry?.message as IpcResponse | undefined;
}

describe("ConnectionManager", () => {
    let server: FakeSocketServer;
    let manager: ConnectionManager;

    beforeEach(() => {
        vi.useFakeTimers();
        server = new FakeSocketServer();
        manager = new ConnectionManager(server as unknown as SocketServer);
    });

    afterEach(() => {
        manager.cleanup();
        vi.useRealTimers();
    });

    describe("registration", () => {
        it("registers an app and emits appRegistered with its info", () => {
            const conn = makeConnection("c1");
            const onRegister = vi.fn();
            manager.on("appRegistered", onRegister);

            server.emit("request", conn, {
                id: "req-1",
                method: "app.register",
                params: { appId: "app-a", pid: 1234 },
            });

            expect(onRegister).toHaveBeenCalledWith({ appId: "app-a", pid: 1234, windows: [] });
            expect(manager.hasConnectedApps()).toBe(true);
            expect(manager.getApp("app-a")).toEqual({ appId: "app-a", pid: 1234, windows: [] });
            expect(manager.getApps()).toHaveLength(1);
            expect(lastResponse(server)).toEqual({ id: "req-1", result: { success: true } });
        });

        it("rejects registration with invalid params", () => {
            const conn = makeConnection("c1");
            const onRegister = vi.fn();
            manager.on("appRegistered", onRegister);

            server.emit("request", conn, {
                id: "req-1",
                method: "app.register",
                params: { appId: "app-a" },
            });

            expect(onRegister).not.toHaveBeenCalled();
            expect(manager.hasConnectedApps()).toBe(false);
            const response = lastResponse(server);
            expect(response?.error?.code).toBe(McpErrorCode.INVALID_REQUEST);
        });

        it("unregisters an app via app.unregister and emits appUnregistered", () => {
            const conn = makeConnection("c1");
            const onUnregister = vi.fn();
            manager.on("appUnregistered", onUnregister);

            server.emit("request", conn, {
                id: "req-1",
                method: "app.register",
                params: { appId: "app-a", pid: 1 },
            });
            server.emit("request", conn, { id: "req-2", method: "app.unregister" });

            expect(onUnregister).toHaveBeenCalledWith("app-a");
            expect(manager.hasConnectedApps()).toBe(false);
            expect(lastResponse(server)).toEqual({ id: "req-2", result: { success: true } });
        });

        it("ignores app.unregister from a connection that never registered", () => {
            const conn = makeConnection("c1");
            const onUnregister = vi.fn();
            manager.on("appUnregistered", onUnregister);

            server.emit("request", conn, { id: "req-1", method: "app.unregister" });

            expect(onUnregister).not.toHaveBeenCalled();
            expect(lastResponse(server)).toEqual({ id: "req-1", result: { success: true } });
        });

        it("ignores unknown request methods on the manager event channel", () => {
            const conn = makeConnection("c1");
            server.emit("request", conn, { id: "req-1", method: "something.else" });
            expect(server.sent).toEqual([]);
        });

        it("removes the app when its connection disconnects", () => {
            const conn = makeConnection("c1");
            const onUnregister = vi.fn();
            manager.on("appUnregistered", onUnregister);

            server.emit("request", conn, {
                id: "req-1",
                method: "app.register",
                params: { appId: "app-a", pid: 1 },
            });
            server.emit("disconnection", conn);

            expect(onUnregister).toHaveBeenCalledWith("app-a");
            expect(manager.hasConnectedApps()).toBe(false);
        });

        it("ignores disconnection from a connection without a registered app", () => {
            const conn = makeConnection("c1");
            const onUnregister = vi.fn();
            manager.on("appUnregistered", onUnregister);

            server.emit("disconnection", conn);

            expect(onUnregister).not.toHaveBeenCalled();
        });
    });

    describe("getDefaultApp", () => {
        it("returns undefined when no apps are connected", () => {
            expect(manager.getDefaultApp()).toBeUndefined();
        });

        it("returns the first registered app", () => {
            const conn = makeConnection("c1");
            server.emit("request", conn, {
                id: "req-1",
                method: "app.register",
                params: { appId: "app-a", pid: 1 },
            });

            expect(manager.getDefaultApp()?.info.appId).toBe("app-a");
        });
    });

    describe("waitForApp", () => {
        it("resolves immediately when an app is already registered", async () => {
            const conn = makeConnection("c1");
            server.emit("request", conn, {
                id: "req-1",
                method: "app.register",
                params: { appId: "app-a", pid: 1 },
            });

            await expect(manager.waitForApp()).resolves.toEqual({
                appId: "app-a",
                pid: 1,
                windows: [],
            });
        });

        it("resolves once an app registers later", async () => {
            const promise = manager.waitForApp(5000);
            const conn = makeConnection("c1");

            server.emit("request", conn, {
                id: "req-1",
                method: "app.register",
                params: { appId: "app-late", pid: 99 },
            });

            await expect(promise).resolves.toEqual({ appId: "app-late", pid: 99, windows: [] });
        });

        it("rejects when no app registers before the timeout", async () => {
            const promise = manager.waitForApp(1000);
            vi.advanceTimersByTime(1000);
            await expect(promise).rejects.toThrow(/Timeout waiting for app registration after 1000ms/);
        });
    });

    describe("sendToApp", () => {
        function registerApp(appId: string, connectionId = "c1"): AppConnection {
            const conn = makeConnection(connectionId);
            server.emit("request", conn, {
                id: "reg",
                method: "app.register",
                params: { appId, pid: 1 },
            });
            server.sent.length = 0;
            return conn;
        }

        it("sends a request to the named app and resolves with the response result", async () => {
            registerApp("app-a");
            const promise = manager.sendToApp("app-a", "ping", { hello: "world" });
            const sent = server.sent[0]?.message as IpcRequest;

            server.emit("response", makeConnection("c1"), { id: sent.id, result: { ok: true } });

            await expect(promise).resolves.toEqual({ ok: true });
        });

        it("sends to the default app when appId is undefined", async () => {
            registerApp("app-a");
            const promise = manager.sendToApp(undefined, "ping");
            const sent = server.sent[0]?.message as IpcRequest;

            server.emit("response", makeConnection("c1"), { id: sent.id, result: 42 });

            await expect(promise).resolves.toBe(42);
        });

        it("rejects with appNotFound when the named app is unknown", async () => {
            await expect(manager.sendToApp("missing", "ping")).rejects.toMatchObject({
                code: McpErrorCode.APP_NOT_FOUND,
            });
        });

        it("rejects with noAppConnected when no apps are registered and no appId given", async () => {
            await expect(manager.sendToApp(undefined, "ping")).rejects.toMatchObject({
                code: McpErrorCode.NO_APP_CONNECTED,
            });
        });

        it("rejects with appNotFound when the underlying send fails", async () => {
            registerApp("app-a");
            server.sendReturn = false;

            await expect(manager.sendToApp("app-a", "ping")).rejects.toMatchObject({
                code: McpErrorCode.APP_NOT_FOUND,
            });
        });

        it("rejects with ipcTimeout when no response arrives within the configured window", async () => {
            const customManager = new ConnectionManager(server as unknown as SocketServer, {
                requestTimeout: 5000,
            });
            const conn = makeConnection("c2");
            server.emit("request", conn, {
                id: "reg",
                method: "app.register",
                params: { appId: "app-x", pid: 1 },
            });

            const promise = customManager.sendToApp("app-x", "slow");
            vi.advanceTimersByTime(5000);

            await expect(promise).rejects.toMatchObject({ code: McpErrorCode.IPC_TIMEOUT });
            customManager.cleanup();
        });

        it("rejects with the McpError described by an error response", async () => {
            registerApp("app-a");
            const promise = manager.sendToApp("app-a", "ping");
            const sent = server.sent[0]?.message as IpcRequest;

            server.emit("response", makeConnection("c1"), {
                id: sent.id,
                error: { code: McpErrorCode.INTERNAL_ERROR, message: "boom", data: { reason: "x" } },
            });

            await expect(promise).rejects.toBeInstanceOf(McpError);
            await expect(promise).rejects.toMatchObject({
                code: McpErrorCode.INTERNAL_ERROR,
                message: "boom",
                data: { reason: "x" },
            });
        });

        it("ignores responses for unknown request ids", async () => {
            registerApp("app-a");
            const promise = manager.sendToApp("app-a", "ping");
            const sent = server.sent[0]?.message as IpcRequest;

            server.emit("response", makeConnection("c1"), { id: "unknown", result: 1 });
            server.emit("response", makeConnection("c1"), { id: sent.id, result: 2 });

            await expect(promise).resolves.toBe(2);
        });
    });

    describe("cleanup", () => {
        it("rejects all pending requests with a shutdown error", async () => {
            const conn = makeConnection("c1");
            server.emit("request", conn, {
                id: "reg",
                method: "app.register",
                params: { appId: "app-a", pid: 1 },
            });

            const promise = manager.sendToApp("app-a", "ping");
            manager.cleanup();

            await expect(promise).rejects.toThrow("Connection manager shutting down");
        });
    });
});
