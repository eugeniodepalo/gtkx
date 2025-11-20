import { XMLParser } from "fast-xml-parser";

export interface GirNamespace {
  name: string;
  version: string;
  sharedLibrary: string;
  cPrefix: string;
  classes: GirClass[];
  interfaces: GirInterface[];
  functions: GirFunction[];
  enumerations: GirEnumeration[];
}

export interface GirInterface {
  name: string;
  cType: string;
  methods: GirMethod[];
  properties: GirProperty[];
  signals: GirSignal[];
}

export interface GirClass {
  name: string;
  cType: string;
  parent?: string;
  abstract?: boolean;
  methods: GirMethod[];
  constructors: GirConstructor[];
  properties: GirProperty[];
  signals: GirSignal[];
}

export interface GirMethod {
  name: string;
  cIdentifier: string;
  returnType: GirType;
  parameters: GirParameter[];
  throws?: boolean;
}

export interface GirConstructor {
  name: string;
  cIdentifier: string;
  returnType: GirType;
  parameters: GirParameter[];
}

export interface GirFunction {
  name: string;
  cIdentifier: string;
  returnType: GirType;
  parameters: GirParameter[];
  throws?: boolean;
}

export interface GirParameter {
  name: string;
  type: GirType;
  direction?: "in" | "out" | "inout";
  nullable?: boolean;
  optional?: boolean;
}

export interface GirType {
  name: string;
  cType?: string;
  isArray?: boolean;
  elementType?: GirType;
}

export interface GirProperty {
  name: string;
  type: GirType;
  readable?: boolean;
  writable?: boolean;
  constructOnly?: boolean;
}

export interface GirSignal {
  name: string;
  when?: "first" | "last" | "cleanup";
  returnType?: GirType;
  parameters?: GirParameter[];
}

export interface GirEnumeration {
  name: string;
  cType: string;
  members: GirEnumerationMember[];
}

export interface GirEnumerationMember {
  name: string;
  value: string;
  cIdentifier: string;
}

export class GirParser {
  private parser: XMLParser;

  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      textNodeName: "#text",
      isArray: (name, jpath, isLeafNode, isAttribute) => {
        // Force arrays for certain elements
        // Note: paths start with "repository" so we slice it off
        const arrayElements = [
          "namespace.class",
          "namespace.interface",
          "namespace.function",
          "namespace.enumeration",
          "namespace.class.method",
          "namespace.class.constructor",
          "namespace.class.property",
          "namespace.class.signal",
          "namespace.interface.method",
          "namespace.interface.property",
          "namespace.interface.signal",
          "namespace.class.method.parameters.parameter",
          "namespace.class.constructor.parameters.parameter",
          "namespace.function.parameters.parameter",
          "namespace.enumeration.member",
          "namespace.interface.method.parameters.parameter",
        ];
        
        const path = jpath.split(".").slice(1).join(".");
        return arrayElements.includes(path);
      },
    });
  }

  parse(girXml: string): GirNamespace {
    const parsed = this.parser.parse(girXml);
    const repository = parsed.repository;
    
    if (!repository || !repository.namespace) {
      throw new Error("Invalid GIR file: missing repository or namespace");
    }

    const namespace = repository.namespace;
    
    return {
      name: namespace["@_name"],
      version: namespace["@_version"],
      sharedLibrary: namespace["@_shared-library"] || "",
      cPrefix: namespace["@_c:identifier-prefixes"] || namespace["@_c:prefix"] || "",
      classes: this.parseClasses(namespace.class || []),
      interfaces: this.parseInterfaces(namespace.interface || []),
      functions: this.parseFunctions(namespace.function || []),
      enumerations: this.parseEnumerations(namespace.enumeration || []),
    };
  }

  private parseClasses(classes: any[]): GirClass[] {
    return classes.map(cls => ({
      name: cls["@_name"],
      cType: cls["@_c:type"] || cls["@_glib:type-name"],
      parent: cls["@_parent"],
      abstract: cls["@_abstract"] === "1",
      methods: this.parseMethods(cls.method || []),
      constructors: this.parseConstructors(cls.constructor || []),
      properties: this.parseProperties(cls.property || []),
      signals: this.parseSignals(cls["glib:signal"] || []),
    }));
  }

  private parseInterfaces(interfaces: any[]): GirInterface[] {
    if (!interfaces || !Array.isArray(interfaces)) {
      return [];
    }
    return interfaces.map(iface => ({
      name: iface["@_name"],
      cType: iface["@_c:type"] || iface["@_glib:type-name"],
      methods: this.parseMethods(iface.method || []),
      properties: this.parseProperties(iface.property || []),
      signals: this.parseSignals(iface["glib:signal"] || []),
    }));
  }

  private parseMethods(methods: any[]): GirMethod[] {
    if (!methods || !Array.isArray(methods)) {
      return [];
    }
    return methods.map(method => ({
      name: method["@_name"],
      cIdentifier: method["@_c:identifier"],
      returnType: this.parseReturnType(method["return-value"]),
      parameters: this.parseParameters(method.parameters),
      throws: method["@_throws"] === "1",
    }));
  }

  private parseConstructors(constructors: any[]): GirConstructor[] {
    if (!constructors || !Array.isArray(constructors)) {
      return [];
    }
    return constructors.map(constructor => ({
      name: constructor["@_name"],
      cIdentifier: constructor["@_c:identifier"],
      returnType: this.parseReturnType(constructor["return-value"]),
      parameters: this.parseParameters(constructor.parameters),
    }));
  }

  private parseFunctions(functions: any[]): GirFunction[] {
    if (!functions || !Array.isArray(functions)) {
      return [];
    }
    return functions.map(func => ({
      name: func["@_name"],
      cIdentifier: func["@_c:identifier"],
      returnType: this.parseReturnType(func["return-value"]),
      parameters: this.parseParameters(func.parameters),
      throws: func["@_throws"] === "1",
    }));
  }

  private parseParameters(parametersNode: any): GirParameter[] {
    if (!parametersNode || !parametersNode.parameter) {
      return [];
    }

    const params = Array.isArray(parametersNode.parameter) 
      ? parametersNode.parameter 
      : [parametersNode.parameter];

    return params.map((param: any) => ({
      name: param["@_name"],
      type: this.parseType(param.type || param.array),
      direction: param["@_direction"] || "in",
      nullable: param["@_nullable"] === "1",
      optional: param["@_allow-none"] === "1",
    }));
  }

  private parseReturnType(returnValue: any): GirType {
    if (!returnValue) {
      return { name: "void" };
    }
    return this.parseType(returnValue.type || returnValue.array);
  }

  private parseType(typeNode: any): GirType {
    if (!typeNode) {
      return { name: "void" };
    }

    if (typeNode["@_name"]) {
      return {
        name: typeNode["@_name"],
        cType: typeNode["@_c:type"],
      };
    }

    // Handle array types
    // Array can be identified by having a type child or by being the array itself
    if (typeNode.type || typeNode["@_zero-terminated"] !== undefined || typeNode["@_fixed-size"] !== undefined || typeNode["@_length"] !== undefined) {
      return {
        name: "array",
        isArray: true,
        elementType: typeNode.type ? this.parseType(typeNode.type) : undefined,
      };
    }

    return { name: "void" };
  }

  private parseProperties(properties: any[]): GirProperty[] {
    if (!properties || !Array.isArray(properties)) {
      return [];
    }
    return properties.map(prop => ({
      name: prop["@_name"],
      type: this.parseType(prop.type),
      readable: prop["@_readable"] !== "0",
      writable: prop["@_writable"] === "1",
      constructOnly: prop["@_construct-only"] === "1",
    }));
  }

  private parseSignals(signals: any[]): GirSignal[] {
    if (!signals || !Array.isArray(signals)) {
      return [];
    }
    return signals.map(signal => ({
      name: signal["@_name"],
      when: signal["@_when"] || "last",
      returnType: signal["return-value"] ? this.parseReturnType(signal["return-value"]) : undefined,
      parameters: signal.parameters ? this.parseParameters(signal.parameters) : [],
    }));
  }

  private parseEnumerations(enumerations: any[]): GirEnumeration[] {
    if (!enumerations || !Array.isArray(enumerations)) {
      return [];
    }
    return enumerations.map(enumeration => ({
      name: enumeration["@_name"],
      cType: enumeration["@_c:type"],
      members: this.parseEnumerationMembers(enumeration.member || []),
    }));
  }

  private parseEnumerationMembers(members: any[]): GirEnumerationMember[] {
    if (!members || !Array.isArray(members)) {
      return [];
    }
    return members.map(member => ({
      name: member["@_name"],
      value: member["@_value"],
      cIdentifier: member["@_c:identifier"],
    }));
  }
}
