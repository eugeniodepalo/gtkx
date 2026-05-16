import type {
    GirAliasElement,
    GirArrayType,
    GirBitfieldElement,
    GirCallableParams,
    GirCallableReturn,
    GirCallbackElement,
    GirClassElement,
    GirConstantElement,
    GirConstructorElement,
    GirEnumElement,
    GirFieldElement,
    GirFunctionElement,
    GirInterfaceElement,
    GirMemberElement,
    GirMethodElement,
    GirNamespace,
    GirPropertyElement,
    GirRecordElement,
    GirSignalElement,
    GirType,
    GirUnionElement,
    GirVirtualMethodElement,
} from "@ts-for-gir/lib";
import type {
    RawAlias,
    RawCallback,
    RawClass,
    RawConstant,
    RawConstructor,
    RawEnumeration,
    RawEnumerationMember,
    RawField,
    RawFunction,
    RawInterface,
    RawMethod,
    RawNamespace,
    RawParameter,
    RawProperty,
    RawRecord,
    RawSignal,
    RawType,
} from "./raw-types.js";

/**
 * Adapts ts-for-gir's parsed GIR element tree into the codegen's
 * {@link RawNamespace}.
 *
 * `ModuleLoader` parses every `.gir` file into a `GirModule` whose `ns` is a
 * raw, XML-shaped `GirNamespace`: attributes grouped under `$`, text under `_`,
 * and child elements as arrays. This module maps that tree into the
 * `RawNamespace` shape the normalizer consumes, carrying the FFI-relevant
 * semantics codegen depends on — GLib container classification, inline
 * composites and callbacks, shadow renames, and callback closure/destroy/scope
 * metadata.
 *
 * @packageDocumentation
 */

type RawAttrs = Record<string, string | undefined>;

type TypeBearer = { type?: GirType[]; array?: GirArrayType[] };

const GPOINTER_TYPE: RawType = { name: "gpointer", cType: "gpointer" };

function attrsOf(element: unknown): RawAttrs {
    const grouped = (element as { $?: unknown } | null | undefined)?.$;
    return grouped !== null && typeof grouped === "object" ? (grouped as RawAttrs) : {};
}

function extractDoc(element: unknown): string | undefined {
    const doc = (element as { doc?: ReadonlyArray<{ _?: unknown }> } | null | undefined)?.doc;
    const text = doc?.[0]?._;
    return typeof text === "string" ? text.trim() : undefined;
}

function looseChildren(element: unknown, key: string): unknown[] {
    const value = (element as Record<string, unknown> | null | undefined)?.[key];
    if (Array.isArray(value)) return value;
    return value === undefined || value === null ? [] : [value];
}

/**
 * Reads a `<constructor>` child list defensively: `constructor` collides with
 * `Object.prototype.constructor`, so an element with no `<constructor>` child
 * resolves to the `Object` constructor function rather than `undefined`.
 */
function constructorElements(element: { constructor?: GirConstructorElement[] }): GirConstructorElement[] {
    const value = element.constructor;
    return Array.isArray(value) ? value : [];
}

function pickTypeNode(element: TypeBearer): GirType | GirArrayType | undefined {
    return element.type?.[0] ?? element.array?.[0];
}

function asTransferOwnership(value: string | undefined): "none" | "full" | "container" | undefined {
    return value === "none" || value === "full" || value === "container" ? value : undefined;
}

/**
 * Maps a ts-for-gir `GirNamespace` into the codegen's {@link RawNamespace}.
 *
 * @param namespace - A namespace element from a parsed `GirModule.ns`
 * @returns The raw namespace consumed by the normalizer
 */
export function adaptNamespace(namespace: GirNamespace): RawNamespace {
    const a = attrsOf(namespace);
    return {
        name: a.name ?? "",
        version: a.version ?? "",
        sharedLibrary: a["shared-library"] ?? "",
        cPrefix: a["c:identifier-prefixes"] ?? a["c:prefix"] ?? "",
        classes: adaptClasses(namespace.class ?? []),
        interfaces: adaptInterfaces(namespace.interface ?? []),
        functions: adaptFunctions(namespace.function ?? []),
        enumerations: adaptEnumerations(namespace.enumeration ?? []),
        bitfields: adaptEnumerations(namespace.bitfield ?? []),
        records: [...adaptRecords(namespace.record ?? [], false), ...adaptRecords(namespace.union ?? [], true)],
        callbacks: adaptCallbacks(namespace.callback ?? []),
        constants: adaptConstants(namespace.constant ?? []),
        aliases: adaptAliases(namespace.alias ?? []),
    };
}

function adaptClasses(classes: GirClassElement[]): RawClass[] {
    return classes.map((cls) => {
        const a = attrsOf(cls);
        return {
            name: a.name ?? "",
            cType: a["c:type"] ?? a["glib:type-name"] ?? "",
            parent: a.parent,
            abstract: a.abstract === "1",
            glibTypeName: a["glib:type-name"],
            glibGetType: a["glib:get-type"],
            cSymbolPrefix: a["c:symbol-prefix"],
            fundamental: a["glib:fundamental"] === "1",
            refFunc: a["glib:ref-func"],
            unrefFunc: a["glib:unref-func"],
            implements: adaptNames(cls.implements),
            methods: adaptMethods(cls.method ?? []),
            constructors: adaptConstructors(constructorElements(cls)),
            functions: adaptFunctions(cls.function ?? []),
            properties: adaptProperties(cls.property ?? []),
            signals: adaptSignals(cls["glib:signal"] ?? []),
            fieldNames: adaptFieldNames(cls.field ?? []),
            fields: adaptFields(cls.field ?? []),
            virtualMethodNames: adaptVirtualMethodNames(cls["virtual-method"] ?? []),
            doc: extractDoc(cls),
        };
    });
}

function adaptInterfaces(interfaces: GirInterfaceElement[]): RawInterface[] {
    return interfaces.map((iface) => {
        const a = attrsOf(iface);
        return {
            name: a.name ?? "",
            cType: a["c:type"] ?? a["glib:type-name"] ?? "",
            glibTypeName: a["glib:type-name"],
            glibGetType: a["glib:get-type"],
            prerequisites: adaptNames(iface.prerequisite),
            methods: adaptMethods(iface.method ?? []),
            functions: adaptFunctions(iface.function ?? []),
            properties: adaptProperties(iface.property ?? []),
            signals: adaptSignals(iface["glib:signal"] ?? []),
            fieldNames: adaptFieldNames(iface.field ?? []),
            virtualMethodNames: adaptVirtualMethodNames(iface["virtual-method"] ?? []),
            doc: extractDoc(iface),
        };
    });
}

/**
 * Extracts the declared `<field>` element names of a class or interface.
 *
 * Only the names are kept: the type pipeline uses them to strip the
 * instance-struct field declarations that ts-for-gir emits into GObject
 * class and interface bodies, which node-gtk's runtime never exposes.
 */
function adaptFieldNames(fields: GirFieldElement[]): string[] {
    return fields.map((field) => attrsOf(field).name ?? "").filter((name) => name.length > 0);
}

/**
 * Extracts the declared `<virtual-method>` element names of a class or
 * interface.
 *
 * The type pipeline uses these to strip the action-method declarations
 * ts-for-gir emits for interface virtual methods, which node-gtk's runtime
 * never exposes as callable members.
 */
function adaptVirtualMethodNames(methods: GirVirtualMethodElement[]): string[] {
    return methods.map((method) => attrsOf(method).name ?? "").filter((name) => name.length > 0);
}

function adaptNames(elements: ReadonlyArray<unknown> | undefined): string[] {
    if (!elements) return [];
    return elements.map((element) => attrsOf(element).name ?? "").filter((name) => name.length > 0);
}

function adaptMethods(methods: GirMethodElement[]): RawMethod[] {
    return methods
        .filter((method) => attrsOf(method).introspectable !== "0")
        .map((method) => ({
            ...adaptCallable(method),
            instanceParameter: adaptInstanceParameter(method.parameters?.[0]),
            finishFunc: attrsOf(method)["glib:finish-func"] || undefined,
        }));
}

function adaptConstructors(constructors: GirConstructorElement[]): RawConstructor[] {
    return constructors.filter((ctor) => attrsOf(ctor).introspectable !== "0").map(adaptCallable);
}

function adaptFunctions(functions: GirFunctionElement[]): RawFunction[] {
    return functions
        .filter((func) => attrsOf(func).introspectable !== "0")
        .map((func) => ({
            ...adaptCallable(func),
            finishFunc: attrsOf(func)["glib:finish-func"] || undefined,
        }));
}

function adaptCallable(callable: GirMethodElement | GirConstructorElement | GirFunctionElement): RawConstructor {
    const a = attrsOf(callable);
    const returnValue = callable["return-value"]?.[0];
    return {
        name: a.name ?? "",
        cIdentifier: a["c:identifier"] ?? "",
        returnType: adaptReturnType(returnValue),
        parameters: adaptParameters(callable.parameters?.[0]),
        throws: a.throws === "1",
        doc: extractDoc(callable),
        returnDoc: returnValue ? extractDoc(returnValue) : undefined,
        shadows: a.shadows || undefined,
        shadowedBy: a["shadowed-by"] || undefined,
    };
}

function adaptCallbacks(callbacks: GirCallbackElement[]): RawCallback[] {
    return callbacks
        .filter((callback) => attrsOf(callback).introspectable !== "0")
        .map((callback) => {
            const a = attrsOf(callback);
            return {
                name: a.name ?? "",
                cType: a["c:type"] ?? "",
                returnType: adaptReturnType(callback["return-value"]?.[0]),
                parameters: adaptParameters(callback.parameters?.[0]),
                doc: extractDoc(callback),
            };
        });
}

function adaptRecords(records: Array<GirRecordElement | GirUnionElement>, isUnion: boolean): RawRecord[] {
    return records.map((record) => {
        const a = attrsOf(record);
        return {
            name: a.name ?? "",
            cType: a["c:type"] ?? a["glib:type-name"] ?? "",
            opaque: a.opaque === "1",
            disguised: a.disguised === "1",
            isUnion,
            glibTypeName: a["glib:type-name"],
            glibGetType: a["glib:get-type"],
            isGtypeStructFor: a["glib:is-gtype-struct-for"] || undefined,
            copyFunction: a["copy-function"],
            freeFunction: a["free-function"],
            fields: adaptRecordMembers(record),
            methods: adaptMethods(record.method ?? []),
            constructors: adaptConstructors(constructorElements(record)),
            functions: adaptFunctions(record.function ?? []),
            doc: extractDoc(record),
        };
    });
}

/**
 * Adapts the field-like members of a record or union: declared `<field>`
 * elements followed by inline `<record>` / `<union>` composite members.
 */
function adaptRecordMembers(node: GirRecordElement | GirUnionElement): RawField[] {
    return [
        ...adaptFields(node.field ?? []),
        ...looseChildren(node, "record").map((nested) => adaptInlineComposite(nested as GirRecordElement, false)),
        ...looseChildren(node, "union").map((nested) => adaptInlineComposite(nested as GirUnionElement, true)),
    ];
}

/**
 * Adapts an inline `<record>` / `<union>` composite into a private,
 * accessor-less field whose `inlineComposite` carries the nested layout.
 */
function adaptInlineComposite(node: GirRecordElement | GirUnionElement, isUnion: boolean): RawField {
    return {
        name: attrsOf(node).name ?? "",
        type: { ...GPOINTER_TYPE },
        private: true,
        inlineComposite: { isUnion, fields: adaptRecordMembers(node) },
    };
}

function adaptFields(fields: GirFieldElement[]): RawField[] {
    return fields.map((field) => {
        const a = attrsOf(field);
        const fieldName = a.name ?? "";
        const callbackNode = field.callback?.[0];
        const callback = callbackNode ? adaptInlineCallback(callbackNode, fieldName) : undefined;
        const type = callback ? { ...GPOINTER_TYPE } : adaptType(pickTypeNode(field));
        const bits = a.bits === undefined ? undefined : Number(a.bits);
        return {
            name: fieldName,
            type,
            writable: a.writable === "1",
            readable: a.readable !== "0",
            private: a.private === "1",
            bits: bits !== undefined && Number.isFinite(bits) && bits > 0 ? bits : undefined,
            callback,
            doc: extractDoc(field),
        };
    });
}

function adaptInlineCallback(node: GirCallbackElement, fieldName: string): RawCallback {
    const a = attrsOf(node);
    return {
        name: a.name || fieldName,
        cType: a["c:type"] ?? "",
        returnType: adaptReturnType(node["return-value"]?.[0]),
        parameters: adaptParameters(node.parameters?.[0]),
        introspectable: a.introspectable !== "0",
        doc: extractDoc(node),
    };
}

function adaptEnumerations(enumerations: Array<GirEnumElement | GirBitfieldElement>): RawEnumeration[] {
    return enumerations.map((enumeration) => {
        const a = attrsOf(enumeration);
        return {
            name: a.name ?? "",
            cType: a["c:type"] ?? "",
            members: adaptEnumerationMembers(enumeration.member ?? []),
            glibGetType: a["glib:get-type"],
            glibErrorDomain: a["glib:error-domain"],
            doc: extractDoc(enumeration),
        };
    });
}

function adaptEnumerationMembers(members: GirMemberElement[]): RawEnumerationMember[] {
    return members.map((member) => {
        const a = attrsOf(member);
        return {
            name: a.name ?? "",
            value: a.value ?? "",
            cIdentifier: a["c:identifier"] ?? "",
            doc: extractDoc(member),
        };
    });
}

function adaptConstants(constants: GirConstantElement[]): RawConstant[] {
    return constants.map((constant) => {
        const a = attrsOf(constant);
        return {
            name: a.name ?? "",
            cType: a["c:type"] ?? "",
            value: a.value ?? "",
            type: adaptType(pickTypeNode(constant)),
            doc: extractDoc(constant),
        };
    });
}

function adaptAliases(aliases: GirAliasElement[]): RawAlias[] {
    return aliases.map((alias) => {
        const a = attrsOf(alias);
        return {
            name: a.name ?? "",
            cType: a["c:type"] ?? "",
            targetType: adaptType(alias.type?.[0]),
            doc: extractDoc(alias),
        };
    });
}

function adaptProperties(properties: GirPropertyElement[]): RawProperty[] {
    return properties.map((prop) => {
        const a = attrsOf(prop);
        let getter = a.getter;
        let setter = a.setter;

        for (const attribute of looseChildren(prop, "attribute")) {
            const attributeAttrs = attrsOf(attribute);
            if (attributeAttrs.name === "org.gtk.Property.get" && attributeAttrs.value) {
                getter = attributeAttrs.value;
            } else if (attributeAttrs.name === "org.gtk.Property.set" && attributeAttrs.value) {
                setter = attributeAttrs.value;
            }
        }

        return {
            name: a.name ?? "",
            type: adaptType(pickTypeNode(prop)),
            readable: a.readable !== "0",
            writable: a.writable === "1",
            constructOnly: a["construct-only"] === "1",
            defaultValueRaw: a["default-value"],
            getter,
            setter,
            doc: extractDoc(prop),
        };
    });
}

function adaptSignals(signals: GirSignalElement[]): RawSignal[] {
    return signals.map((signal) => {
        const a = attrsOf(signal);
        const when = a.when === "first" || a.when === "last" || a.when === "cleanup" ? a.when : "last";
        const returnValue = signal["return-value"]?.[0];
        return {
            name: a.name ?? "",
            when,
            returnType: returnValue ? adaptReturnType(returnValue) : undefined,
            parameters: adaptParameters(signal.parameters?.[0]),
            doc: extractDoc(signal),
        };
    });
}

function adaptParameters(params: GirCallableParams | undefined): RawParameter[] {
    return (params?.parameter ?? []).map(adaptParameter);
}

function adaptInstanceParameter(params: GirCallableParams | undefined): RawParameter | undefined {
    const instanceParam = params?.["instance-parameter"]?.[0];
    return instanceParam ? adaptParameter(instanceParam) : undefined;
}

function adaptParameter(param: TypeBearer): RawParameter {
    const a = attrsOf(param);
    const direction = (a.direction || "in") as "in" | "out" | "inout";
    const isOut = direction === "out";
    const allowNone = a["allow-none"] === "1";
    const closure = a.closure;
    const destroy = a.destroy;
    return {
        name: a.name ?? "",
        type: adaptType(pickTypeNode(param)),
        direction,
        callerAllocates: a["caller-allocates"] === "1",
        nullable: a.nullable === "1" || (!isOut && allowNone),
        optional: a.optional === "1" || (isOut && allowNone),
        scope: a.scope as RawParameter["scope"],
        closure: closure === undefined ? undefined : Number.parseInt(closure, 10),
        destroy: destroy === undefined ? undefined : Number.parseInt(destroy, 10),
        transferOwnership: asTransferOwnership(a["transfer-ownership"]),
        varargs: (param as { varargs?: unknown }).varargs !== undefined,
        doc: extractDoc(param),
    };
}

function adaptReturnType(returnValue: GirCallableReturn | undefined): RawType {
    if (!returnValue) return { name: "void" };
    const type = adaptType(pickTypeNode(returnValue));
    const a = attrsOf(returnValue);
    const transfer = asTransferOwnership(a["transfer-ownership"]);
    if (transfer) type.transferOwnership = transfer;
    if (a.nullable === "1") type.nullable = true;
    return type;
}

function adaptType(node: GirType | GirArrayType | undefined): RawType {
    if (!node) return { name: "void" };

    const a = attrsOf(node);
    const typeName = a.name;
    const cType = a["c:type"];

    const container = adaptGLibContainerType(typeName, node, cType);
    if (container) return container;

    if (typeName) return { name: typeName, cType };

    const nestedTypes = (node as TypeBearer).type;
    const isArrayNode =
        (nestedTypes !== undefined && nestedTypes.length > 0) ||
        a["zero-terminated"] !== undefined ||
        a["fixed-size"] !== undefined ||
        a.length !== undefined;

    if (isArrayNode) {
        return {
            name: "array",
            isArray: true,
            elementType: nestedTypes?.[0] ? adaptType(nestedTypes[0]) : undefined,
            sizeParamIndex: a.length === undefined ? undefined : Number(a.length),
            zeroTerminated: a["zero-terminated"] === undefined ? undefined : a["zero-terminated"] !== "0",
            fixedSize: a["fixed-size"] === undefined ? undefined : Number(a["fixed-size"]),
        };
    }

    return { name: "void" };
}

function extractTypeParameters(node: GirType | GirArrayType): RawType[] {
    const types: RawType[] = [];
    for (const child of (node as TypeBearer).type ?? []) types.push(adaptType(child));
    for (const child of (node as TypeBearer).array ?? []) types.push(adaptType(child));
    return types;
}

function adaptGLibContainerType(
    typeName: string | undefined,
    node: GirType | GirArrayType,
    cType: string | undefined,
): RawType | null {
    switch (typeName) {
        case "GLib.HashTable":
            return buildHashTableType(node, cType);
        case "GLib.PtrArray":
        case "GLib.Array":
            return buildPtrArrayType(typeName, node, cType);
        case "GLib.ByteArray":
            return buildByteArrayType(cType);
        case "GLib.List":
        case "GLib.SList":
            return buildListType(typeName, node, cType);
        default:
            return null;
    }
}

function buildHashTableType(node: GirType | GirArrayType, cType: string | undefined): RawType {
    const typeParameters = extractTypeParameters(node);
    return {
        name: "GLib.HashTable",
        cType,
        isArray: false,
        containerType: "ghashtable",
        typeParameters: typeParameters.length >= 2 ? typeParameters : undefined,
        elementType: typeParameters[1],
    };
}

function buildPtrArrayType(
    typeName: "GLib.PtrArray" | "GLib.Array",
    node: GirType | GirArrayType,
    cType: string | undefined,
): RawType {
    const typeParameters = extractTypeParameters(node);
    return {
        name: typeName,
        cType,
        isArray: true,
        containerType: typeName === "GLib.PtrArray" ? "gptrarray" : "garray",
        typeParameters: typeParameters.length > 0 ? typeParameters : undefined,
        elementType: typeParameters[0],
    };
}

function buildByteArrayType(cType: string | undefined): RawType {
    return {
        name: "GLib.ByteArray",
        cType,
        isArray: true,
        containerType: "gbytearray",
        elementType: { name: "guint8", cType: "guint8" },
    };
}

function buildListType(
    typeName: "GLib.List" | "GLib.SList",
    node: GirType | GirArrayType,
    cType: string | undefined,
): RawType {
    const innerNode = (node as TypeBearer).type?.[0] ?? (node as TypeBearer).array?.[0];
    const elementType = innerNode ? adaptType(innerNode) : undefined;
    return {
        name: "array",
        cType,
        isArray: true,
        containerType: typeName === "GLib.List" ? "glist" : "gslist",
        typeParameters: elementType ? [elementType] : undefined,
        elementType,
    };
}
