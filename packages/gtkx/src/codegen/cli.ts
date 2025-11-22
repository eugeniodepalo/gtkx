import { readFileSync, writeFileSync } from "node:fs";
import { Command } from "commander";
import { GirParser } from "@gtkx/gir";
import { TypeMapper } from "@gtkx/ffi/codegen";
import { JsxGenerator } from "./jsx-generator.js";

const program = new Command();

program
  .name("gtkx-jsx-codegen")
  .description("Generate JSX type definitions from GTK GIR file")
  .version("0.1.0");

program
  .command("generate <gir-file>")
  .description("Generate JSX types from a GTK GIR file")
  .option("-o, --output <file>", "Output file", "./src/generated/jsx.ts")
  .action(async (girFile: string, options) => {
    try {
      console.log(`Reading GIR file: ${girFile}`);
      const girContent = readFileSync(girFile, "utf-8");

      // Parse GIR file
      const parser = new GirParser();
      const namespace = parser.parse(girContent);
      console.log(`Parsed namespace: ${namespace.name} v${namespace.version}`);

      // Only process GTK 4.x namespaces
      if (namespace.name !== "Gtk" || !namespace.version.startsWith("4")) {
        throw new Error(
          `Expected Gtk 4.x namespace, got ${namespace.name} ${namespace.version}`
        );
      }

      // Build class map
      const classMap = new Map();
      for (const cls of namespace.classes) {
        classMap.set(cls.name, cls);
      }

      // Generate JSX types
      const typeMapper = new TypeMapper();
      const generator = new JsxGenerator(typeMapper);
      console.log(`Generating JSX type definitions...`);
      const content = await generator.generate(namespace, classMap);

      // Write file
      console.log(`Writing ${options.output}`);
      writeFileSync(options.output, content);

      console.log("Done!");
    } catch (error) {
      console.error("Error:", error);
      process.exit(1);
    }
  });

program.parse();
