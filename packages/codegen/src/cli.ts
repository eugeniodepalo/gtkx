#!/usr/bin/env node
import { Command } from "commander";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { GirParser } from "./gir-parser.js";
import { CodeGenerator } from "./code-generator.js";

const program = new Command();

program
  .name("gtkx-codegen")
  .description("Generate TypeScript FFI bindings from GIR files")
  .version("0.1.0");

program
  .command("generate <gir-file>")
  .description("Generate TypeScript bindings from a GIR file")
  .option("-o, --output <dir>", "Output directory", "./generated")
  .option("-n, --namespace <namespace>", "Override namespace name")
  .action(async (girFile: string, options) => {
    try {
      console.log(`Reading GIR file: ${girFile}`);
      const girContent = readFileSync(girFile, "utf-8");
      
      // Parse GIR file
      const parser = new GirParser();
      const namespace = parser.parse(girContent);
      console.log(`Parsed namespace: ${namespace.name} v${namespace.version}`);
      
      // Generate code
      const generator = new CodeGenerator({
        outputDir: options.output,
        namespace: options.namespace || namespace.name,
      });
      
      console.log(`Generating TypeScript bindings...`);
      const files = await generator.generateNamespace(namespace);
      
      // Write files
      const outputDir = join(options.output, namespace.name.toLowerCase());
      mkdirSync(outputDir, { recursive: true });
      
      for (const [filename, content] of files) {
        const filepath = join(outputDir, filename);
        console.log(`Writing ${filepath}`);
        writeFileSync(filepath, content);
      }
      
      console.log(`✓ Generated ${files.size} files in ${outputDir}`);
    } catch (error) {
      console.error("Error generating bindings:", error);
      process.exit(1);
    }
  });

program
  .command("batch <gir-dir>")
  .description("Generate TypeScript bindings from all GIR files in a directory")
  .option("-o, --output <dir>", "Output directory", "./generated")
  .option("-p, --pattern <pattern>", "GIR file pattern", "*.gir")
  .action(async (girDir: string, options) => {
    try {
      const { readdirSync } = await import("fs");
      const files = readdirSync(girDir).filter(f => f.endsWith(".gir"));
      
      console.log(`Found ${files.length} GIR files`);
      
      for (const file of files) {
        const girFile = join(girDir, file);
        console.log(`\nProcessing ${file}...`);
        
        try {
          const girContent = readFileSync(girFile, "utf-8");
          const parser = new GirParser();
          const namespace = parser.parse(girContent);
          
          const generator = new CodeGenerator({
            outputDir: options.output,
            namespace: namespace.name,
          });
          
          const generatedFiles = await generator.generateNamespace(namespace);
          
          const outputDir = join(options.output, namespace.name.toLowerCase());
          mkdirSync(outputDir, { recursive: true });
          
          for (const [filename, content] of generatedFiles) {
            const filepath = join(outputDir, filename);
            writeFileSync(filepath, content);
          }
          
          console.log(`✓ Generated ${generatedFiles.size} files for ${namespace.name}`);
        } catch (error) {
          console.error(`✗ Failed to process ${file}:`, error);
        }
      }
    } catch (error) {
      console.error("Error in batch generation:", error);
      process.exit(1);
    }
  });

program.parse();
