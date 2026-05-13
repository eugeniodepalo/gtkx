/**
 * FFI Generator
 *
 * Top-level orchestrator for generating TypeScript FFI bindings from GIR data.
 * Produces GeneratedFile arrays using FileBuilder.
 */

import { fileBuilder } from "../builders/file-builder.js";
import { stringify } from "../builders/stringify.js";
import { CodegenMetadata } from "../core/codegen-metadata.js";
import type { GeneratedFile } from "../core/generated-file-set.js";
import type { FfiGeneratorOptions } from "../core/generator-types.js";
import { FfiMapper } from "../core/type-system/ffi-mapper.js";
import { normalizeClassName, toKebabCase, toPascalCase } from "../core/utils/naming.js";
import { splitQualifiedName } from "../core/utils/qualified-name.js";
import { isClassVtable, shouldGenerateRecord } from "../core/utils/record-filter.js";
import type { GirClass, GirNamespace, GirRepository } from "../gir/index.js";
import { AliasGenerator } from "./generators/alias.js";
import { CallbackGenerator } from "./generators/callback.js";
import { ClassGenerator } from "./generators/class/index.js";
import { ClassStructGenerator } from "./generators/class-struct/index.js";
import { ConstantGenerator } from "./generators/constant.js";
import { EnumGenerator } from "./generators/enum.js";
import { FunctionGenerator } from "./generators/function.js";
import { InterfaceGenerator } from "./generators/interface.js";
import { RecordGenerator } from "./generators/record/index.js";

/**
 * Configuration for generating a namespace's FFI bindings.
 */
type FfiNamespaceConfig = {
    namespace: string;
    repository: GirRepository;
};

/**
 * Result of generating a namespace's FFI bindings.
 */
type FfiNamespaceResult = {
    files: GeneratedFile[];
    metadata: CodegenMetadata;
};

/**
 * Generates TypeScript FFI bindings for a GIR namespace.
 *
 * Processes classes, records, interfaces, enums, functions, and constants
 * from GIR data and outputs TypeScript wrappers for `@gtkx/ffi`.
 */
export class FfiGenerator {
    private readonly options: FfiNamespaceConfig;
    private readonly ffiMapper: FfiMapper;
    private readonly namespacePrefix: string;
    private readonly metadata = new CodegenMetadata();
    private readonly recordNameToFile = new Map<string, string>();
    private readonly interfaceNameToFile = new Map<string, string>();

    constructor(options: FfiNamespaceConfig) {
        this.options = options;
        this.ffiMapper = new FfiMapper(options.repository, options.namespace);
        this.namespacePrefix = `${options.namespace.toLowerCase()}/`;
    }

    private getNamespaceLibrary(namespaceName: string): string {
        const ns = this.options.repository.getNamespace(namespaceName);
        if (!ns?.sharedLibrary) {
            throw new Error(`No shared library found for namespace: ${namespaceName}`);
        }
        const firstLib = ns.sharedLibrary.split(",")[0];
        if (!firstLib) {
            throw new Error(`Invalid shared library format for namespace: ${namespaceName}`);
        }
        return firstLib.trim();
    }

    /**
     * Generates all FFI files for a namespace.
     */
    generateNamespace(namespaceName: string): FfiNamespaceResult {
        const namespace = this.options.repository.getNamespace(namespaceName);
        if (!namespace) {
            throw new Error(`Namespace ${namespaceName} not found in repository`);
        }

        const glibLibrary = this.getNamespaceLibrary("GLib");
        const gobjectLibrary = this.getNamespaceLibrary("GObject");

        this.ffiMapper.clearSkippedClasses();
        this.registerRecords(namespace);
        this.registerInterfaces(namespace);

        const files: GeneratedFile[] = [];

        const generatorOptions: FfiGeneratorOptions = {
            namespace: this.options.namespace,
            sharedLibrary: namespace.sharedLibrary,
            glibLibrary,
            gobjectLibrary,
        };

        const allEnums = [...namespace.enumerations.values(), ...namespace.bitfields.values()];
        if (allEnums.length > 0) {
            const file = fileBuilder();
            const enumGenerator = new EnumGenerator(file, { namespace: this.options.namespace });
            enumGenerator.addEnums(allEnums);
            files.push({ path: `${this.namespacePrefix}enums.ts`, content: stringify(file) });
        }

        this.generateRecordFiles(namespace, generatorOptions, files);
        this.generateClassFiles(namespace, generatorOptions, files);
        this.generateClassStructFiles(namespace, generatorOptions, files);

        for (const [, iface] of namespace.interfaces) {
            const file = fileBuilder();
            const interfaceGenerator = new InterfaceGenerator(
                this.ffiMapper,
                file,
                this.options.repository,
                generatorOptions,
            );

            interfaceGenerator.generate(iface);
            const fileName = `${toKebabCase(iface.name)}.ts`;
            files.push({ path: `${this.namespacePrefix}${fileName}`, content: stringify(file) });
        }

        const standaloneFunctions = [...namespace.functions.values()];
        if (standaloneFunctions.length > 0) {
            const file = fileBuilder();
            const functionGenerator = new FunctionGenerator(this.ffiMapper, file, generatorOptions);
            functionGenerator.generate(standaloneFunctions);
            files.push({ path: `${this.namespacePrefix}functions.ts`, content: stringify(file) });
        }

        if (namespace.constants.size > 0) {
            const file = fileBuilder();
            const constantGenerator = new ConstantGenerator(file, { namespace: this.options.namespace });
            constantGenerator.addConstants([...namespace.constants.values()]);
            files.push({ path: `${this.namespacePrefix}constants.ts`, content: stringify(file) });
        }

        if (namespace.aliases.size > 0) {
            const file = fileBuilder();
            const aliasGenerator = new AliasGenerator(file, { namespace: this.options.namespace });
            aliasGenerator.addAliases([...namespace.aliases.values()]);
            files.push({ path: `${this.namespacePrefix}aliases.ts`, content: stringify(file) });
        }

        if (namespace.callbacks.size > 0) {
            const file = fileBuilder();
            const callbackGenerator = new CallbackGenerator(file, { namespace: this.options.namespace });
            callbackGenerator.addCallbacks([...namespace.callbacks.values()]);
            files.push({ path: `${this.namespacePrefix}callbacks.ts`, content: stringify(file) });
        }

        const indexContent = this.generateIndexFile(files);
        files.push({ path: `${this.namespacePrefix}index.ts`, content: indexContent });

        return { files, metadata: this.metadata };
    }

    private generateRecordFiles(
        namespace: GirNamespace,
        generatorOptions: FfiGeneratorOptions,
        files: GeneratedFile[],
    ): void {
        for (const [, record] of namespace.records) {
            if (!shouldGenerateRecord(record, this.options.repository, this.options.namespace)) continue;
            const file = fileBuilder();
            const recordGenerator = new RecordGenerator(
                this.ffiMapper,
                file,
                generatorOptions,
                this.options.repository,
            );
            recordGenerator.generate(record);
            const fileName = `${toKebabCase(record.name)}.ts`;
            files.push({ path: `${this.namespacePrefix}${fileName}`, content: stringify(file) });
        }
    }

    private generateClassStructFiles(
        namespace: GirNamespace,
        generatorOptions: FfiGeneratorOptions,
        files: GeneratedFile[],
    ): void {
        for (const [, record] of namespace.records) {
            if (!isClassVtable(record)) continue;
            const file = fileBuilder();
            const generator = new ClassStructGenerator(this.ffiMapper, file, generatorOptions, this.options.repository);
            if (!generator.generate(record)) continue;
            const fileName = `${toKebabCase(record.name)}.ts`;
            files.push({ path: `${this.namespacePrefix}${fileName}`, content: stringify(file) });
        }
    }

    private generateClassFiles(
        namespace: GirNamespace,
        generatorOptions: FfiGeneratorOptions,
        files: GeneratedFile[],
    ): void {
        const sortedClasses = this.topologicalSortClasses([...namespace.classes.values()]);
        for (const cls of sortedClasses) {
            const file = fileBuilder();
            const classGenerator = new ClassGenerator(
                cls,
                this.ffiMapper,
                file,
                this.options.repository,
                generatorOptions,
            );

            const result = classGenerator.generate();

            const fileName = `${toKebabCase(cls.name)}.ts`;
            files.push({ path: `${this.namespacePrefix}${fileName}`, content: stringify(file) });

            if (result.widgetMeta) {
                this.metadata.addWidgetMeta(result.widgetMeta);
            }
            if (result.controllerMeta) {
                this.metadata.addControllerMeta(result.controllerMeta);
            }
        }
    }

    private generateIndexFile(files: GeneratedFile[]): string {
        const fileNames = files
            .map((f) => f.path.replace(this.namespacePrefix, "").replace(/\.ts$/, ""))
            .filter((name) => name !== "index")
            .sort((a, b) => a.localeCompare(b));

        if (fileNames.length === 0) return "";

        const namespaceAliases = fileNames.map((name, index) => ({
            modulePath: `./${name}.js`,
            alias: `__ns_${index}`,
        }));

        const reExports = fileNames.map((name) => `export * from "./${name}.js";`);
        const namespaceImports = namespaceAliases.map(
            ({ modulePath, alias }) => `import * as ${alias} from "${modulePath}";`,
        );
        const intersectionType = namespaceAliases.map(({ alias }) => `typeof ${alias}`).join(" & ");
        const assignArgs = namespaceAliases.map(({ alias }) => alias).join(", ");
        const namespaceVar = this.options.namespace;

        return [
            ...reExports,
            "",
            ...namespaceImports,
            "",
            `const ${namespaceVar}: ${intersectionType} = Object.assign({}, ${assignArgs});`,
            "",
            `export { ${namespaceVar} };`,
            `export default ${namespaceVar};`,
            "",
        ].join("\n");
    }

    private registerRecords(namespace: GirNamespace): void {
        for (const [, record] of namespace.records) {
            if (shouldGenerateRecord(record, this.options.repository, this.options.namespace)) {
                const normalizedName = normalizeClassName(record.name);
                this.recordNameToFile.set(normalizedName, record.name);
            }
        }
    }

    private registerInterfaces(namespace: GirNamespace): void {
        for (const [, iface] of namespace.interfaces) {
            const normalizedName = toPascalCase(iface.name);
            this.interfaceNameToFile.set(normalizedName, iface.name);
        }
    }

    private topologicalSortClasses(classes: GirClass[]): GirClass[] {
        const classMap = new Map<string, GirClass>();
        for (const cls of classes) {
            classMap.set(cls.name, cls);
        }

        const sorted: GirClass[] = [];
        const visited = new Set<string>();

        const visit = (cls: GirClass) => {
            if (visited.has(cls.name)) return;
            visited.add(cls.name);
            if (cls.parent) {
                const { name: parentName } = splitQualifiedName(cls.parent);
                const parent = classMap.get(parentName);
                if (parent) {
                    visit(parent);
                }
            }
            sorted.push(cls);
        };

        for (const cls of classes) {
            visit(cls);
        }

        return sorted;
    }
}
