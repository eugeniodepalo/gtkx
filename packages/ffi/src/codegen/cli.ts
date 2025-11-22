import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Command } from "commander";
import { CodeGenerator } from "./code-generator.js";
import { GirParser } from "@gtkx/gir";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// List of important GIR files for GTK 4 development
const IMPORTANT_GIRS = new Set([
	"GLib-2.0.gir",
	"GModule-2.0.gir",
	"GObject-2.0.gir",
	"Gdk-4.0.gir",
	"GdkPixbuf-2.0.gir",
	"Gio-2.0.gir",
	"Graphene-1.0.gir",
	"Gsk-4.0.gir",
	"Gtk-4.0.gir",
	"HarfBuzz-0.0.gir",
	"Pango-1.0.gir",
	"PangoCairo-1.0.gir",
	"cairo-1.0.gir",
	"freetype2-2.0.gir",
]);

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
	.option("--all", "Process all GIR files (default: only important ones)")
	.action(async (girDir: string, options) => {
		try {
			const { readdirSync } = await import("node:fs");
			let files = readdirSync(girDir).filter((f) => f.endsWith(".gir"));

			// Filter to important GIR files unless --all flag is used
			if (!options.all) {
				files = files.filter((f) => IMPORTANT_GIRS.has(f));
				console.log(
					`Found ${files.length} important GIR files (use --all to process all)`,
				);
			} else {
				console.log(`Found ${files.length} GIR files`);
			}

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

					console.log(
						`✓ Generated ${generatedFiles.size} files for ${namespace.name}`,
					);
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
