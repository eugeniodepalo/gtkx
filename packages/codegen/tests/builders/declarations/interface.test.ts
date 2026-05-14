import { describe, expect, it } from "vitest";
import { interfaceDecl } from "../../../src/builders/declarations/interface.js";
import { param } from "../../../src/builders/members/parameter.js";
import { stringify } from "../../../src/builders/stringify.js";

describe("InterfaceDeclarationBuilder", () => {
    describe("TypeScript mode (default)", () => {
        it("emits an interface with properties", () => {
            const iface = interfaceDecl("Props", { exported: true })
                .addProperty({ name: "label", type: "string", optional: true })
                .addProperty({ name: "visible", type: "boolean" });

            expect(stringify(iface)).toBe("export interface Props {\n    label?: string;\n    visible: boolean;\n}\n");
        });

        it("emits an interface with extends", () => {
            const iface = interfaceDecl("ButtonProps", {
                exported: true,
                extends: ["WidgetProps"],
            }).addProperty({ name: "label", type: "string", optional: true });

            expect(stringify(iface)).toContain("interface ButtonProps extends WidgetProps");
        });

        it("emits an interface with multiple extends", () => {
            const iface = interfaceDecl("MyProps", {
                exported: true,
                extends: ["BaseProps", "ExtraProps"],
            });

            expect(stringify(iface)).toContain("interface MyProps extends BaseProps, ExtraProps");
        });

        it("emits a method signature", () => {
            const iface = interfaceDecl("Handler", { exported: true }).addMethod({
                name: "onClicked",
                params: [param("self", "Button")],
                returnType: "void",
            });

            expect(stringify(iface)).toContain("onClicked(self: Button): void;");
        });
    });

    describe("JavaScript mode", () => {
        it("emits nothing because interfaces have no runtime presence", () => {
            const iface = interfaceDecl("Props", { exported: true })
                .addProperty({ name: "label", type: "string", optional: true })
                .addProperty({ name: "visible", type: "boolean" });

            expect(stringify(iface, "js")).toBe("");
        });
    });
});
