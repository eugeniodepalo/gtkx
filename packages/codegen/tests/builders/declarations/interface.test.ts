import { describe, expect, it } from "vitest";
import { interfaceDecl } from "../../../src/builders/declarations/interface.js";
import { param } from "../../../src/builders/members/parameter.js";
import { stringify } from "../../../src/builders/stringify.js";

describe("InterfaceDeclarationBuilder", () => {
    it("generates a simple interface", () => {
        const iface = interfaceDecl("Props", { exported: true })
            .addProperty({ name: "label", type: "string", optional: true })
            .addProperty({ name: "visible", type: "boolean" });

        expect(stringify(iface)).toBe("export interface Props {\n    label?: string;\n    visible: boolean;\n}\n");
    });

    it("generates interface with extends", () => {
        const iface = interfaceDecl("ButtonProps", {
            exported: true,
            extends: ["WidgetProps"],
        }).addProperty({ name: "label", type: "string", optional: true });

        expect(stringify(iface)).toContain("interface ButtonProps extends WidgetProps");
    });

    it("generates interface with multiple extends", () => {
        const iface = interfaceDecl("MyProps", {
            exported: true,
            extends: ["BaseProps", "ExtraProps"],
        });

        expect(stringify(iface)).toContain("interface MyProps extends BaseProps, ExtraProps");
    });

    it("generates interface with method signature", () => {
        const iface = interfaceDecl("Handler", { exported: true }).addMethod({
            name: "onClicked",
            params: [param("self", "Button")],
            returnType: "void",
        });

        expect(stringify(iface)).toContain("onClicked(self: Button): void;");
    });

    it("generates interface with doc", () => {
        const iface = interfaceDecl("Props", {
            exported: true,
            doc: "Widget properties.",
        });

        expect(stringify(iface)).toContain("/** Widget properties. */");
    });

    it("generates property with doc", () => {
        const iface = interfaceDecl("Props", { exported: true }).addProperty({
            name: "label",
            type: "string",
            doc: "The button label.",
        });

        expect(stringify(iface)).toContain("/** The button label. */");
        expect(stringify(iface)).toContain("label: string;");
    });
});
