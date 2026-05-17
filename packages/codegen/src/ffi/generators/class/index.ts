/**
 * Class Generator
 *
 * Orchestrates the generation of a class module file.
 * Delegates to specialized builders for each component.
 */

import type { FileBuilder } from "../../../builders/file-builder.js";
import {
    type ClassDeclarationBuilder,
    type ConstructorBuilder as ConstructorMemberBuilder,
    classDecl,
    constructorDecl,
    interfaceDecl,
    namespaceDecl,
    param,
} from "../../../builders/index.js";
import { PropertyAnalyzer, SignalAnalyzer } from "../../../core/analyzers/index.js";
import type { CodegenControllerMeta, CodegenWidgetMeta } from "../../../core/codegen-metadata.js";
import type { FfiGeneratorOptions } from "../../../core/generator-types.js";
import type { FfiMapper } from "../../../core/type-system/ffi-mapper.js";
import {
    fundamentalSelfType,
    SELF_TYPE_GOBJECT,
    type SelfTypeDescriptor,
} from "../../../core/type-system/ffi-types.js";
import { collectParentFactoryMethodNames, collectParentMethodNames } from "../../../core/utils/class-traversal.js";
import { buildJsDocStructure } from "../../../core/utils/doc-formatter.js";
import { isMethodSuppressed } from "../../../core/utils/method-suppression.js";
import {
    generateConflictingMethodName,
    normalizeClassName,
    toCamelCase,
    toKebabCase,
    toPascalCase,
} from "../../../core/utils/naming.js";
import { type ParentInfo, parseParentReference } from "../../../core/utils/parent-reference.js";
import { splitQualifiedName } from "../../../core/utils/qualified-name.js";
import { addMethodStructure, type MethodStructure } from "../../../core/writers/index.js";
import type { GirClass, GirMethod, GirRepository } from "../../../gir/index.js";
import { type ClassMetaAnalyzers, ClassMetaBuilder } from "./class-meta-builder.js";
import { ClassStructStaticBuilder } from "./class-struct-static-builder.js";
import { ConstructorBuilder } from "./constructor-builder.js";
import { ClassInstanceFieldBuilder } from "./instance-field-builder.js";
import { MethodBuilder } from "./method-builder.js";
import { PropertyAccessorBuilder } from "./property-accessor-builder.js";
import { SignalBuilder } from "./signal-builder.js";
import { StaticFunctionBuilder } from "./static-function-builder.js";

/**
 * Result of class generation. Carries widget and controller metadata
 * harvested while emitting the class.
 */
type ClassGenerationResult = {
    widgetMeta?: CodegenWidgetMeta | null;
    controllerMeta?: CodegenControllerMeta | null;
};

/**
 * Generates a complete class module file.
 *
 * This is the main orchestrator for class generation. It coordinates
 * the specialized builders for each component of a class:
 * - Constructors
 * - Methods
 * - Static functions
 * - Signals
 * - Property accessors
 * - Widget metadata
 */
export class ClassGenerator {
    private readonly className: string;
    private readonly constructorBuilder: ConstructorBuilder;
    private readonly methodBuilder: MethodBuilder;
    private readonly staticBuilder: StaticFunctionBuilder;
    private readonly classStructStaticBuilder: ClassStructStaticBuilder;
    private readonly instanceFieldBuilder: ClassInstanceFieldBuilder;
    private readonly signalBuilder: SignalBuilder;
    private readonly propertyAccessorBuilder: PropertyAccessorBuilder;
    private readonly classMetaBuilder: ClassMetaBuilder;
    private readonly methodRenames = new Map<string, string>();

    constructor(
        private readonly cls: GirClass,
        ffiMapper: FfiMapper,
        private readonly file: FileBuilder,
        private readonly repository: GirRepository,
        private readonly options: FfiGeneratorOptions,
    ) {
        this.className = normalizeClassName(cls.name);
        const selfNames = new Set([this.className]);

        this.constructorBuilder = new ConstructorBuilder(cls, ffiMapper, file, repository, options, selfNames);
        this.methodBuilder = new MethodBuilder(ffiMapper, file, this.methodRenames, options, selfNames);
        this.staticBuilder = new StaticFunctionBuilder(cls, ffiMapper, file, options, selfNames);
        this.classStructStaticBuilder = new ClassStructStaticBuilder(
            cls,
            ffiMapper,
            file,
            repository,
            options,
            selfNames,
        );
        this.instanceFieldBuilder = new ClassInstanceFieldBuilder(cls);
        this.signalBuilder = new SignalBuilder(cls, ffiMapper, file, repository, options, selfNames);
        this.propertyAccessorBuilder = new PropertyAccessorBuilder(
            cls,
            ffiMapper,
            file,
            repository,
            options,
            selfNames,
        );

        const analyzers: ClassMetaAnalyzers = {
            property: new PropertyAnalyzer(repository, ffiMapper),
            signal: new SignalAnalyzer(repository, ffiMapper),
        };
        this.classMetaBuilder = new ClassMetaBuilder(cls, repository, options.namespace, analyzers);
    }

    /**
     * Generates the class into the FileBuilder.
     *
     * Always emits a class shell carrying type identity (constructor binding,
     * GType registration). When every constructor or method has unsafe
     * parameters/return types, those individual members are filtered out but
     * the class file is still emitted so the type can be referenced as a
     * typed parameter elsewhere.
     *
     * @returns Result with success flag and optional widget/controller metadata.
     */
    generate(): ClassGenerationResult {
        const parentMethodNames = collectParentMethodNames(this.cls, this.repository);
        const { interfaceMethodsByNamespace } = this.collectInterfaceMethods(parentMethodNames);

        const filteredClassMethods = this.filterClassMethods(parentMethodNames);

        const parentInfo = parseParentReference(this.cls.parent, this.options.namespace);
        const selfTypeDescriptor = this.getSelfTypeDescriptor();

        const parentFactoryMethodNames = collectParentFactoryMethodNames(this.cls);
        this.constructorBuilder.setParentFactoryMethodNames(parentFactoryMethodNames);

        const { metaPlan, factoryMethods } = this.constructorBuilder.build();

        const cls = this.buildClassDeclaration(parentInfo);

        this.emitConstructorPropertiesNamespace(parentInfo);

        const allMethodStructures: MethodStructure[] = [
            ...factoryMethods,
            ...this.staticBuilder.buildStructures(),
            ...this.classStructStaticBuilder.buildStructures(),
            ...this.methodBuilder.buildStructures(filteredClassMethods, selfTypeDescriptor),
            ...Array.from(interfaceMethodsByNamespace.values()).flatMap((methods) =>
                this.methodBuilder.buildStructures(methods, selfTypeDescriptor),
            ),
            ...this.signalBuilder.buildConnectMethodStructures(),
        ];

        for (const struct of allMethodStructures) {
            addMethodStructure(cls, struct);
        }

        const propertyEmissions = this.propertyAccessorBuilder.buildAccessors();
        for (const { accessor } of propertyEmissions) {
            cls.addAccessor(accessor);
        }

        const accessorNames = new Set(propertyEmissions.map(({ accessor }) => accessor.name));
        for (const fieldAccessor of this.instanceFieldBuilder.buildAccessors()) {
            if (!accessorNames.has(fieldAccessor.name)) {
                cls.addAccessor(fieldAccessor);
            }
        }

        this.file.add(cls);

        if (this.cls.glibGetType) {
            const getTypeCall = this.buildGTypeCall(this.cls.glibGetType, this.cls.glibTypeName);
            this.file.addImport("../../registry.js", ["registerNativeClass"]);
            this.file.addStatement(`\nregisterNativeClass(${this.className}, ${getTypeCall});`);
        }

        if (metaPlan.constructionMetaWriter) {
            this.file.addRawBlock(metaPlan.constructionMetaWriter);
        }

        const signalMetaWriter = this.signalBuilder.buildSignalMetaWriter();
        if (signalMetaWriter) {
            this.file.addDeferredBlock(signalMetaWriter);
        }

        const widgetMeta = this.classMetaBuilder.buildCodegenWidgetMeta();
        const controllerMeta = this.classMetaBuilder.buildCodegenControllerMeta();

        return { widgetMeta, controllerMeta };
    }

    private emitConstructorPropertiesNamespace(parentInfo: ParentInfo): void {
        const extendsList: string[] = [];

        if (parentInfo.hasParent) {
            const parentExpr =
                parentInfo.isCrossNamespace && parentInfo.namespace
                    ? `${parentInfo.namespace}.${parentInfo.className}`
                    : parentInfo.className;
            extendsList.push(`${parentExpr}.ConstructorProperties`);
        }

        for (const ifaceQualifiedName of this.cls.implements) {
            const { namespace: ns, name: originalIfaceName } = splitQualifiedName(ifaceQualifiedName);
            const ifaceName = toPascalCase(originalIfaceName);
            if (ns === this.options.namespace) {
                extendsList.push(`${ifaceName}.ConstructorProperties`);
                this.file.addImport(`./${toKebabCase(originalIfaceName)}.js`, [ifaceName]);
            } else {
                extendsList.push(`${ns}.${ifaceName}.ConstructorProperties`);
                this.file.addNamespaceImport(`../${ns.toLowerCase()}/${ns.toLowerCase()}.js`, ns);
            }
        }

        const ns = namespaceDecl(this.className, { exported: true });
        ns.add(
            interfaceDecl("ConstructorProperties", {
                exported: true,
                extends: extendsList,
            }),
        );
        this.file.add(ns);
    }

    private buildClassDeclaration(parentInfo: ParentInfo): ClassDeclarationBuilder {
        let extendsBase: string | undefined;
        if (parentInfo.hasParent) {
            if (parentInfo.isCrossNamespace && parentInfo.namespace) {
                extendsBase = `${parentInfo.namespace}.${parentInfo.className}`;
                this.file.addNamespaceImport(
                    `../${parentInfo.namespace.toLowerCase()}/${parentInfo.namespace.toLowerCase()}.js`,
                    parentInfo.namespace,
                );
            } else {
                extendsBase = parentInfo.className;
                if (parentInfo.originalName) {
                    this.file.addImport(`./${toKebabCase(parentInfo.originalName)}.js`, [parentInfo.className]);
                }
            }
        }

        this.file.addImport("../../handles.js", ["getHandle", "tryGetHandle"]);

        const doc = buildJsDocStructure(this.cls.doc, this.options.namespace);
        const cls = classDecl(this.className, {
            exported: true,
            ...(extendsBase === undefined ? {} : { extends: extendsBase }),
            abstract: this.cls.abstract,
            doc: doc?.[0]?.description,
        });

        if (!parentInfo.hasParent) {
            this.file.addImport("../../object.js", ["constructNativeObject"]);
            cls.setConstructor(this.buildRootConstructor());
        }

        return cls;
    }

    private buildRootConstructor(): ConstructorMemberBuilder {
        return constructorDecl({
            params: [param("props", "object", { defaultValue: "{}" })],
            body: (writer) => {
                writer.writeLine("constructNativeObject(this, props);");
            },
        });
    }

    private resolveInterfaceNamespace(ifaceQualifiedName: string): string {
        if (!ifaceQualifiedName.includes(".")) return this.options.namespace;
        return ifaceQualifiedName.split(".")[0] ?? this.options.namespace;
    }

    private collectMethodsForInterface(
        method: GirMethod,
        ifaceName: string,
        sourceNamespace: string,
        classMethodNames: Set<string>,
        parentMethodNames: Set<string>,
        seenInterfaceMethodNames: Set<string>,
        interfaceMethodsByNamespace: Map<string, GirMethod[]>,
    ): void {
        if (classMethodNames.has(method.name) || parentMethodNames.has(method.name)) return;

        if (seenInterfaceMethodNames.has(method.name)) {
            this.handleInterfaceMethodRename(method, ifaceName);
        } else {
            seenInterfaceMethodNames.add(method.name);
        }

        if (!interfaceMethodsByNamespace.has(sourceNamespace)) {
            interfaceMethodsByNamespace.set(sourceNamespace, []);
        }
        interfaceMethodsByNamespace.get(sourceNamespace)?.push(method);
    }

    private collectInterfaceMethods(parentMethodNames: Set<string>): {
        interfaceMethods: GirMethod[];
        interfaceMethodsByNamespace: Map<string, GirMethod[]>;
    } {
        const classMethodNames = new Set(this.cls.methods.map((m) => m.name));
        const seenInterfaceMethodNames = new Set<string>();
        const interfaceMethodsByNamespace = new Map<string, GirMethod[]>();

        for (const ifaceQualifiedName of this.cls.implements) {
            const iface = this.repository.resolveInterface(ifaceQualifiedName);
            if (!iface) continue;

            const sourceNamespace = this.resolveInterfaceNamespace(ifaceQualifiedName);

            for (const method of iface.methods) {
                this.collectMethodsForInterface(
                    method,
                    iface.name,
                    sourceNamespace,
                    classMethodNames,
                    parentMethodNames,
                    seenInterfaceMethodNames,
                    interfaceMethodsByNamespace,
                );
            }
        }

        const interfaceMethods = Array.from(interfaceMethodsByNamespace.values()).flat();
        return { interfaceMethods, interfaceMethodsByNamespace };
    }

    private handleInterfaceMethodRename(method: GirMethod, ifaceName: string): void {
        const renamedMethod = generateConflictingMethodName(ifaceName, method.name);
        this.methodRenames.set(method.cIdentifier, renamedMethod);
    }

    private collectPropertyNames(): Set<string> {
        return new Set(this.cls.getAllProperties().map((p) => toCamelCase(p.name)));
    }

    private filterClassMethods(parentMethodNames: Set<string>): GirMethod[] {
        const propertyNames = this.collectPropertyNames();
        return this.cls.methods.filter((m) => {
            if (isMethodSuppressed(this.cls.qualifiedName, m.cIdentifier)) return false;
            if (propertyNames.has(toCamelCase(m.name))) return false;
            const needsRename = parentMethodNames.has(m.name) || (m.name === "connect" && this.cls.parent);
            if (needsRename) {
                const renamedMethod = generateConflictingMethodName(this.cls.name, m.name);
                this.methodRenames.set(m.cIdentifier, renamedMethod);
            }
            return true;
        });
    }

    private getSelfTypeDescriptor(): SelfTypeDescriptor {
        const fundamentalInfo = this.getFundamentalTypeInfo();
        if (fundamentalInfo) {
            return fundamentalSelfType(
                fundamentalInfo.lib,
                fundamentalInfo.refFn,
                fundamentalInfo.unrefFn,
                "borrowed",
                fundamentalInfo.typeName,
            );
        }
        return SELF_TYPE_GOBJECT;
    }

    private buildGTypeCall(cIdentifier: string, glibTypeName: string | undefined): string {
        if (cIdentifier === "intern" || cIdentifier === "") {
            if (!glibTypeName) {
                return `0 /* ${this.className} has no glib:type-name */`;
            }
            const binding = this.file.descriptors.register({
                sharedLibrary: "libgobject-2.0.so.0",
                cIdentifier: "g_type_from_name",
                args: [{ type: { type: "string", ownership: "borrowed" }, value: "" }],
                returnType: { type: "uint64" },
            });
            this.file.addImport("../../native.js", ["t"]);
            if (binding.varargs === false) {
                return `${binding.name}("${glibTypeName}")`;
            }
            this.file.addImport("../../native.js", ["call"]);
            return `call("libgobject-2.0.so.0", "g_type_from_name", [{ type: t.string("borrowed"), value: "${glibTypeName}" }], t.uint64)`;
        }

        const binding = this.file.descriptors.register({
            sharedLibrary: this.options.sharedLibrary,
            cIdentifier,
            args: [],
            returnType: { type: "uint64" },
            exported: true,
        });

        this.file.addImport("../../native.js", ["t"]);
        if (binding.varargs === false) {
            return `${binding.name}()`;
        }
        this.file.addImport("../../native.js", ["call"]);
        return `call("${this.options.sharedLibrary}", "${cIdentifier}", [], t.uint64)`;
    }

    private getFundamentalTypeInfo(): { lib: string; refFn: string; unrefFn: string; typeName?: string } | null {
        let currentClass: GirClass | null = this.cls;
        while (currentClass) {
            if (currentClass.isFundamental() && currentClass.refFunc && currentClass.unrefFunc) {
                const namespace = currentClass.qualifiedName.split(".")[0];
                const ns = this.repository.getNamespace(namespace ?? "");
                if (ns?.sharedLibrary) {
                    return {
                        lib: ns.sharedLibrary,
                        refFn: currentClass.refFunc,
                        unrefFn: currentClass.unrefFunc,
                        typeName: currentClass.glibTypeName,
                    };
                }
            }
            currentClass = currentClass.getParent();
        }
        return null;
    }
}
