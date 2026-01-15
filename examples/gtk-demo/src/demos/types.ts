import type { ComponentType } from "react";

export interface Demo {
    id: string;
    title: string;
    description: string;
    keywords: string[];
    component?: ComponentType;
    sourceCode?: string;
}

export type TreeItem =
    | { type: "category"; title: string; children: TreeItem[] }
    | { type: "demo"; demo: Demo; displayTitle: string };
