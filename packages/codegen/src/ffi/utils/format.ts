import { formatDoc as formatDocBase } from "@gtkx/gir";
import { format } from "prettier";

export type FormatOptions = {
    namespace: string;
    prettierConfig?: unknown;
};

export const formatDoc = (doc: string | undefined, indent: string, options: FormatOptions): string => {
    return formatDocBase(doc, indent, { namespace: options.namespace });
};

export const formatCode = async (code: string, prettierConfig?: unknown): Promise<string> => {
    try {
        return await format(code, {
            parser: "typescript",
            ...(prettierConfig && typeof prettierConfig === "object" && prettierConfig !== null
                ? (prettierConfig as Record<string, unknown>)
                : {}),
        });
    } catch (error) {
        console.warn("Failed to format code:", error);
        return code;
    }
};
