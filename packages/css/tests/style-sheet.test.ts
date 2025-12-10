import { describe, expect, it } from "vitest";
import { StyleSheet } from "../src/style-sheet.js";
import { setup } from "./test-setup.js";

setup();

describe("StyleSheet", () => {
    describe("constructor", () => {
        it("stores the key from options", () => {
            const sheet = new StyleSheet({ key: "test-key" });
            expect(sheet.key).toBe("test-key");
        });

        it("creates independent instances", () => {
            const sheet1 = new StyleSheet({ key: "key-one" });
            const sheet2 = new StyleSheet({ key: "key-two" });

            expect(sheet1).not.toBe(sheet2);
            expect(sheet1.key).not.toBe(sheet2.key);
        });
    });

    describe("insert", () => {
        it("accepts valid CSS rule strings without throwing", () => {
            const sheet = new StyleSheet({ key: "insert-test" });

            expect(() => sheet.insert(".test { color: red; }")).not.toThrow();
            expect(() => sheet.insert("button { padding: 10px; }")).not.toThrow();
            expect(() => sheet.insert("label.title { font-weight: bold; }")).not.toThrow();
        });

        it("accepts GTK-specific CSS syntax without throwing", () => {
            const sheet = new StyleSheet({ key: "gtk-syntax" });

            expect(() => sheet.insert("button { background: @theme_bg_color; }")).not.toThrow();
            expect(() => sheet.insert("window.background { background: #ffffff; }")).not.toThrow();
        });

        it("accepts empty rule string without throwing", () => {
            const sheet = new StyleSheet({ key: "empty-rule" });
            expect(() => sheet.insert("")).not.toThrow();
        });
    });

    describe("flush", () => {
        it("clears state allowing reuse", () => {
            const sheet = new StyleSheet({ key: "flush-test" });

            sheet.insert(".rule1 { color: red; }");
            sheet.applyQueuedRules();
            sheet.flush();

            expect(() => sheet.insert(".rule2 { color: blue; }")).not.toThrow();
            expect(() => sheet.applyQueuedRules()).not.toThrow();
        });

        it("can be called on empty StyleSheet without throwing", () => {
            const sheet = new StyleSheet({ key: "empty-flush" });
            expect(() => sheet.flush()).not.toThrow();
        });

        it("can be called multiple times without throwing", () => {
            const sheet = new StyleSheet({ key: "multi-flush" });

            sheet.insert(".rule1 { color: red; }");
            sheet.applyQueuedRules();

            expect(() => sheet.flush()).not.toThrow();
            expect(() => sheet.flush()).not.toThrow();
        });
    });

    describe("hydrate", () => {
        it("is a no-op that accepts arrays without throwing", () => {
            const sheet = new StyleSheet({ key: "hydrate-test" });

            expect(() => sheet.hydrate([])).not.toThrow();
            expect(() => sheet.hydrate(["element1", "element2"])).not.toThrow();
        });
    });

    describe("applyQueuedRules", () => {
        it("applies queued rules without throwing", () => {
            const sheet = new StyleSheet({ key: "apply-queued" });
            sheet.insert(".queued { color: red; }");

            expect(() => sheet.applyQueuedRules()).not.toThrow();
        });

        it("can be called on empty StyleSheet without throwing", () => {
            const sheet = new StyleSheet({ key: "apply-empty" });
            expect(() => sheet.applyQueuedRules()).not.toThrow();
        });

        it("can be called multiple times without throwing", () => {
            const sheet = new StyleSheet({ key: "apply-multiple" });

            sheet.insert(".rule1 { color: red; }");
            expect(() => sheet.applyQueuedRules()).not.toThrow();

            sheet.insert(".rule2 { color: blue; }");
            expect(() => sheet.applyQueuedRules()).not.toThrow();
        });
    });

    describe("lifecycle", () => {
        it("supports full insert-apply-flush-reinsert cycle", () => {
            const sheet = new StyleSheet({ key: "lifecycle" });

            sheet.insert(".initial { color: red; }");
            sheet.applyQueuedRules();
            sheet.flush();
            sheet.insert(".after-flush { color: blue; }");
            sheet.applyQueuedRules();

            expect(sheet.key).toBe("lifecycle");
        });
    });
});
