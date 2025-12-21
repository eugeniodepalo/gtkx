import type { GirClass } from "@gtkx/gir";
import { normalizeClassName, toKebabCase } from "@gtkx/gir";

type ParentInfo = {
    hasParent: boolean;
    isCrossNamespace: boolean;
    namespace?: string;
    className: string;
    importStatement?: string;
    extendsClause: string;
};

export const parseParentReference = (
    parent: string | undefined,
    classMap: Map<string, GirClass>,
    currentNamespace: string,
): ParentInfo => {
    if (!parent) {
        return { hasParent: false, isCrossNamespace: false, className: "", extendsClause: " extends NativeObject" };
    }

    if (parent.includes(".")) {
        const [ns, className] = parent.split(".", 2);
        if (ns && className) {
            const normalizedClass = normalizeClassName(className, ns);
            const nsLower = ns.toLowerCase();
            return {
                hasParent: true,
                isCrossNamespace: true,
                namespace: ns,
                className: normalizedClass,
                importStatement: `import * as ${ns} from "../${nsLower}/index.js";`,
                extendsClause: ` extends ${ns}.${normalizedClass}`,
            };
        }
    }

    if (classMap.has(parent)) {
        const normalizedClass = normalizeClassName(parent, currentNamespace);
        return {
            hasParent: true,
            isCrossNamespace: false,
            className: normalizedClass,
            importStatement: `import { ${normalizedClass} } from "./${toKebabCase(parent)}.js";`,
            extendsClause: ` extends ${normalizedClass}`,
        };
    }

    return { hasParent: false, isCrossNamespace: false, className: "", extendsClause: "" };
};
