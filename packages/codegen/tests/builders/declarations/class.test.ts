import { describe, expect, it } from "vitest";
import { classDecl } from "../../../src/builders/declarations/class.js";
import { constructorDecl } from "../../../src/builders/members/constructor.js";
import { method } from "../../../src/builders/members/method.js";
import { param } from "../../../src/builders/members/parameter.js";
import { property } from "../../../src/builders/members/property.js";
import { stringify } from "../../../src/builders/stringify.js";

describe("ClassDeclarationBuilder", () => {
    it("generates a simple class", () => {
        const cls = classDecl("Button", { exported: true, extends: "Widget" });
        expect(stringify(cls)).toBe("export class Button extends Widget {\n}\n");
    });

    it("generates class with static typed property", () => {
        const cls = classDecl("Button", { exported: true, extends: "Widget" }).addProperty(
            property("glibTypeName", {
                isStatic: true,
                readonly: true,
                type: "string",
                initializer: '"GtkButton"',
            }),
        );

        expect(stringify(cls)).toBe(
            'export class Button extends Widget {\n    static readonly glibTypeName: string = "GtkButton";\n}\n',
        );
    });

    it("generates class with constructor overloads in TS mode", () => {
        const cls = classDecl("Button", { exported: true, extends: "Widget" }).setConstructor(
            constructorDecl({
                params: [param("labelOrHandle", "string | NativeHandle")],
                overloads: [
                    { params: [param("handle", "NativeHandle")] },
                    { params: [param("label", "string", { optional: true })] },
                ],
                body: ["super(labelOrHandle as NativeHandle);"],
            }),
        );

        const output = stringify(cls);
        expect(output).toContain("constructor(handle: NativeHandle);");
        expect(output).toContain("constructor(label?: string);");
        expect(output).toContain("constructor(labelOrHandle: string | NativeHandle)");
        expect(output).toContain("super(labelOrHandle as NativeHandle);");
    });

    it("generates class with typed methods in TS mode", () => {
        const cls = classDecl("Button", { exported: true })
            .addMethod(
                method("getLabel", {
                    returnType: "string",
                    body: ['return "hello";'],
                }),
            )
            .addMethod(
                method("setLabel", {
                    params: [param("label", "string")],
                    returnType: "void",
                    body: ["this._label = label;"],
                }),
            );

        const output = stringify(cls);
        expect(output).toContain("getLabel(): string {");
        expect(output).toContain('return "hello";');
        expect(output).toContain("setLabel(label: string): void {");
        expect(output).toContain("this._label = label;");
    });

    it("emits a doc comment on the class", () => {
        const cls = classDecl("Widget", { exported: true, doc: "Base widget class." });
        expect(stringify(cls)).toContain("/** Base widget class. */");
    });

    it("emits the abstract keyword in TS mode", () => {
        const cls = classDecl("BaseType", { exported: true, abstract: true });
        expect(stringify(cls)).toBe("export abstract class BaseType {\n}\n");
    });

    it("emits a writer-callback method body", () => {
        const cls = classDecl("Button", { exported: true }).addMethod(
            method("doStuff", {
                returnType: "void",
                body: (w) => {
                    w.writeLine("if (true) {");
                    w.withIndent(() => {
                        w.writeLine("doSomething();");
                    });
                    w.writeLine("}");
                },
            }),
        );

        const output = stringify(cls);
        expect(output).toContain("if (true) {");
        expect(output).toContain("        doSomething();");
        expect(output).toContain("    }");
    });

    it("drops type annotations and abstract in JS mode", () => {
        const cls = classDecl("Button", { exported: true, abstract: true }).addMethod(
            method("getLabel", {
                returnType: "string",
                body: ['return "hello";'],
            }),
        );

        const output = stringify(cls, "js");
        expect(output).not.toContain("abstract");
        expect(output).not.toContain(": string");
        expect(output).toContain("getLabel()");
    });
});
