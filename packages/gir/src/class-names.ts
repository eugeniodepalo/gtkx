import { toPascalCase } from "./naming.js";

export const CLASS_RENAMES = new Map<string, string>([["Error", "GError"]]);

export const normalizeClassName = (name: string, namespace?: string): string => {
    const pascalName = toPascalCase(name);
    if (CLASS_RENAMES.has(pascalName)) {
        return CLASS_RENAMES.get(pascalName) as string;
    }
    if (pascalName === "Object" && namespace) {
        return namespace === "GObject" ? "GObject" : `${namespace}Object`;
    }
    return pascalName;
};
