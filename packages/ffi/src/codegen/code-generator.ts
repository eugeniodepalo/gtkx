import { format } from "prettier";
import type {
  GirClass,
  GirConstructor,
  GirEnumeration,
  GirFunction,
  GirInterface,
  GirMethod,
  GirNamespace,
  GirParameter,
  GirProperty,
  GirSignal,
} from "./gir-parser.js";
import { type FfiTypeDescriptor, TypeMapper } from "./type-mapper.js";

export interface GeneratorOptions {
  outputDir: string;
  namespace: string;
  prettierConfig?: unknown;
}

export class CodeGenerator {
  private typeMapper: TypeMapper;
  private usesRef: boolean = false;

  constructor(private options: GeneratorOptions) {
    this.typeMapper = new TypeMapper();
  }

  async generateNamespace(
    namespace: GirNamespace
  ): Promise<Map<string, string>> {
    const files = new Map<string, string>();

    // Build a map of class names for inheritance resolution
    const classMap = new Map<string, GirClass>();
    for (const cls of namespace.classes) {
      classMap.set(cls.name, cls);
    }

    // Generate interfaces (as abstract classes for now)
    for (const iface of namespace.interfaces) {
      const fileName = `${this.toKebabCase(iface.name)}.ts`;
      const content = await this.generateInterface(
        iface,
        namespace.sharedLibrary
      );
      files.set(fileName, content);
    }

    // Generate classes
    for (const cls of namespace.classes) {
      const fileName = `${this.toKebabCase(cls.name)}.ts`;
      const content = await this.generateClass(
        cls,
        namespace.sharedLibrary,
        classMap
      );
      files.set(fileName, content);
    }

    // Generate standalone functions module
    // Also look for constructor functions that should be part of classes
    const standaloneFunctions: GirFunction[] = [];
    const constructorFunctions = new Map<string, GirFunction[]>();

    for (const func of namespace.functions) {
      // Check if this is a constructor function
      // Pattern: namespace_class_name_new or namespace_class_name_new_*
      const match = func.cIdentifier?.match(/^[a-z_]+_([a-z_]+)_new(_.*)?$/);
      if (match && func.returnType.name) {
        const potentialClassName = match[1]
          .split("_")
          .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
          .join("");

        // Check if this class exists
        if (classMap.has(potentialClassName)) {
          if (!constructorFunctions.has(potentialClassName)) {
            constructorFunctions.set(potentialClassName, []);
          }
          constructorFunctions.get(potentialClassName)?.push(func);
        } else {
          standaloneFunctions.push(func);
        }
      } else {
        standaloneFunctions.push(func);
      }
    }

    // Add constructor functions to their respective classes
    for (const [className, funcs] of constructorFunctions) {
      const cls = classMap.get(className);
      if (!cls) continue;
      // Convert functions to constructors
      for (const func of funcs) {
        cls.constructors.push({
          name: func.name,
          cIdentifier: func.cIdentifier,
          returnType: func.returnType,
          parameters: func.parameters,
        });
      }
    }

    if (standaloneFunctions.length > 0) {
      const functionsContent = await this.generateFunctions(
        standaloneFunctions,
        namespace.sharedLibrary
      );
      files.set("functions.ts", functionsContent);
    }

    // Generate enums module
    if (namespace.enumerations.length > 0) {
      const enumsContent = await this.generateEnums(namespace.enumerations);
      files.set("enums.ts", enumsContent);
    }

    // Generate index file
    const indexContent = await this.generateIndex(files.keys());
    files.set("index.ts", indexContent);

    // Generate jsx.ts for Gtk namespace
    if (namespace.name === "Gtk" && namespace.version.startsWith("4")) {
      const jsxContent = await this.generateJsx(namespace, classMap);
      files.set("jsx.ts", jsxContent);
    }

    return files;
  }

  private async generateClass(
    cls: GirClass,
    sharedLibrary: string,
    classMap: Map<string, GirClass>
  ): Promise<string> {
    this.usesRef = false;
    // Check if Ref is used in this class
    for (const method of cls.methods) {
      for (const param of method.parameters) {
        if (param.direction === "out" || param.direction === "inout") {
          this.usesRef = true;
          break;
        }
      }
      if (this.usesRef) break;
    }
    for (const ctor of cls.constructors) {
      for (const param of ctor.parameters) {
        if (param.direction === "out" || param.direction === "inout") {
          this.usesRef = true;
          break;
        }
      }
      if (this.usesRef) break;
    }
    const imports = this.generateImports();
    let className = this.toPascalCase(cls.name);

    // Rename Object to avoid conflicts with JavaScript's built-in Object
    if (className === "Object") {
      className = "GObject";
    }

    let code = imports;

    // Add import for parent class if it exists
    if (cls.parent && classMap.has(cls.parent)) {
      const parentFileName = this.toKebabCase(cls.parent);
      let parentImportName = this.toPascalCase(cls.parent);
      // Rename Object to GObject to avoid JavaScript conflicts
      if (parentImportName === "Object") {
        parentImportName = "GObject";
      }
      code += `import { ${parentImportName} } from "./${parentFileName}.js";\n`;
    }

    code += "\n";

    // Generate class declaration with inheritance
    let parentClassName = cls.parent ? this.toPascalCase(cls.parent) : "";
    // Rename Object to GObject to avoid JavaScript conflicts
    if (parentClassName === "Object") {
      parentClassName = "GObject";
    }

    const extendsClause =
      cls.parent && classMap.has(cls.parent)
        ? ` extends ${parentClassName}`
        : "";

    code += `export class ${className}${extendsClause} {\n`;

    // Add ptr property
    if (!extendsClause) {
      // Base class - always add ptr
      code += `  protected ptr: unknown;\n\n`;
    } else if (cls.constructors.length === 0) {
      // Derived class with no constructor - add ptr to avoid abstract member issues
      code += `  protected ptr: unknown = undefined as any;\n\n`;
    }
    // Derived class with constructor will initialize this.ptr

    // Generate constructors
    if (cls.constructors.length > 0) {
      // Find a constructor without varargs to use as the main constructor
      const mainConstructor = cls.constructors.find(
        (c) => !c.parameters.some((p) => p.name === "..." || p.name === "")
      );

      if (mainConstructor) {
        // Use the first non-varargs constructor as the main constructor
        const hasParent = !!(cls.parent && classMap.has(cls.parent));
        code += this.generateConstructor(
          mainConstructor,
          cls.name,
          sharedLibrary,
          hasParent
        );
        code += "\n";

        // Generate static factory methods for all other constructors
        for (const ctor of cls.constructors) {
          if (ctor !== mainConstructor) {
            code += this.generateStaticFactoryMethod(
              ctor,
              cls.name,
              sharedLibrary
            );
            code += "\n";
          }
        }
      } else {
        // All constructors have varargs, generate them all as static methods
        for (const ctor of cls.constructors) {
          code += this.generateStaticFactoryMethod(
            ctor,
            cls.name,
            sharedLibrary
          );
          code += "\n";
        }
      }
    } else {
      // No constructors found
      const hasParent = !!(cls.parent && classMap.has(cls.parent));
      if (hasParent) {
        // For derived classes with no constructors, don't generate a constructor
        // TypeScript will inherit the parent's constructor
        code += `  // No specific constructors defined - inherits parent constructor\n\n`;
      } else {
        code += `  // No constructors found for ${cls.name}\n\n`;
      }
    }

    // Collect method names to avoid duplicates with properties and track generated methods
    const methodNames = new Set<string>();
    const generatedMethods = new Set<string>();
    for (const method of cls.methods) {
      const methodName = this.toCamelCase(method.name);
      methodNames.add(methodName);
    }

    // Generate methods (skip duplicates)
    for (const method of cls.methods) {
      const methodName = this.toCamelCase(method.name);
      // Create a unique key based on method name and C identifier to catch true duplicates
      const methodKey = `${methodName}:${method.cIdentifier}`;

      if (generatedMethods.has(methodKey)) {
        continue; // Skip duplicate methods
      }
      generatedMethods.add(methodKey);

      code += this.generateMethod(method, sharedLibrary, cls.name);
      code += "\n";
    }

    // Generate property getters/setters (if needed)
    // Skip properties that have the same name as methods
    for (const property of cls.properties) {
      if (property.readable || property.writable) {
        const propertyName = this.toCamelCase(property.name);
        if (!methodNames.has(propertyName)) {
          code += this.generateProperty(property, cls.name, sharedLibrary);
          code += "\n";
        }
      }
    }

    // Generate signal connection method
    if (cls.signals.length > 0) {
      // Check if there's already a method named "connect"
      const hasConnectMethod = methodNames.has("connect");
      code += this.generateSignalConnect(sharedLibrary, hasConnectMethod);
      code += "\n";
    }

    code += "}\n";

    return this.formatCode(code);
  }

  private generateStaticFactoryMethod(
    ctor: GirConstructor,
    className: string,
    sharedLibrary: string
  ): string {
    // Extract method name from c_identifier
    // e.g., g_object_new_valist -> newValist
    let methodName = "new";
    if (ctor.cIdentifier) {
      const parts = ctor.cIdentifier.split("_");
      // Skip the namespace prefix (e.g., g_object)
      const nameParts = parts.slice(2).join("_");
      if (nameParts && nameParts !== "new") {
        methodName = this.toCamelCase(nameParts);
      }
    }

    const params = this.generateParameterList(ctor.parameters);

    let code = `  static ${methodName}(${params}): ${className} {\n`;
    code += `    const ptr = call(\n`;
    code += `      "${sharedLibrary}",\n`;
    code += `      "${ctor.cIdentifier}",\n`;
    code += `      [\n`;

    // Generate argument list
    for (const param of ctor.parameters) {
      if (param.name === "..." || param.name === "") continue; // Skip varargs
      const mapped = this.typeMapper.mapParameter(param);
      code += this.generateCallArgument(param.name, mapped.ffi);
      code += ",\n";
    }

    code += `      ],\n`;
    code += `      { type: "gobject", borrowed: true }\n`;
    code += `    );\n`;
    code += `    const instance = Object.create(${className}.prototype) as ${className} & { ptr: unknown };\n`;
    code += `    instance.ptr = ptr;\n`;
    code += `    return instance;\n`;
    code += `  }\n`;

    return code;
  }

  private generateConstructor(
    ctor: GirConstructor,
    _className: string,
    sharedLibrary: string,
    hasParent: boolean = false
  ): string {
    // Always make constructor parameters optional to allow derived classes to call super()
    const params = this.generateParameterList(ctor.parameters, true);

    let code = `  constructor(${params}) {\n`;

    // If class extends another, we need to call super first
    if (hasParent) {
      // For derived classes, call super() with no arguments
      code += `    super();\n`;
    }

    code += `    this.ptr = call(\n`;
    code += `      "${sharedLibrary}",\n`;
    code += `      "${ctor.cIdentifier}",\n`;
    code += `      [\n`;

    // Generate argument list
    for (const param of ctor.parameters) {
      if (param.name === "..." || param.name === "") continue; // Skip varargs
      const mapped = this.typeMapper.mapParameter(param);
      code += this.generateCallArgument(param.name, mapped.ffi);
      code += ",\n";
    }

    code += `      ],\n`;
    code += `      { type: "gobject", borrowed: true }\n`;
    code += `    ) as unknown;\n`;
    code += `  }\n`;

    return code;
  }

  private async generateInterface(
    iface: GirInterface,
    sharedLibrary: string
  ): Promise<string> {
    this.usesRef = false;
    // Check if Ref is used in this interface
    for (const method of iface.methods) {
      for (const param of method.parameters) {
        if (param.direction === "out" || param.direction === "inout") {
          this.usesRef = true;
          break;
        }
      }
      if (this.usesRef) break;
    }
    const imports = this.generateImports();
    const interfaceName = this.toPascalCase(iface.name);

    let code = `${imports}\n`;

    // Generate interface as abstract class
    code += `// Interface ${interfaceName} (generated as abstract class)\n`;
    code += `export abstract class ${interfaceName} {\n`;
    code += `  protected abstract ptr: unknown;\n\n`;

    // Collect method names to avoid duplicates with properties
    const methodNames = new Set<string>();
    for (const method of iface.methods) {
      const methodName = this.toCamelCase(method.name);
      methodNames.add(methodName);
    }

    // Generate methods
    for (const method of iface.methods) {
      code += this.generateMethod(method, sharedLibrary, iface.name);
      code += "\n";
    }

    // Generate property getters/setters (if needed)
    // Skip properties that have the same name as methods
    for (const property of iface.properties) {
      if (property.readable || property.writable) {
        const propertyName = this.toCamelCase(property.name);
        if (!methodNames.has(propertyName)) {
          code += this.generateProperty(property, iface.name, sharedLibrary);
          code += "\n";
        }
      }
    }

    // Generate signal connection method
    if (iface.signals.length > 0) {
      // Check if there's already a method named "connect"
      const hasConnectMethod = methodNames.has("connect");
      code += this.generateSignalConnect(sharedLibrary, hasConnectMethod);
      code += "\n";
    }

    code += "}\n";

    return this.formatCode(code);
  }

  private generateMethod(
    method: GirMethod,
    sharedLibrary: string,
    className?: string
  ): string {
    let methodName = this.toCamelCase(method.name);

    // Handle method name conflicts with base class
    const methodRenames = new Map<string, Map<string, string>>([
      ["IconView", new Map([["setCursor", "setCursorPath"]])],
      ["TreeView", new Map([["setCursor", "setCursorPath"]])],
      ["HSV", new Map([["getColor", "getHsvColor"]])],
      ["Layout", new Map([["getSize", "getLayoutSize"]])],
      ["Table", new Map([["getSize", "getTableSize"]])],
      ["MenuItem", new Map([["activate", "activateItem"]])],
      ["FunctionInfo", new Map([["invoke", "invokeFunction"]])],
      ["VFuncInfo", new Map([["invoke", "invokeVFunc"]])],
      ["SignalGroup", new Map([["connect", "connectSignal"]])],
    ]);

    if (className && methodRenames.has(className)) {
      const renames = methodRenames.get(className);
      if (renames?.has(methodName)) {
        const renamed = renames.get(methodName);
        methodName = renamed ?? this.toCamelCase(method.name);
      }
    }

    const params = this.generateParameterList(method.parameters);
    const returnTypeMapping = this.typeMapper.mapType(method.returnType, true);
    const tsReturnType =
      returnTypeMapping.ts === "void" ? "void" : returnTypeMapping.ts;

    let code = `  ${methodName}(${params})${tsReturnType !== "void" ? `: ${tsReturnType}` : ""} {\n`;

    // Generate call
    const needsCast =
      returnTypeMapping.ts !== "void" && returnTypeMapping.ts !== "unknown";
    if (returnTypeMapping.ts !== "void") {
      code += `    return `;
    } else {
      code += `    `;
    }

    code += `call(\n`;
    code += `      "${sharedLibrary}",\n`;
    code += `      "${method.cIdentifier}",\n`;
    code += `      [\n`;

    // Add 'this' as first argument
    code += `        {\n`;
    code += `          type: { type: "gobject" },\n`;
    code += `          value: this.ptr,\n`;
    code += `        },\n`;

    // Add method parameters
    for (const param of method.parameters) {
      if (param.name === "..." || param.name === "") continue; // Skip varargs
      const mapped = this.typeMapper.mapParameter(param);
      code += this.generateCallArgument(param.name, mapped.ffi);
      code += ",\n";
    }

    code += `      ],\n`;
    code += `      ${this.generateReturnTypeDescriptor(returnTypeMapping.ffi)}\n`;
    code += `    )`;

    // Add type cast if needed
    if (needsCast) {
      code += ` as ${tsReturnType}`;
    }

    code += `;\n`;
    code += `  }\n`;

    return code;
  }

  private generateProperty(
    property: GirProperty,
    _className: string,
    _sharedLibrary: string
  ): string {
    // Convert property name to valid JavaScript identifier
    const propertyName = this.toValidIdentifier(
      this.toCamelCase(property.name)
    );
    const typeMapping = this.typeMapper.mapType(property.type);
    let code = "";

    // Generate getter
    if (property.readable) {
      code += `  get ${propertyName}(): ${typeMapping.ts} {\n`;
      code += `    // TODO: Implement property getter\n`;
      code += `    throw new Error("Property getters not yet implemented");\n`;
      code += `  }\n\n`;
    }

    // Generate setter
    if (property.writable && !property.constructOnly) {
      code += `  set ${propertyName}(value: ${typeMapping.ts}) {\n`;
      code += `    // TODO: Implement property setter\n`;
      code += `    throw new Error("Property setters not yet implemented");\n`;
      code += `  }\n`;
    }

    return code;
  }

  private generateSignalConnect(
    sharedLibrary: string,
    hasConnectMethod: boolean = false
  ): string {
    // Use "on" instead of "connect" if there's already a connect method
    const methodName = hasConnectMethod ? "on" : "connect";
    return `  ${methodName}(
    signal: string,
    handler: (...args: unknown[]) => unknown,
    after = false
  ) {
    call(
      "${sharedLibrary}",
      "g_signal_connect_closure",
      [
        {
          type: { type: "gobject" },
          value: this.ptr,
        },
        {
          type: { type: "string" },
          value: signal,
        },
        {
          type: { type: "callback" },
          value: handler,
        },
        {
          type: { type: "boolean" },
          value: after,
        },
      ],
      { type: "undefined" }
    );
  }`;
  }

  private async generateFunctions(
    functions: GirFunction[],
    sharedLibrary: string
  ): Promise<string> {
    this.usesRef = false;
    // Check if Ref is used in any function
    for (const func of functions) {
      for (const param of func.parameters) {
        if (param.direction === "out" || param.direction === "inout") {
          this.usesRef = true;
          break;
        }
      }
      if (this.usesRef) break;
    }
    const imports = this.generateImports();
    let code = `${imports}\n`;

    for (const func of functions) {
      const funcName = this.toValidIdentifier(this.toCamelCase(func.name));
      const params = this.generateParameterList(func.parameters);
      const returnTypeMapping = this.typeMapper.mapType(func.returnType, true);
      const tsReturnType =
        returnTypeMapping.ts === "void" ? "" : `: ${returnTypeMapping.ts}`;

      code += `export const ${funcName} = (${params})${tsReturnType} => {\n`;

      const needsCast =
        returnTypeMapping.ts !== "void" && returnTypeMapping.ts !== "unknown";

      if (returnTypeMapping.ts !== "void") {
        code += `  return `;
      } else {
        code += `  `;
      }

      code += `call("${sharedLibrary}", "${func.cIdentifier}", [\n`;

      // Add parameters
      for (const param of func.parameters) {
        if (param.name === "..." || param.name === "") continue; // Skip varargs
        const mapped = this.typeMapper.mapParameter(param);
        code += this.generateCallArgument(param.name, mapped.ffi);
        code += ",\n";
      }

      code += `  ], ${this.generateReturnTypeDescriptor(returnTypeMapping.ffi)})`;

      // Add type cast if needed
      if (needsCast) {
        code += ` as ${returnTypeMapping.ts}`;
      }

      code += `;\n`;
      code += `};\n\n`;
    }

    return this.formatCode(code);
  }

  private async generateEnums(enumerations: GirEnumeration[]): Promise<string> {
    let code = "";

    for (const enumeration of enumerations) {
      const enumName = this.toPascalCase(enumeration.name);

      // Generate enum
      code += `export enum ${enumName} {\n`;
      for (const member of enumeration.members) {
        let memberName = this.toConstantCase(member.name);
        // Ensure enum member doesn't start with a number
        if (/^\d/.test(memberName)) {
          memberName = `_${memberName}`;
        }
        code += `  ${memberName} = ${member.value},\n`;
      }
      code += `}\n\n`;
    }

    return this.formatCode(code);
  }

  private async generateJsx(
    namespace: GirNamespace,
    classMap: Map<string, GirClass>
  ): Promise<string> {
    // Find all widgets (classes that inherit from Widget)
    const widgets = this.findWidgets(namespace, classMap);

    let code = `import type { ReactNode } from "react";\n\n`;
    code += `// Common widget props that all GTK widgets share\n`;
    code += `interface WidgetProps {\n`;
    code += `\t// Layout properties\n`;
    code += `\thalign?: "fill" | "start" | "end" | "center" | "baseline";\n`;
    code += `\tvalign?: "fill" | "start" | "end" | "center" | "baseline";\n`;
    code += `\thexpand?: boolean;\n`;
    code += `\tvexpand?: boolean;\n`;
    code += `\tmarginStart?: number;\n`;
    code += `\tmarginEnd?: number;\n`;
    code += `\tmarginTop?: number;\n`;
    code += `\tmarginBottom?: number;\n`;
    code += `\twidthRequest?: number;\n`;
    code += `\theightRequest?: number;\n`;
    code += `\n`;
    code += `\t// Visual properties\n`;
    code += `\tvisible?: boolean;\n`;
    code += `\tsensitive?: boolean;\n`;
    code += `\tcanFocus?: boolean;\n`;
    code += `\tcanTarget?: boolean;\n`;
    code += `\tfocusOnClick?: boolean;\n`;
    code += `\topacity?: number;\n`;
    code += `\n`;
    code += `\t// CSS\n`;
    code += `\tcssClasses?: string[];\n`;
    code += `\n`;
    code += `\t// Tooltip\n`;
    code += `\ttooltipText?: string;\n`;
    code += `\ttooltipMarkup?: string;\n`;
    code += `\n`;
    code += `\t// Common signals\n`;
    code += `\tonDestroy?: () => void;\n`;
    code += `\tonShow?: () => void;\n`;
    code += `\tonHide?: () => void;\n`;
    code += `\tonMap?: () => void;\n`;
    code += `\tonUnmap?: () => void;\n`;
    code += `\n`;
    code += `\tchildren?: ReactNode;\n`;
    code += `}\n\n`;

    // Generate prop interfaces for each widget (skip Widget itself)
    for (const widget of widgets) {
      if (widget.name === "Widget") {
        continue; // WidgetProps is already defined above
      }
      const propsInterface = this.generateWidgetProps(widget);
      code += propsInterface;
      code += `\n`;
    }

    // Generate exports for widget names (include Widget for completeness)
    code += `// Export widget names as string constants for JSX usage\n`;
    for (const widget of widgets) {
      const widgetName = this.toPascalCase(widget.name);
      code += `export const ${widgetName} = "${widgetName}";\n`;
    }
    code += `\n`;

    // Generate JSX namespace declarations (skip Widget - it's not a JSX element)
    code += `// Declare JSX intrinsic elements\n`;
    code += `declare module "react" {\n`;
    code += `\tnamespace JSX {\n`;
    code += `\t\tinterface IntrinsicElements {\n`;
    for (const widget of widgets) {
      if (widget.name === "Widget") {
        continue; // Widget is not a JSX element
      }
      const widgetName = this.toPascalCase(widget.name);
      const propsName = `${widgetName}Props`;
      code += `\t\t\t${widgetName}: ${propsName};\n`;
    }
    code += `\t\t}\n`;
    code += `\t}\n`;
    code += `}\n`;
    code += `\n`;
    code += `export {};\n`;

    return this.formatCode(code);
  }

  private findWidgets(
    namespace: GirNamespace,
    classMap: Map<string, GirClass>
  ): GirClass[] {
    const widgets: GirClass[] = [];
    const widgetCache = new Map<string, boolean>();

    const isWidget = (className: string): boolean => {
      // Check cache first
      if (widgetCache.has(className)) {
        return Boolean(widgetCache.get(className));
      }

      const cls = classMap.get(className);
      if (!cls) {
        widgetCache.set(className, false);
        return false;
      }

      // Widget is the base class - include it
      if (cls.name === "Widget") {
        widgetCache.set(className, true);
        return true;
      }

      // Check parent recursively
      if (cls.parent) {
        const result = isWidget(cls.parent);
        widgetCache.set(className, result);
        return result;
      }

      widgetCache.set(className, false);
      return false;
    };

    for (const cls of namespace.classes) {
      if (isWidget(cls.name)) {
        widgets.push(cls);
      }
    }

    // Sort widgets to ensure parent classes come before children
    // This ensures WindowProps is generated before ApplicationWindowProps
    widgets.sort((a, b) => {
      // Widget should come first
      if (a.name === "Widget") return -1;
      if (b.name === "Widget") return 1;
      // Window should come before ApplicationWindow
      if (a.name === "Window") return -1;
      if (b.name === "Window") return 1;
      // Otherwise alphabetical
      return a.name.localeCompare(b.name);
    });

    return widgets;
  }

  private generateWidgetProps(widget: GirClass): string {
    const widgetName = this.toPascalCase(widget.name);
    let code = `interface ${widgetName}Props extends `;

    // Determine parent props interface
    // Window extends WidgetProps, ApplicationWindow extends WindowProps
    if (widget.name === "Window") {
      code += `WidgetProps`;
    } else if (widget.name === "ApplicationWindow") {
      code += `WindowProps`;
    } else if (widget.parent) {
      const parentName = this.toPascalCase(widget.parent);
      // Check if parent is Widget or Window
      if (widget.parent === "Widget") {
        code += `WidgetProps`;
      } else if (widget.parent === "Window") {
        code += `WindowProps`;
      } else {
        code += `${parentName}Props`;
      }
    } else {
      code += `WidgetProps`;
    }

    code += ` {\n`;

    // Only collect properties and signals from this widget (not parents)
    // Parents will have their own Props interfaces
    const widgetProperties = widget.properties;
    const widgetSignals = widget.signals;

    // Filter out common widget properties that are already in WidgetProps
    const commonProps = new Set([
      "halign",
      "valign",
      "hexpand",
      "vexpand",
      "marginStart",
      "marginEnd",
      "marginTop",
      "marginBottom",
      "widthRequest",
      "heightRequest",
      "visible",
      "sensitive",
      "canFocus",
      "canTarget",
      "focusOnClick",
      "opacity",
      "cssClasses",
      "tooltipText",
      "tooltipMarkup",
    ]);

    const commonSignals = new Set(["destroy", "show", "hide", "map", "unmap"]);

    // Generate properties
    const widgetSpecificProps: GirProperty[] = [];
    for (const prop of widgetProperties) {
      const propName = this.toCamelCase(prop.name);
      if (!commonProps.has(propName)) {
        widgetSpecificProps.push(prop);
      }
    }

    if (widgetSpecificProps.length > 0) {
      for (const prop of widgetSpecificProps) {
        const propName = this.toCamelCase(prop.name);
        const typeMapping = this.typeMapper.mapType(prop.type);
        // Simplify complex types for JSX props
        let tsType = typeMapping.ts;
        // Replace Ref<T> with T, and GObject types with unknown
        if (tsType.startsWith("Ref<")) {
          tsType = tsType.replace(/^Ref<(.+)>$/, "$1");
        }
        // If it's a GObject type or complex type, use unknown
        if (
          prop.type.name &&
          (prop.type.name.includes("Object") ||
            prop.type.name.includes("GObject") ||
            prop.type.name.includes("Gtk") ||
            prop.type.name.includes("Gdk"))
        ) {
          tsType = "unknown";
        }
        code += `\t${propName}?: ${tsType};\n`;
      }
    }

    // Generate signals
    const widgetSpecificSignals: GirSignal[] = [];
    for (const signal of widgetSignals) {
      const signalName = this.toCamelCase(signal.name);
      if (!commonSignals.has(signalName)) {
        widgetSpecificSignals.push(signal);
      }
    }

    if (widgetSpecificSignals.length > 0) {
      code += `\n\t// Signals\n`;
      for (const signal of widgetSpecificSignals) {
        const signalName = this.toCamelCase(signal.name);
        const handlerName = `on${signalName.charAt(0).toUpperCase()}${signalName.slice(1)}`;

        // Generate signal handler type
        let handlerType = "() => void";
        if (signal.returnType) {
          const returnTypeMapping = this.typeMapper.mapType(signal.returnType);
          if (returnTypeMapping.ts !== "void") {
            handlerType = `() => ${returnTypeMapping.ts}`;
          }
        }
        if (signal.parameters && signal.parameters.length > 0) {
          const params = signal.parameters
            .map((p) => {
              const paramMapping = this.typeMapper.mapParameter(p);
              let paramType = paramMapping.ts;
              // Simplify Ref<T> to T for JSX props
              if (paramType.startsWith("Ref<")) {
                paramType = paramType.replace(/^Ref<(.+)>$/, "$1");
              }
              // Simplify complex types to unknown
              if (
                p.type.name &&
                (p.type.name.includes("Object") ||
                  p.type.name.includes("GObject") ||
                  p.type.name.includes("Gtk") ||
                  p.type.name.includes("Gdk"))
              ) {
                paramType = "unknown";
              }
              return `${this.toCamelCase(p.name)}: ${paramType}`;
            })
            .join(", ");
          if (signal.returnType) {
            const returnTypeMapping = this.typeMapper.mapType(
              signal.returnType
            );
            let returnType = returnTypeMapping.ts;
            // Simplify Ref<T> to T
            if (returnType.startsWith("Ref<")) {
              returnType = returnType.replace(/^Ref<(.+)>$/, "$1");
            }
            // Simplify complex types to unknown
            if (
              signal.returnType.name &&
              (signal.returnType.name.includes("Object") ||
                signal.returnType.name.includes("GObject") ||
                signal.returnType.name.includes("Gtk") ||
                signal.returnType.name.includes("Gdk"))
            ) {
              returnType = "unknown";
            }
            handlerType = `(${params}) => ${returnType}`;
          } else {
            handlerType = `(${params}) => void`;
          }
        }

        code += `\t${handlerName}?: ${handlerType};\n`;
      }
    }

    code += `}\n`;

    return code;
  }

  private async generateIndex(
    fileNames: IterableIterator<string>
  ): Promise<string> {
    let code = "";

    for (const fileName of fileNames) {
      if (fileName !== "index.ts") {
        const moduleName = fileName.replace(".ts", "");
        code += `export * from "./${moduleName}.js";\n`;
      }
    }

    return this.formatCode(code);
  }

  private generateParameterList(
    parameters: GirParameter[],
    makeAllOptional: boolean = false
  ): string {
    const filteredParams = parameters.filter(
      (param) => param.name !== "..." && param.name !== ""
    ); // Filter out varargs

    // Separate required and optional parameters
    const requiredParams: string[] = [];
    const optionalParams: string[] = [];

    for (const param of filteredParams) {
      const mapped = this.typeMapper.mapParameter(param);
      const paramName = this.toValidIdentifier(this.toCamelCase(param.name));
      const isOptional = makeAllOptional || this.typeMapper.isNullable(param);
      const paramStr = `${paramName}${isOptional ? "?" : ""}: ${mapped.ts}`;

      if (isOptional) {
        optionalParams.push(paramStr);
      } else {
        requiredParams.push(paramStr);
      }
    }

    // Combine with required params first
    return [...requiredParams, ...optionalParams].join(", ");
  }

  private generateCallArgument(
    paramName: string,
    ffiType: FfiTypeDescriptor
  ): string {
    const jsParamName = this.toValidIdentifier(this.toCamelCase(paramName));
    let code = `        {\n`;
    code += `          type: ${this.generateTypeDescriptor(ffiType)},\n`;
    code += `          value: ${jsParamName},\n`;
    code += `        }`;
    return code;
  }

  private generateTypeDescriptor(type: FfiTypeDescriptor): string {
    if (type.type === "int") {
      return `{ type: "int", size: ${type.size}, unsigned: ${type.unsigned} }`;
    } else if (type.type === "float") {
      return `{ type: "float", size: ${type.size} }`;
    } else if (type.type === "gobject") {
      const borrowed = type.borrowed ? `, borrowed: true` : "";
      return `{ type: "gobject"${borrowed} }`;
    } else if (type.type === "ref" && type.innerType) {
      return `{
            type: "ref",
            innerType: ${this.generateTypeDescriptor(type.innerType)},
          }`;
    } else if (type.type === "array" && type.itemType) {
      return `{ type: "array", itemType: ${this.generateTypeDescriptor(type.itemType)} }`;
    } else {
      return `{ type: "${type.type}" }`;
    }
  }

  private generateReturnTypeDescriptor(type: FfiTypeDescriptor): string {
    return this.generateTypeDescriptor(type);
  }

  private generateImports(): string {
    if (this.usesRef) {
      return `import { call, Ref } from "@gtkx/native";\n`;
    }
    return `import { call } from "@gtkx/native";\n`;
  }

  private async formatCode(code: string): Promise<string> {
    try {
      return await format(code, {
        parser: "typescript",
        ...(this.options.prettierConfig &&
        typeof this.options.prettierConfig === "object" &&
        this.options.prettierConfig !== null
          ? (this.options.prettierConfig as Record<string, unknown>)
          : {}),
      });
    } catch (error) {
      console.warn("Failed to format code:", error);
      return code;
    }
  }

  // Utility methods for case conversion
  private toCamelCase(str: string): string {
    // Replace both underscores and hyphens
    return str.replace(/[-_]([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  private toPascalCase(str: string): string {
    const camel = this.toCamelCase(str);
    return camel.charAt(0).toUpperCase() + camel.slice(1);
  }

  private toKebabCase(str: string): string {
    return str.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
  }

  private toConstantCase(str: string): string {
    return str.replace(/-/g, "_").toUpperCase();
  }

  private toValidIdentifier(str: string): string {
    // JavaScript reserved words that need to be escaped
    const reservedWords = new Set([
      "break",
      "case",
      "catch",
      "class",
      "const",
      "continue",
      "debugger",
      "default",
      "delete",
      "do",
      "else",
      "export",
      "extends",
      "false",
      "finally",
      "for",
      "function",
      "if",
      "import",
      "in",
      "instanceof",
      "new",
      "null",
      "return",
      "super",
      "switch",
      "this",
      "throw",
      "true",
      "try",
      "typeof",
      "var",
      "void",
      "while",
      "with",
      "yield",
      // Also common problematic names
      "let",
      "static",
      "enum",
      "implements",
      "interface",
      "package",
      "private",
      "protected",
      "public",
      "await",
      "async",
    ]);

    // Replace invalid characters with underscores
    let result = str.replace(/[^a-zA-Z0-9_$]/g, "_");

    // If it's a reserved word, prefix with underscore
    if (reservedWords.has(result)) {
      result = `_${result}`;
    }

    // Ensure it doesn't start with a number
    if (/^\d/.test(result)) {
      result = `_${result}`;
    }

    return result;
  }
}
