/**
 * Props Builder Base
 *
 * Shared utilities for building JSX props interfaces.
 * Extended by WidgetPropsBuilder and ControllerPropsBuilder.
 */

import type { PropertySignatureStructure } from "ts-morph";
import { StructureKind } from "ts-morph";
import type { SignalAnalysis, SignalParam } from "../../../core/generator-types.js";
import { sanitizeDoc } from "../../../core/utils/doc-formatter.js";
import { toPascalCase } from "../../../core/utils/naming.js";

export type PropInfo = {
    name: string;
    type: string;
    optional: boolean;
    doc?: string;
};

export abstract class PropsBuilderBase {
    protected usedNamespaces = new Set<string>();

    getUsedNamespaces(): ReadonlySet<string> {
        return this.usedNamespaces;
    }

    clearUsedNamespaces(): void {
        this.usedNamespaces.clear();
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

    protected buildInterfaceProperties(props: PropInfo[]): PropertySignatureStructure[] {
        return props.map((prop) => ({
            kind: StructureKind.PropertySignature as const,
            name: prop.name,
            type: prop.type,
            hasQuestionToken: prop.optional,
            docs: prop.doc ? [{ description: prop.doc }] : undefined,
        }));
    }
}
