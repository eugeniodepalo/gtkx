import type { GirConstant } from "@gtkx/gir";
import type { FormatOptions } from "../utils/format.js";
import { formatCode, formatDoc } from "../utils/format.js";

export const generateConstants = async (constants: GirConstant[], options: FormatOptions): Promise<string> => {
    const seen = new Set<string>();
    const sections: string[] = [];

    for (const constant of constants) {
        const constName = constant.name;
        if (seen.has(constName)) {
            continue;
        }
        seen.add(constName);

        const isStringType = constant.type.name === "utf8" || constant.type.name === "filename";
        const constValue = isStringType ? `"${constant.value}"` : constant.value;
        const constDoc = constant.doc ? formatDoc(constant.doc, "", options) : "";
        sections.push(`${constDoc}export const ${constName} = ${constValue};`);
    }

    return formatCode(`${sections.join("\n\n")}\n`, options.prettierConfig);
};
