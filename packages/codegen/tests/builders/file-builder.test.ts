import { describe, expect, it } from "vitest";
import { classDecl } from "../../src/builders/declarations/class.js";
import { enumDecl } from "../../src/builders/declarations/enum.js";
import { fileBuilder } from "../../src/builders/file-builder.js";
import { property } from "../../src/builders/members/property.js";
import { stringify } from "../../src/builders/stringify.js";

describe("FileBuilder", () => {
    it("renders a file with imports and a class", () => {
        const file = fileBuilder()
            .addImport("../../object.js", ["NativeObject", "NativeHandle"])
            .addImport("@gtkx/native", ["call"])
            .add(
                classDecl("Button", { exported: true, extends: "NativeObject" }).addProperty(
                    property("glibTypeName", {
                        isStatic: true,
                        readonly: true,
                        type: "string",
                        initializer: '"GtkButton"',
                    }),
                ),
            );

        const output = stringify(file);
        expect(output).toContain('import { call } from "@gtkx/native";');
        expect(output).toContain('import { NativeHandle, NativeObject } from "../../object.js";');
        expect(output).toContain("export class Button extends NativeObject");
    });

    it("deduplicates imports", () => {
        const file = fileBuilder()
            .addImport("./foo.js", ["A"])
            .addImport("./foo.js", ["B"])
            .addImport("./foo.js", ["A"]);

        const output = stringify(file);
        const importLines = output.split("\n").filter((l) => l.startsWith("import"));
        expect(importLines.length).toBe(1);
        expect(importLines[0]).toBe('import { A, B } from "./foo.js";');
    });

    it("handles namespace imports", () => {
        const file = fileBuilder().addNamespaceImport("../gtk/index.js", "Gtk");

        const output = stringify(file);
        expect(output).toContain('import * as Gtk from "../gtk/index.js";');
    });

    it("handles type-only imports", () => {
        const file = fileBuilder().addTypeImport("./types.js", ["Type"]);

        const output = stringify(file);
        expect(output).toContain('import { type Type } from "./types.js";');
    });

    it("adds blank line between imports and declarations", () => {
        const file = fileBuilder()
            .addImport("./foo.js", ["Foo"])
            .add(enumDecl("Bar", { exported: true }).addMember({ name: "A", value: 0 }));

        const output = stringify(file);
        const lines = output.split("\n");
        const importIdx = lines.findIndex((l) => l.includes("import"));
        const enumIdx = lines.findIndex((l) => l.includes("export enum"));
        expect(enumIdx - importIdx).toBeGreaterThanOrEqual(2);
    });

    it("handles addStatement for raw code", () => {
        const file = fileBuilder().addStatement("registerNativeClass(Button);");

        const output = stringify(file);
        expect(output).toContain("registerNativeClass(Button);");
    });

    it("renders file with no imports", () => {
        const file = fileBuilder().add(enumDecl("Foo", { exported: true }).addMember({ name: "A", value: 0 }));

        const output = stringify(file);
        expect(output).not.toContain("import");
        expect(output).toContain("export enum Foo");
    });
});
