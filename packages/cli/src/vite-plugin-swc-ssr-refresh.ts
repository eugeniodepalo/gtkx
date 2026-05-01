import { type Options as SwcOptions, transform } from "@swc/core";
import type { Plugin } from "vite";
import {
    type RefreshFilterOptions,
    resolveRefreshFilter,
    shouldTransformForRefresh,
} from "./internal/vite-refresh-shared.js";

type SwcSsrRefreshOptions = RefreshFilterOptions;

export function swcSsrRefresh(options: SwcSsrRefreshOptions = {}): Plugin {
    const filter = resolveRefreshFilter(options);

    return {
        name: "gtkx:swc-ssr-refresh",
        enforce: "pre",

        async transform(code, id, transformOptions) {
            if (!shouldTransformForRefresh(id, transformOptions, filter)) {
                return;
            }

            const isTsx = id.endsWith(".tsx");
            const isTs = id.endsWith(".ts") || isTsx;

            const swcOptions: SwcOptions = {
                filename: id,
                sourceFileName: id,
                sourceMaps: true,
                jsc: {
                    parser: isTs ? { syntax: "typescript", tsx: isTsx } : { syntax: "ecmascript", jsx: true },
                    transform: {
                        react: {
                            runtime: "automatic",
                            development: true,
                            refresh: true,
                        },
                    },
                    target: "es2022",
                },
            };

            const result = await transform(code, swcOptions);

            return {
                code: result.code,
                map: result.map,
            };
        },
    };
}
