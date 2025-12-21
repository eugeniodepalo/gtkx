import { formatCode } from "../utils/format.js";

export const generateIndex = async (fileNames: IterableIterator<string>, prettierConfig?: unknown): Promise<string> => {
    const exports = Array.from(fileNames)
        .filter((f) => f !== "index.ts")
        .map((f) => `export * from "./${f.replace(".ts", "")}.js";`);

    return formatCode(`${exports.join("\n")}\n`, prettierConfig);
};
