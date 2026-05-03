import { describe, expect, it } from "vitest";
import { main } from "../src/cli.js";

describe("gtkx-codegen CLI", () => {
    it("declares the expected name and description", async () => {
        const meta = typeof main.meta === "function" ? await main.meta() : main.meta;
        expect(meta?.name).toBe("gtkx-codegen");
        expect(meta?.description).toContain("Code generation");
    });

    it("ships a non-empty version string", async () => {
        const meta = typeof main.meta === "function" ? await main.meta() : main.meta;
        expect(meta?.version).toMatch(/^\d+\.\d+\.\d+/);
    });

    it("exposes run and sync as subcommands", async () => {
        const subCommands = typeof main.subCommands === "function" ? await main.subCommands() : main.subCommands;
        expect(subCommands).toBeDefined();
        expect(Object.keys(subCommands ?? {})).toEqual(expect.arrayContaining(["run", "sync"]));
    });
});
