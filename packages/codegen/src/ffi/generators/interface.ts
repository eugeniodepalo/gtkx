/**
 * Interface Generator
 *
 * Generates interface classes using the builder library.
 * Interfaces in GObject are like mixins/traits that classes can implement.
 */

import type { FileBuilder } from "../../builders/file-builder.js";
import { classDecl, interfaceDecl, namespaceDecl } from "../../builders/index.js";
import type { FfiGeneratorOptions } from "../../core/generator-types.js";
import type { FfiMapper } from "../../core/type-system/ffi-mapper.js";
import { SELF_TYPE_GOBJECT } from "../../core/type-system/ffi-types.js";
import { collectGObjectMethodNames } from "../../core/utils/class-traversal.js";
import { buildJsDocStructure } from "../../core/utils/doc-formatter.js";
import { filterSupportedMethods } from "../../core/utils/filtering.js";
import { generateConflictingMethodName, toCamelCase, toKebabCase, toPascalCase } from "../../core/utils/naming.js";
import { splitQualifiedName } from "../../core/utils/qualified-name.js";
import {
    addMethodStructure,
    createMethodBodyWriter,
    type MethodBodyWriter,
    type MethodStructure,
} from "../../core/writers/index.js";
import type { GirInterface, GirMethod, GirRepository } from "../../gir/index.js";

/**
 * Generates interface classes.
 */
export class InterfaceGenerator {
    private readonly methodBody: MethodBodyWriter;
    private readonly methodRenames = new Map<string, string>();

    constructor(
        ffiMapper: FfiMapper,
        private readonly file: FileBuilder,
        private readonly repository: GirRepository,
        private readonly options: FfiGeneratorOptions,
    ) {
        this.methodBody = createMethodBodyWriter(ffiMapper, file, {
            sharedLibrary: options.sharedLibrary,
            glibLibrary: options.glibLibrary,
        });
    }

    /**
     * Generates an interface class into the FileBuilder.
     *
     * @param iface - The interface to generate
     * @returns true if the interface was generated successfully
     */
    generate(iface: GirInterface): boolean {
        this.methodRenames.clear();
        const interfaceName = toPascalCase(iface.name);
        this.methodBody.setSelfNames(new Set([interfaceName]));

        const interfaceMethodNames = new Set(iface.methods.map((m) => m.name));
        const prerequisiteMethods = this.collectPrerequisiteMethods(iface, interfaceMethodNames);

        const isGObjectNamespace = this.options.namespace === "GObject";
        const extendsExpr = isGObjectNamespace ? "Object" : "GObject.Object";
        if (isGObjectNamespace) {
            this.file.addImport("./object.js", ["Object"]);
        } else {
            this.file.addNamespaceImport("../gobject/gobject.js", "GObject");
        }

        const doc = buildJsDocStructure(iface.doc, this.options.namespace);
        const cls = classDecl(interfaceName, {
            exported: true,
            extends: extendsExpr,
            doc: doc?.[0]?.description,
        });

        this.emitConstructorPropertiesNamespace(iface, interfaceName);

        const gobjectMethodNames = collectGObjectMethodNames(this.repository);
        const methodStructures: MethodStructure[] = [
            ...this.buildMethodStructures(iface.methods, iface.name, gobjectMethodNames),
            ...this.buildMethodStructures(prerequisiteMethods, iface.name, gobjectMethodNames),
        ];

        for (const struct of methodStructures) {
            addMethodStructure(cls, struct);
        }

        this.file.add(cls);

        if (iface.glibGetType) {
            this.file.descriptors.register({
                sharedLibrary: this.options.sharedLibrary,
                cIdentifier: iface.glibGetType,
                args: [],
                returnType: { type: "uint64" },
                exported: true,
            });
            this.file.addImport("../../native.js", ["t"]);
            this.file.addImport("../../registry.js", ["registerNativeInterface"]);
            this.file.addStatement(`\nregisterNativeInterface(${interfaceName}, ${iface.glibGetType}());`);
        }

        return true;
    }

    private emitConstructorPropertiesNamespace(iface: GirInterface, interfaceName: string): void {
        const extendsList: string[] = [];
        for (const prereqQualifiedName of iface.prerequisites) {
            const { namespace: ns, name: originalName } = splitQualifiedName(prereqQualifiedName);
            const prereqName = toPascalCase(originalName);
            if (ns === this.options.namespace) {
                extendsList.push(`${prereqName}.ConstructorProperties`);
                this.file.addImport(`./${toKebabCase(originalName)}.js`, [prereqName]);
            } else {
                extendsList.push(`${ns}.${prereqName}.ConstructorProperties`);
                this.file.addNamespaceImport(`../${ns.toLowerCase()}/${ns.toLowerCase()}.js`, ns);
            }
        }
        if (extendsList.length === 0) {
            const isGObjectNamespace = this.options.namespace === "GObject";
            extendsList.push(
                isGObjectNamespace ? "Object.ConstructorProperties" : "GObject.Object.ConstructorProperties",
            );
        }

        const ns = namespaceDecl(interfaceName, { exported: true });
        ns.add(
            interfaceDecl("ConstructorProperties", {
                exported: true,
                extends: extendsList,
            }),
        );
        this.file.add(ns);
    }

    private buildMethodStructures(
        methods: readonly GirMethod[],
        ifaceName: string,
        gobjectMethodNames: Set<string>,
    ): MethodStructure[] {
        const supportedMethods = filterSupportedMethods(
            methods,
            (params) => this.methodBody.hasUnsupportedCallbacks(params),
            (returnType) => this.methodBody.isReturnTypeUnsafe(returnType),
        );
        return supportedMethods.map((m) => {
            const methodName = toCamelCase(m.name);
            if (gobjectMethodNames.has(methodName)) {
                const renamedMethod = generateConflictingMethodName(ifaceName, m.name);
                this.methodRenames.set(m.cIdentifier, renamedMethod);
            }
            return this.buildMethodStructure(m);
        });
    }

    private buildMethodStructure(m: GirMethod): MethodStructure {
        return this.methodBody.buildMethodStructure(m, {
            methodName: this.methodBody.resolveMethodName(m, this.methodRenames),
            selfTypeDescriptor: SELF_TYPE_GOBJECT,
            sharedLibrary: this.options.sharedLibrary,
            namespace: this.options.namespace,
        });
    }

    private collectPrerequisiteMethods(iface: GirInterface, existingMethodNames: Set<string>): GirMethod[] {
        const methods: GirMethod[] = [];
        const seenMethodNames = new Set(existingMethodNames);
        const visitedInterfaces = new Set<string>();

        const collectFromPrerequisite = (prereqName: string) => {
            if (visitedInterfaces.has(prereqName)) return;
            visitedInterfaces.add(prereqName);

            const prereq = this.repository.resolveInterface(prereqName);
            if (!prereq) return;

            for (const prereqPrereq of prereq.prerequisites) {
                collectFromPrerequisite(prereqPrereq);
            }

            for (const m of prereq.methods) {
                if (seenMethodNames.has(m.name)) {
                    const renamedMethod = generateConflictingMethodName(prereq.name, m.name);
                    this.methodRenames.set(m.cIdentifier, renamedMethod);
                    methods.push(m);
                } else {
                    seenMethodNames.add(m.name);
                    methods.push(m);
                }
            }
        };

        for (const prereqName of iface.prerequisites) {
            collectFromPrerequisite(prereqName);
        }

        return methods;
    }
}
