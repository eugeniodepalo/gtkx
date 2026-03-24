import { describe, expect, it } from "vitest";
import { exportFileBuilder } from "../../src/builders/export-file-builder.js";
import { stringify } from "../../src/builders/stringify.js";

describe("ExportFileBuilder", () => {
    it("renders sorted export statements", () => {
        const builder = exportFileBuilder()
            .addExportFrom("./widget.js")
            .addExportFrom("./button.js")
            .addExportFrom("./avatar.js");

        const output = stringify(builder);
        expect(output).toBe(
            'export * from "./avatar.js";\nexport * from "./button.js";\nexport * from "./widget.js";\n',
        );
    });

    it("handles empty", () => {
        const builder = exportFileBuilder();
        expect(stringify(builder)).toBe("");
    });
});
