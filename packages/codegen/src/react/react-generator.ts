/**
 * React Generator
 *
 * Generates React/JSX bindings from widget metadata.
 *
 * Creates JSX intrinsic elements, internal implementations, and
 * component registry for `@gtkx/react`.
 */

import { fileBuilder, stringify } from "../builders/index.js";
import type { CodegenControllerMeta, CodegenWidgetMeta } from "../core/codegen-metadata.js";
import type { GeneratedFile } from "../core/generated-file-set.js";
import { CompoundsGenerator } from "./generators/compounds-generator.js";
import { InternalGenerator } from "./generators/internal.js";
import { JsxTypesGenerator } from "./generators/jsx-types/index.js";
import { RegistryGenerator } from "./generators/registry.js";
import { MetadataReader } from "./metadata-reader.js";

export class ReactGenerator {
    private readonly reader: MetadataReader;

    constructor(
        widgetMeta: readonly CodegenWidgetMeta[],
        private readonly controllers: readonly CodegenControllerMeta[],
        private readonly namespaceNames: string[],
    ) {
        this.reader = new MetadataReader(widgetMeta);
    }

    generate(): GeneratedFile[] {
        const files: GeneratedFile[] = [];

        const internalFile = fileBuilder();
        const internalGenerator = new InternalGenerator(this.reader, this.controllers);
        internalGenerator.generate(internalFile);
        files.push({ path: "internal.ts", content: stringify(internalFile) });

        const compoundsGenerator = new CompoundsGenerator(this.reader, this.controllers, this.namespaceNames);

        const jsxFile = fileBuilder();
        const jsxTypesGenerator = new JsxTypesGenerator(
            this.reader,
            this.controllers,
            this.namespaceNames,
            compoundsGenerator.getCompoundJsxNames(),
        );
        jsxTypesGenerator.generate(jsxFile);
        files.push({ path: "jsx.ts", content: stringify(jsxFile) });

        const compoundsFile = fileBuilder();
        compoundsGenerator.generate(compoundsFile);
        files.push({ path: "compounds.ts", content: stringify(compoundsFile) });

        const registryFile = fileBuilder();
        const registryGenerator = new RegistryGenerator(this.namespaceNames);
        registryGenerator.generate(registryFile);
        files.push({ path: "registry.ts", content: stringify(registryFile) });

        return files;
    }
}
