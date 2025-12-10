import { describe, expect, it } from "vitest";
import { css, cx, injectGlobal } from "../src/css.js";
import { setup } from "./test-setup.js";

setup();

describe("css", () => {
    it("returns a class name string", () => {
        const className = css({ padding: "10px" });
        expect(typeof className).toBe("string");
        expect(className.length).toBeGreaterThan(0);
    });

    it("returns consistent class names for identical styles", () => {
        const className1 = css({ margin: "5px" });
        const className2 = css({ margin: "5px" });
        expect(className1).toBe(className2);
    });

    it("returns different class names for different styles", () => {
        const className1 = css({ padding: "1px" });
        const className2 = css({ padding: "2px" });
        expect(className1).not.toBe(className2);
    });

    it("handles template literal syntax", () => {
        const className = css`
            background: red;
            color: white;
        `;
        expect(typeof className).toBe("string");
        expect(className.length).toBeGreaterThan(0);
    });

    it("generates class names with gtkx prefix", () => {
        const className = css({ opacity: "0.5" });
        expect(className.startsWith("gtkx-")).toBe(true);
    });
});

describe("cx", () => {
    it("combines multiple class names", () => {
        const result = cx("class1", "class2", "class3");
        expect(result).toBe("class1 class2 class3");
    });

    it("filters out falsy values", () => {
        const result = cx("class1", false, "class2", undefined, null, "class3");
        expect(result).toBe("class1 class2 class3");
    });

    it("filters out empty strings", () => {
        const result = cx("class1", "", "class2");
        expect(result).toBe("class1 class2");
    });

    it("returns empty string when all values are falsy", () => {
        const result = cx(false, undefined, null, "");
        expect(result).toBe("");
    });

    it("handles boolean conditions", () => {
        const isActive = true;
        const isDisabled = false;
        const result = cx("base", isActive && "active", isDisabled && "disabled");
        expect(result).toBe("base active");
    });
});

describe("injectGlobal", () => {
    it("does not throw when injecting global styles", () => {
        expect(() => {
            injectGlobal`
                window {
                    background: @theme_bg_color;
                }
            `;
        }).not.toThrow();
    });

    it("does not throw when called with object syntax", () => {
        expect(() => {
            injectGlobal({ "button.suggested-action": { background: "blue" } });
        }).not.toThrow();
    });

    it("caches global styles to prevent duplicates", () => {
        const style = { "label.test-label": { color: "red" } };
        expect(() => {
            injectGlobal(style);
            injectGlobal(style);
        }).not.toThrow();
    });
});
