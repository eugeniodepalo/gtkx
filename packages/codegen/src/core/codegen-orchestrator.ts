import { readdir } from "node:fs/promises";
import { GirRepository } from "@gtkx/gir";
import { FfiGenerator } from "../ffi/ffi-generator.js";
import { ReactGenerator } from "../react/react-generator.js";
import { CodegenMetadata, type CodegenWidgetMeta } from "./codegen-metadata.js";
import type { GeneratedFile } from "./generated-file-set.js";

/**
 * Configuration for {@link CodegenOrchestrator}.
 *
 * Either provide explicit `libraries` + `girPath` (preferred for the
 * user-facing CLI), or `girsDir` to enumerate every `.gir` file in a single
 * directory and use it both as the root list and as the search path
 * (preserved for the monorepo's checked-in `./girs/` flow).
 */
type CodegenOrchestratorOptions = {
    /** Explicit GIR namespace identifiers (e.g. `"Gtk-4.0"`). */
    libraries?: string[];
    /** Search directories for resolving `.gir` files and their dependencies. */
    girPath?: string[];
    /** Single directory whose `.gir` files form the input set and search path. */
    girsDir?: string;
};

type CodegenResult = {
    ffiFiles: Map<string, string>;
    reactFiles: Map<string, string>;
    stats: CodegenStats;
};

type CodegenStats = {
    namespaces: number;
    widgets: number;
    totalFiles: number;
    duration: number;
};

export class CodegenOrchestrator {
    private readonly options: CodegenOrchestratorOptions;
    private readonly metadata = new CodegenMetadata();
    private readonly ffiGeneratedFiles: GeneratedFile[] = [];
    private readonly reactGeneratedFiles: GeneratedFile[] = [];
    private repository!: GirRepository;

    constructor(options: CodegenOrchestratorOptions) {
        if (!options.girsDir && (!options.libraries || !options.girPath)) {
            throw new Error("CodegenOrchestrator: provide either `girsDir` or both `libraries` and `girPath`");
        }
        this.options = options;
    }

    async generate(): Promise<CodegenResult> {
        const startTime = performance.now();

        await this.loadRepository();
        this.generateFfi();
        this.generateReact();

        const ffiFiles = new Map<string, string>();
        for (const file of this.ffiGeneratedFiles) {
            ffiFiles.set(file.path, file.content);
        }

        const reactFiles = new Map<string, string>();
        for (const file of this.reactGeneratedFiles) {
            reactFiles.set(file.path, file.content);
        }

        const duration = performance.now() - startTime;
        const stats = this.computeStats(ffiFiles, reactFiles, duration);

        return { ffiFiles, reactFiles, stats };
    }

    getRepository(): GirRepository {
        return this.repository;
    }

    getAllWidgetMeta(): CodegenWidgetMeta[] {
        return this.metadata.getAllWidgetMeta();
    }

    private async loadRepository(): Promise<void> {
        const { libraries, girPath, girsDir } = this.options;
        if (libraries && girPath) {
            this.repository = await GirRepository.load(libraries, { girPath });
            return;
        }
        if (girsDir) {
            const roots = await getNamespaceRoots(girsDir);
            this.repository = await GirRepository.load(roots, { girPath: [girsDir] });
            return;
        }
        throw new Error("CodegenOrchestrator: missing input configuration");
    }

    private generateFfi(): void {
        const allNamespaces = this.repository.getNamespaceNames();

        for (const namespace of allNamespaces) {
            const generator = new FfiGenerator({
                namespace,
                repository: this.repository,
            });

            const result = generator.generateNamespace(namespace);
            this.ffiGeneratedFiles.push(...result.files);

            for (const meta of result.metadata.getAllWidgetMeta()) {
                this.metadata.setWidgetMeta(meta.jsxName, meta);
            }
            for (const meta of result.metadata.getAllControllerMeta()) {
                this.metadata.setControllerMeta(meta.jsxName, meta);
            }
        }
    }

    private generateReact(): void {
        const widgetMeta = this.metadata.getAllWidgetMeta();
        if (widgetMeta.length === 0) {
            return;
        }

        const controllerMeta = this.metadata.getAllControllerMeta();
        const namespaceNames = [...new Set(widgetMeta.map((m) => m.namespace))];
        const generator = new ReactGenerator(widgetMeta, controllerMeta, namespaceNames);
        this.reactGeneratedFiles.push(...generator.generate());
    }

    private computeStats(
        ffiFiles: Map<string, string>,
        reactFiles: Map<string, string>,
        duration: number,
    ): CodegenStats {
        const widgetMeta = this.metadata.getAllWidgetMeta();

        return {
            namespaces: this.repository.getNamespaceNames().length,
            widgets: widgetMeta.length,
            totalFiles: ffiFiles.size + reactFiles.size,
            duration: Math.round(duration),
        };
    }
}

async function getNamespaceRoots(girsDir: string): Promise<string[]> {
    const files = await readdir(girsDir);
    return files.filter((f) => f.endsWith(".gir")).map((f) => f.replace(/\.gir$/, ""));
}
