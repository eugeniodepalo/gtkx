export { ConnectionManager } from "./connection-manager.js";
export {
    appNotFoundError,
    invalidRequestError,
    ipcTimeoutError,
    McpError,
    McpErrorCode,
    methodNotFoundError,
    noAppConnectedError,
    widgetNotFoundError,
} from "./protocol/errors.js";
export {
    type AppInfo,
    DEFAULT_SOCKET_PATH,
    getRuntimeDir,
    type IpcError,
    IpcErrorSchema,
    type IpcMessage,
    type IpcMethod,
    type IpcRequest,
    IpcRequestSchema,
    type IpcResponse,
    IpcResponseSchema,
    type QueryOptions,
    type SerializedWidget,
} from "./protocol/types.js";
export { type AppConnection, SocketServer } from "./socket-server.js";
