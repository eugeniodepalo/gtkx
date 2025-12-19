import type { EmotionCache } from "@emotion/cache";
import createCache from "@emotion/cache";
import { StyleSheet } from "./style-sheet.js";

let gtkCache: EmotionCache | null = null;

export const getGtkCache = (): EmotionCache => {
    if (!gtkCache) {
        const sheet = new StyleSheet({ key: "gtkx" });

        gtkCache = createCache({
            key: "gtkx",
            container: null,
        });

        gtkCache.sheet = sheet as unknown as typeof gtkCache.sheet;
    }

    return gtkCache;
};
