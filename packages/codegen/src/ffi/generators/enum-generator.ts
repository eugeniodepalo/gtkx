import type { GirEnumeration } from "@gtkx/gir";
import { toConstantCase, toPascalCase } from "@gtkx/gir";
import type { FormatOptions } from "../utils/format.js";
import { formatCode, formatDoc } from "../utils/format.js";

export const generateEnums = async (enumerations: GirEnumeration[], options: FormatOptions): Promise<string> => {
    const sections = enumerations.map((enumeration) => {
        const enumName = toPascalCase(enumeration.name);
        const members = enumeration.members.map((member) => {
            let memberName = toConstantCase(member.name);
            if (/^\d/.test(memberName)) memberName = `_${memberName}`;
            const memberDoc = member.doc ? `${formatDoc(member.doc, "  ", options).trimEnd()}\n` : "";
            return `${memberDoc}  ${memberName} = ${member.value},`;
        });
        const enumDoc = enumeration.doc ? formatDoc(enumeration.doc, "", options) : "";
        return `${enumDoc}export enum ${enumName} {\n${members.join("\n")}\n}`;
    });

    return formatCode(`${sections.join("\n\n")}\n`, options.prettierConfig);
};
