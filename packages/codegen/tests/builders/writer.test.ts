import { describe, expect, it } from "vitest";
import { Writer } from "../../src/builders/writer.js";

describe("Writer", () => {
    it("writes a simple string", () => {
        const w = new Writer();
        w.write("hello");
        expect(w.toString()).toBe("hello");
    });

    it("writes a line with newline", () => {
        const w = new Writer();
        w.writeLine("hello");
        expect(w.toString()).toBe("hello\n");
    });

    it("writes multiple lines", () => {
        const w = new Writer();
        w.writeLine("line1");
        w.writeLine("line2");
        expect(w.toString()).toBe("line1\nline2\n");
    });

    it("handles withIndent", () => {
        const w = new Writer();
        w.writeLine("outer");
        w.withIndent(() => {
            w.writeLine("inner");
        });
        w.writeLine("outer again");
        expect(w.toString()).toBe("outer\n    inner\nouter again\n");
    });

    it("handles nested withIndent", () => {
        const w = new Writer();
        w.writeLine("{");
        w.withIndent(() => {
            w.writeLine("level1");
            w.withIndent(() => {
                w.writeLine("level2");
            });
        });
        w.writeLine("}");
        expect(w.toString()).toBe("{\n    level1\n        level2\n}\n");
    });

    it("handles writeJoined", () => {
        const w = new Writer();
        w.writeJoined(", ", ["a", "b", "c"]);
        expect(w.toString()).toBe("a, b, c");
    });

    it("handles writeJoined with single item", () => {
        const w = new Writer();
        w.writeJoined(", ", ["only"]);
        expect(w.toString()).toBe("only");
    });

    it("handles writeJoined with empty array", () => {
        const w = new Writer();
        w.writeJoined(", ", []);
        expect(w.toString()).toBe("");
    });

    it("handles writeBlock", () => {
        const w = new Writer();
        w.write("if (true) ");
        w.writeBlock(() => {
            w.writeLine("doStuff();");
        });
        expect(w.toString()).toBe("if (true) {\n    doStuff();\n}");
    });

    it("handles newLine", () => {
        const w = new Writer();
        w.write("a");
        w.newLine();
        w.write("b");
        expect(w.toString()).toBe("a\nb");
    });

    it("indents multi-line strings correctly", () => {
        const w = new Writer();
        w.withIndent(() => {
            w.write("line1\nline2\nline3");
        });
        expect(w.toString()).toBe("    line1\n    line2\n    line3");
    });

    it("accepts Builder objects", () => {
        const w = new Writer();
        const builder = {
            write(writer: Writer) {
                writer.write("from builder");
            },
        };
        w.write(builder);
        expect(w.toString()).toBe("from builder");
    });

    it("handles empty write", () => {
        const w = new Writer();
        w.write("");
        expect(w.toString()).toBe("");
    });

    it("handles writeLine without argument", () => {
        const w = new Writer();
        w.write("hello");
        w.writeLine();
        w.write("world");
        expect(w.toString()).toBe("hello\nworld");
    });
});
