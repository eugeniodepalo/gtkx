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
} from "@gtkx/gir";
import { TypeMapper, type FfiTypeDescriptor } from "./type-mapper.js";

export interface GeneratorOptions {
  outputDir: string;
  namespace: string;
  prettierConfig?: unknown;
}

export class CodeGenerator {
  private typeMapper: TypeMapper;
  private usesRef: boolean = false;
  private usedEnums: Set<string> = new Set();

  constructor(private options: GeneratorOptions) {
    this.typeMapper = new TypeMapper();
  }

  async generateNamespace(
    namespace: GirNamespace
  ): Promise<Map<string, string>> {
    const files = new Map<string, string>();

    // Register all enum names with the type mapper so they can be properly typed
    // Register both original name and transformed name since GIR uses original
    // but we export transformed
    for (const enumeration of namespace.enumerations) {
      const transformedName = this.toPascalCase(enumeration.name);
      this.typeMapper.registerEnum(enumeration.name, transformedName);
    }

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

    return files;
  }

  private async generateClass(
    cls: GirClass,
    sharedLibrary: string,
    classMap: Map<string, GirClass>
  ): Promise<string> {
    this.usesRef = false;
    this.usedEnums.clear();
    this.typeMapper.setEnumUsageCallback((enumName) => {
      this.usedEnums.add(enumName);
    });

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

    let className = this.toPascalCase(cls.name);

    // Rename Object to avoid conflicts with JavaScript's built-in Object
    if (className === "Object") {
      className = "GObject";
    }

    let code = "";

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
      code += `  ptr: unknown;\n\n`;
    } else if (cls.constructors.length === 0) {
      // Derived class with no constructor - add ptr to avoid abstract member issues
      code += `  ptr: unknown = undefined as any;\n\n`;
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

    // Generate imports now that we know which enums are used
    const imports = this.generateImports();
    code = imports + code;

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
    this.usedEnums.clear();
    this.typeMapper.setEnumUsageCallback((enumName) => {
      this.usedEnums.add(enumName);
    });

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
    const interfaceName = this.toPascalCase(iface.name);

    let code = "";

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

    // Generate imports now that we know which enums are used
    const imports = this.generateImports();
    code = imports + code;

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
      ["MenuButton", new Map([
        ["getDirection", "getArrowDirection"],
        ["setDirection", "setArrowDirection"]
      ])],
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

    // Check if any parameter is named 'result' to avoid conflicts
    const hasResultParam = method.parameters.some(
      p => this.toValidIdentifier(this.toCamelCase(p.name)) === "result"
    );
    const resultVarName = hasResultParam ? "_result" : "result";

    // If method can throw, create error ref
    if (method.throws) {
      code += `    const error = { value: null as unknown };\n`;
    }

    // Generate call
    const needsCast =
      returnTypeMapping.ts !== "void" && returnTypeMapping.ts !== "unknown";
    const hasReturnValue = returnTypeMapping.ts !== "void";

    // Store result if we need to check for errors first, otherwise return directly
    if (method.throws) {
      if (hasReturnValue) {
        code += `    const ${resultVarName} = `;
      } else {
        code += `    `;
      }
    } else {
      if (hasReturnValue) {
        code += `    return `;
      } else {
        code += `    `;
      }
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

    // Add GError** parameter if method can throw
    if (method.throws) {
      code += `        {\n`;
      code += `          type: { type: "ref", innerType: { type: "gobject" } },\n`;
      code += `          value: error,\n`;
      code += `        },\n`;
    }

    code += `      ],\n`;
    code += `      ${this.generateReturnTypeDescriptor(returnTypeMapping.ffi)}\n`;
    code += `    )`;

    // Add type cast if needed
    if (needsCast) {
      code += ` as ${tsReturnType}`;
    }

    code += `;\n`;

    // Check for errors and throw if needed
    if (method.throws) {
      code += this.generateErrorCheck(sharedLibrary);
      if (returnTypeMapping.ts !== "void") {
        code += `    return ${resultVarName};\n`;
      }
    }

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

  private generateErrorCheck(_sharedLibrary: string): string {
    let code = `    if (error.value !== null) {\n`;
    code += `      // Create JavaScript error with GError attached\n`;
    code += `      const jsError = new Error("GLib Error occurred");\n`;
    code += `      (jsError as any).gError = error.value;\n`;
    code += `      throw jsError;\n`;
    code += `    }\n`;
    return code;
  }

  private generateSignalConnect(
    sharedLibrary: string,
    hasConnectMethod: boolean = false
  ): string {
    // Use "on" instead of "connect" if there's already a connect method
    const methodName = hasConnectMethod ? "on" : "connect";
    // g_signal_connect_closure returns gulong (handler ID)
    return `  ${methodName}(
    signal: string,
    handler: (...args: unknown[]) => unknown,
    after = false
  ): number {
    return call(
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
      { type: "int", size: 64, unsigned: true }
    ) as number;
  }`;
  }

  private async generateFunctions(
    functions: GirFunction[],
    sharedLibrary: string
  ): Promise<string> {
    this.usesRef = false;
    this.usedEnums.clear();
    this.typeMapper.setEnumUsageCallback((enumName) => {
      this.usedEnums.add(enumName);
    });

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
    let code = "";

    for (const func of functions) {
      const funcName = this.toValidIdentifier(this.toCamelCase(func.name));
      const params = this.generateParameterList(func.parameters);
      const returnTypeMapping = this.typeMapper.mapType(func.returnType, true);
      const tsReturnType =
        returnTypeMapping.ts === "void" ? "" : `: ${returnTypeMapping.ts}`;

      code += `export const ${funcName} = (${params})${tsReturnType} => {\n`;

      // Check if any parameter is named 'result' to avoid conflicts
      const hasResultParam = func.parameters.some(
        p => this.toValidIdentifier(this.toCamelCase(p.name)) === "result"
      );
      const resultVarName = hasResultParam ? "_result" : "result";

      // If function can throw, create error ref
      if (func.throws) {
        code += `  const error = { value: null as unknown };\n`;
      }

      const needsCast =
        returnTypeMapping.ts !== "void" && returnTypeMapping.ts !== "unknown";
      const hasReturnValue = returnTypeMapping.ts !== "void";

      // Store result if we need to check for errors first, otherwise return directly
      if (func.throws) {
        if (hasReturnValue) {
          code += `  const ${resultVarName} = `;
        } else {
          code += `  `;
        }
      } else {
        if (hasReturnValue) {
          code += `  return `;
        } else {
          code += `  `;
        }
      }

      code += `call("${sharedLibrary}", "${func.cIdentifier}", [\n`;

      // Add parameters
      for (const param of func.parameters) {
        if (param.name === "..." || param.name === "") continue; // Skip varargs
        const mapped = this.typeMapper.mapParameter(param);
        code += this.generateCallArgument(param.name, mapped.ffi);
        code += ",\n";
      }

      // Add GError** parameter if function can throw
      if (func.throws) {
        code += `    {\n`;
        code += `      type: { type: "ref", innerType: { type: "gobject" } },\n`;
        code += `      value: error,\n`;
        code += `    },\n`;
      }

      code += `  ], ${this.generateReturnTypeDescriptor(returnTypeMapping.ffi)})`;

      // Add type cast if needed
      if (needsCast) {
        code += ` as ${returnTypeMapping.ts}`;
      }

      code += `;\n`;

      // Check for errors and throw if needed
      if (func.throws) {
        code += this.generateErrorCheck(sharedLibrary);
        if (returnTypeMapping.ts !== "void") {
          code += `  return ${resultVarName};\n`;
        }
      }

      code += `};\n\n`;
    }

    // Generate imports now that we know which enums are used
    const imports = this.generateImports();
    code = imports + code;

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
    let imports = "";

    // Import from native
    if (this.usesRef) {
      imports += `import { call, Ref } from "@gtkx/native";\n`;
    } else {
      imports += `import { call } from "@gtkx/native";\n`;
    }

    // Import enums if any were used
    if (this.usedEnums.size > 0) {
      const enumList = Array.from(this.usedEnums).sort().join(", ");
      imports += `import { ${enumList} } from "./enums.js";\n`;
    }

    return imports;
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
