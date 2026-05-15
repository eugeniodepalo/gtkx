import { FfiGenerator } from "../ffi/ffi-generator.js";
import { GirRepository } from "../gir/index.js";
import { ReactGenerator } from "../react/react-generator.js";
import { CodegenMetadata } from "./codegen-metadata.js";
import type { GeneratedFile } from "./generated-file-set.js";

/**
 * Configuration for {@link CodegenOrchestrator}.
 *
 * Provide explicit `libraries` + `girPath` describing the GIR namespaces to
 * generate and the directories to resolve them and their dependencies from.
 */
type CodegenOrchestratorOptions = {
    /** Explicit GIR namespace identifiers (e.g. `"Gtk-4.0"`). */
    libraries: string[];
    /** Search directories for resolving `.gir` files and their dependencies. */
    girPath: string[];
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

    private async loadRepository(): Promise<void> {
        this.repository = await GirRepository.load(this.options.libraries, { girPath: this.options.girPath });
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
                this.metadata.addWidgetMeta(meta);
            }
            for (const meta of result.metadata.getAllControllerMeta()) {
                this.metadata.addControllerMeta(meta);
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
