import type { GirInterface, GirMethod, GirNamespace, TypeMapper } from "@gtkx/gir";
import { toPascalCase } from "@gtkx/gir";
import type { GenerationContext } from "../generation-context.js";
import { BaseGenerator, type GeneratorOptions } from "./base-generator.js";
import { ClassGenerator } from "./class-generator.js";

export class InterfaceGenerator extends BaseGenerator {
    private classGenerator: ClassGenerator;

    constructor(typeMapper: TypeMapper, ctx: GenerationContext, options: GeneratorOptions) {
        super(typeMapper, ctx, options);
        this.classGenerator = new ClassGenerator(typeMapper, ctx, options);
    }

    async generateInterface(
        iface: GirInterface,
        sharedLibrary: string,
        interfaceMap: Map<string, GirInterface>,
    ): Promise<string> {
        const interfaceName = toPascalCase(iface.name);
        const sections: string[] = [];

        const interfaceMethodNames = new Set(iface.methods.map((m) => m.name));
        const prerequisiteMethods = this.collectPrerequisiteMethods(iface, interfaceMap, interfaceMethodNames);

        const allMethods = [...iface.methods, ...prerequisiteMethods];

        this.ctx.usesCall = allMethods.length > 0;
        this.ctx.usesRef = allMethods.some((m) => this.hasRefParameter(m.parameters));

        if (iface.doc) {
            sections.push(this.formatDoc(iface.doc));
        }
        this.ctx.usesNativeObject = true;
        sections.push(`export class ${interfaceName} extends NativeObject {`);
        if (iface.glibTypeName) {
            sections.push(`  static readonly glibTypeName: string = "${iface.glibTypeName}";`);
            sections.push(`  static readonly objectType = "interface" as const;\n`);
        }

        if (iface.methods.length > 0) {
            sections.push(this.classGenerator.generateMethods(iface.methods, sharedLibrary, interfaceName));
        }

        if (prerequisiteMethods.length > 0) {
            sections.push(this.classGenerator.generateMethods(prerequisiteMethods, sharedLibrary, interfaceName));
        }

        sections.push("}");

        return sections.join("\n");
    }

    private collectPrerequisiteMethods(
        iface: GirInterface,
        interfaceMap: Map<string, GirInterface>,
        existingMethodNames: Set<string>,
    ): GirMethod[] {
        const methods: GirMethod[] = [];
        const seenMethodNames = new Set(existingMethodNames);
        const visitedInterfaces = new Set<string>();

        const collectFromPrerequisite = (prereqName: string) => {
            if (visitedInterfaces.has(prereqName)) return;
            visitedInterfaces.add(prereqName);

            let prereq: GirInterface | undefined;
            if (prereqName.includes(".")) {
                const [ns, prereqIfaceName] = prereqName.split(".", 2);
                const prereqNs = (this.options.allNamespaces as Map<string, GirNamespace> | undefined)?.get(ns ?? "");
                if (prereqNs && prereqIfaceName) {
                    prereq = prereqNs.interfaces.find((i) => i.name === prereqIfaceName);
                }
            } else {
                prereq = interfaceMap.get(prereqName);
            }

            if (!prereq) return;

            for (const prereqPrereq of prereq.prerequisites) {
                collectFromPrerequisite(prereqPrereq);
            }

            for (const method of prereq.methods) {
                if (seenMethodNames.has(method.name)) {
                    const pascalMethodName = toPascalCase(method.name);
                    const prereqNamePascal = toPascalCase(prereq.name);
                    const renamedMethod = `${prereqNamePascal.charAt(0).toLowerCase()}${prereqNamePascal.slice(1)}${pascalMethodName}`;
                    this.ctx.methodRenames.set(method.cIdentifier, renamedMethod);
                    methods.push(method);
                } else {
                    seenMethodNames.add(method.name);
                    methods.push(method);
                }
            }
        };

        for (const prereqName of iface.prerequisites) {
            collectFromPrerequisite(prereqName);
        }

        return methods;
    }
}
