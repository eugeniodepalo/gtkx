/**
 * Props Builder Base
 *
 * Shared utilities for building JSX props type aliases.
 * Extended by WidgetPropsBuilder and ControllerPropsBuilder.
 */

import type { CodeBlockWriter, WriterFunction } from "ts-morph";
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

    protected buildIntersectionTypeWriter(parentType: string, props: PropInfo[]): WriterFunction {
        return (writer: CodeBlockWriter) => {
            writer.write(`${parentType} & {`);
            writer.newLine();
            writer.indent(() => {
                for (const prop of props) {
                    if (prop.doc) {
                        this.writeJsDoc(writer, prop.doc);
                    }
                    const questionMark = prop.optional ? "?" : "";
                    writer.writeLine(`${prop.name}${questionMark}: ${prop.type};`);
                }
            });
            writer.write("}");
        };
    }

    protected buildObjectTypeWriter(props: PropInfo[]): WriterFunction {
        return (writer: CodeBlockWriter) => {
            writer.write("{");
            writer.newLine();
            writer.indent(() => {
                for (const prop of props) {
                    if (prop.doc) {
                        this.writeJsDoc(writer, prop.doc);
                    }
                    const questionMark = prop.optional ? "?" : "";
                    writer.writeLine(`${prop.name}${questionMark}: ${prop.type};`);
                }
            });
            writer.write("}");
        };
    }

    protected writeJsDoc(writer: CodeBlockWriter, doc: string): void {
        const lines = doc.split("\n");
        if (lines.length === 1) {
            writer.writeLine(`/** ${doc} */`);
        } else {
            writer.writeLine("/**");
            for (const line of lines) {
                writer.writeLine(` * ${line}`);
            }
            writer.writeLine(" */");
        }
    }
}
