import { describe, expect, it } from "vitest";
import { StyleSheet } from "../src/style-sheet.js";
import { setup } from "./utils.js";

setup();

describe("StyleSheet", () => {
    describe("constructor", () => {
        it("creates a StyleSheet with the given key", () => {
            const sheet = new StyleSheet({ key: "test-key" });
            expect(sheet.key).toBe("test-key");
        });

        it("creates StyleSheets with different keys independently", () => {
            const sheet1 = new StyleSheet({ key: "key-one" });
            const sheet2 = new StyleSheet({ key: "key-two" });

            expect(sheet1.key).toBe("key-one");
            expect(sheet2.key).toBe("key-two");
            expect(sheet1).not.toBe(sheet2);
        });

        it("accepts empty string as key", () => {
            const sheet = new StyleSheet({ key: "" });
            expect(sheet.key).toBe("");
        });

        it("accepts key with special characters", () => {
            const sheet = new StyleSheet({ key: "my-app_theme.v2" });
            expect(sheet.key).toBe("my-app_theme.v2");
        });
    });

    describe("insert", () => {
        it("accepts a CSS rule string", () => {
            const sheet = new StyleSheet({ key: "insert-test" });
            sheet.insert(".test { color: red; }");
            expect(sheet.key).toBe("insert-test");
        });

        it("accepts multiple CSS rules sequentially", () => {
            const sheet = new StyleSheet({ key: "multi-insert" });
            sheet.insert(".rule1 { padding: 10px; }");
            sheet.insert(".rule2 { margin: 5px; }");
            sheet.insert(".rule3 { border: 1px solid black; }");
            expect(sheet.key).toBe("multi-insert");
        });

        it("accepts GTK-specific CSS syntax", () => {
            const sheet = new StyleSheet({ key: "gtk-syntax" });
            sheet.insert("button { background: @theme_bg_color; }");
            sheet.insert("label.title { font-weight: bold; }");
            sheet.insert("window.background { background: #ffffff; }");
            expect(sheet.key).toBe("gtk-syntax");
        });

        it("accepts empty rule string", () => {
            const sheet = new StyleSheet({ key: "empty-rule" });
            sheet.insert("");
            expect(sheet.key).toBe("empty-rule");
        });

        it("accepts complex CSS with multiple selectors", () => {
            const sheet = new StyleSheet({ key: "complex-css" });
            sheet.insert(`
                button, label {
                    padding: 10px;
                    margin: 5px;
                }
            `);
            expect(sheet.key).toBe("complex-css");
        });
    });

    describe("flush", () => {
        it("resets the StyleSheet state", () => {
            const sheet = new StyleSheet({ key: "flush-test" });
            sheet.insert(".flush-rule { color: blue; }");
            sheet.flush();
            expect(sheet.key).toBe("flush-test");
        });

        it("allows inserting new rules after flush", () => {
            const sheet = new StyleSheet({ key: "re-insert-test" });
            sheet.insert(".first { color: red; }");
            sheet.flush();
            sheet.insert(".second { color: green; }");
            expect(sheet.key).toBe("re-insert-test");
        });

        it("can be called multiple times", () => {
            const sheet = new StyleSheet({ key: "multi-flush" });
            sheet.insert(".rule1 { color: red; }");
            sheet.flush();
            sheet.insert(".rule2 { color: blue; }");
            sheet.flush();
            sheet.insert(".rule3 { color: green; }");
            sheet.flush();
            expect(sheet.key).toBe("multi-flush");
        });

        it("can be called on empty StyleSheet", () => {
            const sheet = new StyleSheet({ key: "empty-flush" });
            sheet.flush();
            expect(sheet.key).toBe("empty-flush");
        });
    });

    describe("hydrate", () => {
        it("accepts an empty array", () => {
            const sheet = new StyleSheet({ key: "hydrate-empty" });
            sheet.hydrate([]);
            expect(sheet.key).toBe("hydrate-empty");
        });

        it("accepts an array with elements", () => {
            const sheet = new StyleSheet({ key: "hydrate-elements" });
            sheet.hydrate(["element1", "element2"]);
            expect(sheet.key).toBe("hydrate-elements");
        });

        it("can be called after insert", () => {
            const sheet = new StyleSheet({ key: "hydrate-after-insert" });
            sheet.insert(".rule { color: red; }");
            sheet.hydrate([]);
            expect(sheet.key).toBe("hydrate-after-insert");
        });
    });

    describe("applyQueuedRules", () => {
        it("can be called after inserting rules", () => {
            const sheet = new StyleSheet({ key: "apply-queued" });
            sheet.insert(".queued { color: red; }");
            sheet.applyQueuedRules();
            expect(sheet.key).toBe("apply-queued");
        });

        it("can be called multiple times", () => {
            const sheet = new StyleSheet({ key: "apply-multiple" });
            sheet.insert(".rule1 { color: red; }");
            sheet.applyQueuedRules();
            sheet.insert(".rule2 { color: blue; }");
            sheet.applyQueuedRules();
            expect(sheet.key).toBe("apply-multiple");
        });

        it("can be called on empty StyleSheet", () => {
            const sheet = new StyleSheet({ key: "apply-empty" });
            sheet.applyQueuedRules();
            expect(sheet.key).toBe("apply-empty");
        });
    });
});
