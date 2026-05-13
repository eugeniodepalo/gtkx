import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { CodegenOrchestrator } from "../../core/codegen-orchestrator.js";
import { appendConformanceFooter } from "./conformance.js";
import { transpileToJs } from "./transpile.js";

/**
 * Runs the existing FFI codegen and post-processes every emitted `.ts` file
 * into a raw `.js` file augmented with `@type` JSDoc conformance assertions
 * pointing at the per-namespace ts-for-gir-produced `.d.ts` contract. The
 * intermediate `.ts` text is never written to disk — it exists only as an
 * in-memory string that the post-processor consumes.
 *
 * Per-namespace files land at `<outDir>/<ns>/<basename>.js`, mirroring the
 * existing FFI layout under `packages/ffi/src/generated/`. The companion
 * `.d.ts` from the types pipeline is expected to live at `<outDir>/<ns>/<ns>.d.ts`.
 *
 * @param girsDir Directory containing the GIR XML files to process.
 * @param outDir Destination root for per-namespace `.js` output.
 */
export async function runFfiJsPipeline(girsDir: string, outDir: string): Promise<FfiJsPipelineResult> {
    const orchestrator = new CodegenOrchestrator({ girsDir });
    const result = await orchestrator.generate();

    const filesByNamespace = groupByNamespace(result.ffiFiles);
    let totalFiles = 0;

    for (const [namespace, files] of filesByNamespace) {
        const namespaceDir = join(outDir, namespace);
        await mkdir(namespaceDir, { recursive: true });
        const pascalNamespace = namespacePascalCase(namespace);
        const declarationModulePath = `./${namespace}.d.ts`;

        for (const [originalPath, tsSource] of files) {
            const jsSource = transpileToJs(tsSource);
            const withConformance = appendConformanceFooter(jsSource, pascalNamespace, declarationModulePath);
            const targetPath = join(outDir, swapExtension(originalPath, ".js"));
            await mkdir(dirname(targetPath), { recursive: true });
            await writeFile(targetPath, withConformance, "utf-8");
            totalFiles += 1;
        }
    }

    return { namespaces: [...filesByNamespace.keys()].sort(), totalFiles };
}

/**
 * Summary returned by {@link runFfiJsPipeline}.
 */
export interface FfiJsPipelineResult {
    /** Sorted list of namespace directories that received `.js` files. */
    namespaces: string[];
    /** Total number of `.js` files written. */
    totalFiles: number;
}

function groupByNamespace(files: Map<string, string>): Map<string, Map<string, string>> {
    const grouped = new Map<string, Map<string, string>>();
    for (const [path, content] of files) {
        const namespace = path.split("/")[0];
        if (!namespace) continue;
        let bucket = grouped.get(namespace);
        if (!bucket) {
            bucket = new Map<string, string>();
            grouped.set(namespace, bucket);
        }
        bucket.set(path, content);
    }
    return grouped;
}

function swapExtension(path: string, newExt: string): string {
    return path.replace(/\.ts$/, newExt);
}

const PASCAL_OVERRIDES: Record<string, string> = {
    glib: "GLib",
    gobject: "GObject",
    gdk: "Gdk",
    gdkpixbuf: "GdkPixbuf",
    gio: "Gio",
    gmodule: "GModule",
    gsk: "Gsk",
    gst: "Gst",
    gstaudio: "GstAudio",
    gstbase: "GstBase",
    gstpbutils: "GstPbutils",
    gstvideo: "GstVideo",
    gtk: "Gtk",
    gtksource: "GtkSource",
    pango: "Pango",
    pangocairo: "PangoCairo",
    graphene: "Graphene",
    harfbuzz: "HarfBuzz",
    javascriptcore: "JavaScriptCore",
    adw: "Adw",
    ges: "GES",
    soup: "Soup",
    vte: "Vte",
    webkit: "WebKit",
    cairo: "cairo",
    freetype2: "freetype2",
};

function namespacePascalCase(directoryName: string): string {
    const override = PASCAL_OVERRIDES[directoryName];
    if (override) return override;
    return directoryName.charAt(0).toUpperCase() + directoryName.slice(1);
}
