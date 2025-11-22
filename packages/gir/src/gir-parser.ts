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
			isArray: (_name, jpath, _isLeafNode, _isAttribute) => {
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
			cPrefix:
				namespace["@_c:identifier-prefixes"] || namespace["@_c:prefix"] || "",
			classes: this.parseClasses(namespace.class || []),
			interfaces: this.parseInterfaces(namespace.interface || []),
			functions: this.parseFunctions(namespace.function || []),
			enumerations: this.parseEnumerations(namespace.enumeration || []),
		};
	}

	private parseClasses(classes: Record<string, unknown>[]): GirClass[] {
		return classes.map((cls) => ({
			name: String(cls["@_name"] ?? ""),
			cType: String(
				cls["@_c:type"] || cls["@_glib:type-name"] || "",
			),
			parent: String(cls["@_parent"] ?? ""),
			abstract: cls["@_abstract"] === "1",
			methods: this.parseMethods(
				Array.isArray(cls.method)
					? (cls.method as Record<string, unknown>[])
					: [],
			),
			constructors: this.parseConstructors(
				Array.isArray(cls.constructor)
					? (cls.constructor as Record<string, unknown>[])
					: [],
			),
			properties: this.parseProperties(
				Array.isArray(cls.property)
					? (cls.property as Record<string, unknown>[])
					: [],
			),
			signals: this.parseSignals(
				Array.isArray(cls["glib:signal"])
					? (cls["glib:signal"] as Record<string, unknown>[])
					: [],
			),
		}));
	}

	private parseInterfaces(
		interfaces: Record<string, unknown>[],
	): GirInterface[] {
		if (!interfaces || !Array.isArray(interfaces)) {
			return [];
		}
		return interfaces.map((iface) => ({
			name: String(iface["@_name"] ?? ""),
			cType: String(
				iface["@_c:type"] || iface["@_glib:type-name"] || "",
			),
			methods: this.parseMethods(
				Array.isArray(iface.method)
					? (iface.method as Record<string, unknown>[])
					: [],
			),
			properties: this.parseProperties(
				Array.isArray(iface.property)
					? (iface.property as Record<string, unknown>[])
					: [],
			),
			signals: this.parseSignals(
				Array.isArray(iface["glib:signal"])
					? (iface["glib:signal"] as Record<string, unknown>[])
					: [],
			),
		}));
	}

	private parseMethods(methods: Record<string, unknown>[]): GirMethod[] {
		if (!methods || !Array.isArray(methods)) {
			return [];
		}
		return methods.map((method) => ({
			name: String(method["@_name"] ?? ""),
			cIdentifier: String(method["@_c:identifier"] ?? ""),
			returnType: this.parseReturnType(
				method["return-value"] as
					| Record<string, unknown>
					| undefined,
			),
			parameters: this.parseParameters(
				(method.parameters &&
					typeof method.parameters === "object" &&
					method.parameters !== null
					? method.parameters
					: {}) as Record<string, unknown>,
			),
			throws: method["@_throws"] === "1",
		}));
	}

	private parseConstructors(
		constructors: Record<string, unknown>[],
	): GirConstructor[] {
		if (!constructors || !Array.isArray(constructors)) {
			return [];
		}
		return constructors.map((ctor) => ({
			name: String(ctor["@_name"] ?? ""),
			cIdentifier: String(ctor["@_c:identifier"] ?? ""),
			returnType: this.parseReturnType(
				ctor["return-value"] as
					| Record<string, unknown>
					| undefined,
			),
			parameters: this.parseParameters(
				(ctor.parameters &&
					typeof ctor.parameters === "object" &&
					ctor.parameters !== null
					? ctor.parameters
					: {}) as Record<string, unknown>,
			),
		}));
	}

	private parseFunctions(functions: Record<string, unknown>[]): GirFunction[] {
		if (!functions || !Array.isArray(functions)) {
			return [];
		}
		return functions.map((func) => ({
			name: String(func["@_name"] ?? ""),
			cIdentifier: String(func["@_c:identifier"] ?? ""),
			returnType: this.parseReturnType(
				func["return-value"] as
					| Record<string, unknown>
					| undefined,
			),
			parameters: this.parseParameters(
				(func.parameters &&
					typeof func.parameters === "object" &&
					func.parameters !== null
					? func.parameters
					: {}) as Record<string, unknown>,
			),
			throws: func["@_throws"] === "1",
		}));
	}

	private parseParameters(
		parametersNode: Record<string, unknown>,
	): GirParameter[] {
		if (!parametersNode || !parametersNode.parameter) {
			return [];
		}

		const params = Array.isArray(parametersNode.parameter)
			? parametersNode.parameter
			: [parametersNode.parameter];

		return params.map((param: Record<string, unknown>) => ({
			name: String(param["@_name"] ?? ""),
			type: this.parseType(
				(param.type || param.array) as
					| Record<string, unknown>
					| undefined,
			),
			direction: (String(param["@_direction"] ?? "in") as
				| "in"
				| "out"
				| "inout") || "in",
			nullable: param["@_nullable"] === "1",
			optional: param["@_allow-none"] === "1",
		}));
	}

	private parseReturnType(
		returnValue: Record<string, unknown> | undefined,
	): GirType {
		if (!returnValue) {
			return { name: "void" };
		}
		return this.parseType(
			(returnValue.type || returnValue.array) as
				| Record<string, unknown>
				| undefined,
		);
	}

	private parseType(typeNode: Record<string, unknown> | undefined): GirType {
		if (!typeNode) {
			return { name: "void" };
		}

		if (typeNode["@_name"]) {
			return {
				name: String(typeNode["@_name"] ?? ""),
				cType: typeNode["@_c:type"]
					? String(typeNode["@_c:type"])
					: undefined,
			};
		}

		// Handle array types
		// Array can be identified by having a type child or by being the array itself
		if (
			typeNode.type ||
			typeNode["@_zero-terminated"] !== undefined ||
			typeNode["@_fixed-size"] !== undefined ||
			typeNode["@_length"] !== undefined
		) {
			return {
				name: "array",
				isArray: true,
				elementType: typeNode.type
					? this.parseType(typeNode.type as Record<string, unknown>)
					: undefined,
			};
		}

		return { name: "void" };
	}

	private parseProperties(
		properties: Record<string, unknown>[],
	): GirProperty[] {
		if (!properties || !Array.isArray(properties)) {
			return [];
		}
		return properties.map((prop) => ({
			name: String(prop["@_name"] ?? ""),
			type: this.parseType(prop.type as Record<string, unknown> | undefined),
			readable: prop["@_readable"] !== "0",
			writable: prop["@_writable"] === "1",
			constructOnly: prop["@_construct-only"] === "1",
		}));
	}

	private parseSignals(signals: Record<string, unknown>[]): GirSignal[] {
		if (!signals || !Array.isArray(signals)) {
			return [];
		}
		return signals.map((signal) => {
			const whenValue = String(signal["@_when"] ?? "last");
			return {
				name: String(signal["@_name"] ?? ""),
				when: (whenValue === "first" ||
				whenValue === "last" ||
				whenValue === "cleanup"
					? whenValue
					: "last") as "first" | "last" | "cleanup" | undefined,
				returnType: signal["return-value"]
					? this.parseReturnType(
							signal["return-value"] as Record<string, unknown>,
						)
					: undefined,
				parameters: signal.parameters &&
					typeof signal.parameters === "object" &&
					signal.parameters !== null
					? this.parseParameters(
							signal.parameters as Record<string, unknown>,
						)
					: [],
			};
		});
	}

	private parseEnumerations(
		enumerations: Record<string, unknown>[],
	): GirEnumeration[] {
		if (!enumerations || !Array.isArray(enumerations)) {
			return [];
		}
		return enumerations.map((enumeration) => ({
			name: String(enumeration["@_name"] ?? ""),
			cType: String(enumeration["@_c:type"] ?? ""),
			members: this.parseEnumerationMembers(
				Array.isArray(enumeration.member)
					? (enumeration.member as Record<string, unknown>[])
					: [],
			),
		}));
	}

	private parseEnumerationMembers(
		members: Record<string, unknown>[],
	): GirEnumerationMember[] {
		if (!members || !Array.isArray(members)) {
			return [];
		}
		return members.map((member) => ({
			name: String(member["@_name"] ?? ""),
			value: String(member["@_value"] ?? ""),
			cIdentifier: String(member["@_c:identifier"] ?? ""),
		}));
	}
}
