/**
 * Props Builder Base
 *
 * Shared utilities for building JSX props interfaces.
 * Extended by WidgetPropsBuilder and ControllerPropsBuilder.
 */

import type { InterfaceDeclarationBuilder } from "../../../builders/index.js";
import type { PropertyAnalysis, SignalAnalysis, SignalParam } from "../../../core/generator-types.js";
import { sanitizeDoc } from "../../../core/utils/doc-formatter.js";
import { toPascalCase } from "../../../core/utils/naming.js";
import { qualifyType } from "../../../core/utils/type-qualification.js";

export type PropInfo = {
    name: string;
    type: string;
    optional: boolean;
    doc?: string;
};

export type ParentPropsTarget = {
    namespace: string;
    parentClassName: string | null;
    parentNamespace: string | null;
};

export abstract class PropsBuilderBase {
    protected usedNamespaces = new Set<string>();
    private knownJsxNames: ReadonlySet<string> = new Set<string>();

    getUsedNamespaces(): ReadonlySet<string> {
        return this.usedNamespaces;
    }

    clearUsedNamespaces(): void {
        this.usedNamespaces.clear();
    }

    setKnownJsxNames(names: ReadonlySet<string>): void {
        this.knownJsxNames = names;
    }

    protected trackNamespacesFromAnalysis(referencedNamespaces: readonly string[]): void {
        for (const ns of referencedNamespaces) {
            this.usedNamespaces.add(ns);
        }
    }

    protected buildHandlerType(signal: SignalAnalysis, className: string, namespace: string): string {
        const selfParam = `self: ${namespace}.${toPascalCase(className)}`;
        const otherParams = signal.parameters.map((p: SignalParam) => `${p.name}: ${p.type}`).join(", ");
        const params = otherParams ? `${otherParams}, ${selfParam}` : selfParam;
        return `(${params}) => ${signal.returnType}`;
    }

    protected formatDocDescription(doc: string, namespace: string): string {
        return sanitizeDoc(doc, {
            namespace,
            escapeXmlTags: true,
            linkStyle: "prefixed",
        });
    }

    protected collectPropInfos(
        properties: readonly PropertyAnalysis[],
        namespace: string,
        slotPropNames: ReadonlySet<string> = new Set(),
    ): PropInfo[] {
        const out: PropInfo[] = [];
        for (const prop of properties) {
            if (!prop.isWritable || (!prop.setter && !prop.isConstructOnly)) continue;

            const doc = prop.doc ? this.formatDocDescription(prop.doc, namespace) : undefined;

            if (slotPropNames.has(prop.camelName)) {
                out.push({ name: prop.camelName, type: "ReactNode | null", optional: true, doc });
                continue;
            }

            this.trackNamespacesFromAnalysis(prop.referencedNamespaces);
            const qualifiedType = qualifyType(prop.type, namespace);
            const typeWithNull = prop.isNullable ? `${qualifiedType} | null` : qualifiedType;
            out.push({
                name: prop.camelName,
                type: typeWithNull,
                optional: !prop.isRequired,
                doc,
            });
        }
        return out;
    }

    protected collectSignalInfos(
        signals: readonly SignalAnalysis[],
        ownerClassName: string,
        namespace: string,
        wrapHandlerType: (handler: string) => string = (h) => `${h} | null`,
    ): PropInfo[] {
        const out: PropInfo[] = [];
        for (const signal of signals) {
            this.trackNamespacesFromAnalysis(signal.referencedNamespaces);
            out.push({
                name: signal.handlerName,
                type: wrapHandlerType(this.buildHandlerType(signal, ownerClassName, namespace)),
                optional: true,
                doc: signal.doc ? this.formatDocDescription(signal.doc, namespace) : undefined,
            });
        }
        return out;
    }

    protected applyProps(iface: InterfaceDeclarationBuilder, props: readonly PropInfo[]): void {
        for (const prop of props) {
            iface.addProperty({
                name: prop.name,
                type: prop.type,
                optional: prop.optional,
                doc: prop.doc,
            });
        }
    }

    protected resolveParentPropsName(target: ParentPropsTarget, fallback: string): string {
        const { parentClassName, parentNamespace, namespace } = target;
        if (!parentClassName) return fallback;

        const ns = parentNamespace ?? namespace;
        const parentJsxName = `${ns}${toPascalCase(parentClassName)}`;
        if (this.knownJsxNames.size > 0 && !this.knownJsxNames.has(parentJsxName)) {
            return fallback;
        }

        const baseName = toPascalCase(parentClassName);
        return `${ns}${baseName}Props`;
    }
}
