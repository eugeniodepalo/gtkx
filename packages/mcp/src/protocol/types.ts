import { tmpdir } from "node:os";
import { join } from "node:path";
import { z } from "zod";

export const IpcRequestSchema = z.object({
    id: z.string(),
    method: z.string(),
    params: z.unknown().optional(),
});

export type IpcRequest = z.infer<typeof IpcRequestSchema>;

export type IpcError = {
    code: number;
    message: string;
    data?: unknown;
};

export const IpcErrorSchema = z.object({
    code: z.number(),
    message: z.string(),
    data: z.unknown().optional(),
});

export const IpcResponseSchema = z.object({
    id: z.string(),
    result: z.unknown().optional(),
    error: IpcErrorSchema.optional(),
});

export type IpcResponse = z.infer<typeof IpcResponseSchema>;

export interface SerializedWidget {
    id: string;
    type: string;
    role: string;
    name: string | null;
    label: string | null;
    text: string | null;
    sensitive: boolean;
    visible: boolean;
    cssClasses: string[];
    children: SerializedWidget[];
    bounds?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}

export type AppInfo = {
    appId: string;
    pid: number;
    windows: Array<{
        id: string;
        title: string | null;
    }>;
};

export type QueryOptions = {
    name?: string;
    exact?: boolean;
    timeout?: number;
};

export const RegisterParamsSchema = z.object({
    appId: z.string(),
    pid: z.number(),
});

export type IpcMethod =
    | "app.register"
    | "app.unregister"
    | "widget.getTree"
    | "widget.query"
    | "widget.getProps"
    | "widget.click"
    | "widget.type"
    | "widget.fireEvent"
    | "widget.screenshot";

export type IpcMessage = IpcRequest | IpcResponse;

export const getRuntimeDir = (): string => process.env.XDG_RUNTIME_DIR ?? tmpdir();

export const DEFAULT_SOCKET_PATH = join(getRuntimeDir(), "gtkx-mcp.sock");
