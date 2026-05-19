import { describe, expect, it } from "vitest";
import { ImportRegistry } from "../../src/builders/import-registry.js";
import { stringify } from "../../src/builders/stringify.js";

describe("ImportRegistry (1)", () => {
    it("renders a single import", () => {
        const reg = new ImportRegistry();
        reg.add("./foo.js", ["Foo"]);
        expect(stringify(reg)).toBe('import { Foo } from "./foo.js";\n');
    });

    it("deduplicates imports from same specifier", () => {
        const reg = new ImportRegistry();
        reg.add("./foo.js", ["Foo"]);
        reg.add("./foo.js", ["Bar"]);
        reg.add("./foo.js", ["Foo"]);
        expect(stringify(reg)).toBe('import { Bar, Foo } from "./foo.js";\n');
    });

    it("sorts imports by specifier", () => {
        const reg = new ImportRegistry();
        reg.add("./z.js", ["Z"]);
        reg.add("./a.js", ["A"]);
        const output = stringify(reg);
        expect(output).toBe('import { A } from "./a.js";\nimport { Z } from "./z.js";\n');
    });

    it("renders namespace imports", () => {
        const reg = new ImportRegistry();
        reg.addNamespace("../gtk/index.js", "Gtk");
        expect(stringify(reg)).toBe('import * as Gtk from "../gtk/index.js";\n');
    });

    it("renders type-only imports", () => {
        const reg = new ImportRegistry();
        reg.addTypeOnly("./types.js", ["Type"]);
        expect(stringify(reg)).toBe('import { type Type } from "./types.js";\n');
    });

    it("combines value and type-only imports from same specifier", () => {
        const reg = new ImportRegistry();
        reg.add("./foo.js", ["call"]);
        reg.addTypeOnly("./foo.js", ["Type"]);
        const output = stringify(reg);
        expect(output).toBe('import { type Type, call } from "./foo.js";\n');
    });

    it("reports isEmpty correctly", () => {
        const reg = new ImportRegistry();
        expect(reg.isEmpty).toBe(true);
        reg.add("./foo.js", ["Foo"]);
        expect(reg.isEmpty).toBe(false);
    });
});

describe("ImportRegistry (2)", () => {
    it("leaves runtime-module value imports unchanged outside JS mode", () => {
        const reg = new ImportRegistry();
        reg.add("../../registry.js", ["getNativeObject"]);
        expect(stringify(reg)).toBe('import { getNativeObject } from "../../registry.js";\n');
    });

    describe("JS mode", () => {
        it("drops type-only imports and intra-namespace paths", () => {
            const reg = new ImportRegistry();
            reg.setMode("js");
            reg.addTypeOnly("@gtkx/types", ["Type"]);
            reg.add("./other.js", ["Other"]);
            reg.add("external-lib", ["call"]);
            expect(stringify(reg)).toBe('import { call } from "external-lib";\n');
        });

        it("consolidates @gtkx/ffi runtime-module value imports to the runtime barrel", () => {
            const reg = new ImportRegistry();
            reg.setMode("js");
            reg.add("../../registry.js", ["getNativeObject"]);
            reg.add("../../native.js", ["t"]);
            reg.add("@gtkx/native", ["createRef"]);
            expect(stringify(reg)).toBe('import { createRef, getNativeObject, t } from "../../runtime.js";\n');
        });

        it("drops type-only namespace imports but keeps value namespace imports", () => {
            const reg = new ImportRegistry();
            reg.setMode("js");
            reg.addTypeNamespace("@gtkx/types", "Types");
            reg.addNamespace("@gtkx/native", "Native");
            expect(stringify(reg)).toBe('import * as Native from "@gtkx/native";\n');
        });
    });
});
