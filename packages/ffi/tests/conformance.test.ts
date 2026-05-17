import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
    annotateReturns,
    checkSource,
    getPropertyAnnotateReturns,
    handWrittenEntryPath,
    implEntryPath,
    implJsPath,
    normalizeContract,
    promisifyAnnotateReturns,
    tupleAnnotateArrayReturns,
    UNCONTRACTED_NAMESPACES,
} from "../scripts/conformance.js";

describe("implEntryPath", () => {
    it("routes a namespace with a hand-written runtime directory to its index.ts", () => {
        for (const namespace of ["gobject", "gtk", "cairo"]) {
            const entry = implEntryPath(namespace);
            expect(entry.endsWith(join("src", namespace, "index.ts"))).toBe(true);
            expect(handWrittenEntryPath(namespace)).toBe(entry);
        }
    });

    it("routes a namespace without a hand-written directory to the generated .js", () => {
        for (const namespace of ["glib", "gio", "adw"]) {
            expect(implEntryPath(namespace)).toBe(implJsPath(namespace));
            expect(handWrittenEntryPath(namespace)).toBeUndefined();
        }
    });
});

describe("getPropertyAnnotateReturns", () => {
    it("casts a return of this.getProperty(...) to any", () => {
        const source = [
            "class Auth {",
            "    get isCancelled() {",
            '        return this.getProperty("is-cancelled");',
            "    }",
            "}",
        ].join("\n");

        const result = getPropertyAnnotateReturns(source, "auth.js");

        expect(result).toContain('/** @type {any} */ (this.getProperty("is-cancelled"))');
    });

    it("leaves a return that is not a this.getProperty call untouched", () => {
        const source = "function f() {\n    return this.getValue();\n}";
        expect(getPropertyAnnotateReturns(source, "f.js")).toBe(source);
    });
});

describe("annotateReturns", () => {
    it("wraps only the return expressions the picker matches", () => {
        const source = "function f() {\n    return promisify(x);\n}\nfunction g() {\n    return [1, 2];\n}";

        const result = annotateReturns(source, "m.js", (expression) =>
            expression.getText() === "promisify(x)" ? "Promise<any>" : undefined,
        );

        expect(result).toContain("/** @type {Promise<any>} */ (promisify(x))");
        expect(result).toContain("return [1, 2];");
    });

    it("returns the source unchanged when no return expression matches", () => {
        const source = "function f() {\n    return 1;\n}";
        expect(annotateReturns(source, "m.js", () => undefined)).toBe(source);
    });
});

describe("tupleAnnotateArrayReturns", () => {
    it("types a non-empty array-literal return as a fixed-length tuple", () => {
        const source = "function f() {\n    return [a, b, c];\n}";
        expect(tupleAnnotateArrayReturns(source, "f.js")).toContain("/** @type {[any, any, any]} */ ([a, b, c])");
    });

    it("leaves an empty array-literal return untouched", () => {
        const source = "function f() {\n    return [];\n}";
        expect(tupleAnnotateArrayReturns(source, "f.js")).toBe(source);
    });
});

describe("promisifyAnnotateReturns", () => {
    it("types a return of promisify(...) as Promise<any>", () => {
        const source = "function f() {\n    return promisify(call());\n}";
        expect(promisifyAnnotateReturns(source, "f.js")).toContain("/** @type {Promise<any>} */ (promisify(call()))");
    });
});

describe("normalizeContract", () => {
    it("collapses a nominal type reference to any while keeping primitives", () => {
        const source = "export declare function f(widget: Widget, count: number): boolean;";

        const result = normalizeContract(source, "c.d.ts");

        expect(result).toContain("widget: any");
        expect(result).toContain("count: number");
        expect(result).toContain("): boolean");
    });

    it("keeps Promise and Array constructors while normalizing their arguments", () => {
        const source = "export declare function f(): Promise<Widget>;";
        expect(normalizeContract(source, "c.d.ts")).toContain("Promise<any>");
    });
});

describe("checkSource", () => {
    it("emits a static-extra assertion per shared class", () => {
        const source = checkSource("gtk", ["Widget", "Button"]);

        expect(source).toContain("const _noStaticExtra0:");
        expect(source).toContain('implOnlyStatic: Exclude<keyof (typeof impl)["Widget"], keyof Contract["Widget"]>');
        expect(source).toContain("const _noStaticExtra1:");
    });

    it("emits an instance-extra assertion per shared class", () => {
        const source = checkSource("gtk", ["Widget"]);

        expect(source).toContain("const _noInstanceExtra0:");
        expect(source).toContain("implOnlyInstance: Exclude<keyof _Impl0, keyof _Contract0>");
    });

    it("keeps the forward and reverse assertions", () => {
        const source = checkSource("gobject", ["Object"]);

        expect(source).toContain("const _forward = impl satisfies Contract;");
        expect(source).toContain("const _reverse0 = (undefined as unknown as _Contract0) satisfies");
    });
});

describe("UNCONTRACTED_NAMESPACES", () => {
    it("excludes cairo from the conformance gate", () => {
        expect(UNCONTRACTED_NAMESPACES.has("cairo")).toBe(true);
    });
});
