/**
 * @gtkx/gir - GObject Introspection Repository
 *
 * Parses GIR files and exposes a fully queryable registry of namespaces
 * with resolved type references.
 *
 * @example
 * ```typescript
 * import { GirRepository } from "@gtkx/gir";
 *
 * const repo = await GirRepository.load(["Gtk-4.0"], {
 *     girPath: ["/usr/share/gir-1.0"]
 * });
 *
 * const button = repo.resolveClass("Gtk.Button");
 * button.isSubclassOf("Gtk.Widget"); // true
 * ```
 *
 * @packageDocumentation
 */

export {
    INTRINSIC_TYPES,
    isIntrinsicType,
    isNumericType,
    isStringType,
    isVoidType,
    NUMERIC_TYPES,
    STRING_TYPES,
    VOID_TYPES,
} from "./intrinsics.js";
export { GirAlias } from "./model/alias.js";
export { GirConstructor, GirFunction, GirMethod } from "./model/callables.js";
export { GirCallback } from "./model/callback.js";
export { GirClass } from "./model/class.js";
export { GirConstant } from "./model/constant.js";
export { GirEnumeration, GirEnumerationMember } from "./model/enumeration.js";
export { GirField } from "./model/field.js";
export { GirInterface } from "./model/interface.js";
export { GirNamespace } from "./model/namespace.js";
export { GirParameter } from "./model/parameter.js";
export type { DefaultValue } from "./model/property.js";
export { GirProperty, parseDefaultValue } from "./model/property.js";
export { GirRecord } from "./model/record.js";
export type { RepositoryLike, TypeKind } from "./model/repository-like.js";
export { GirSignal } from "./model/signal.js";
export type { ContainerType } from "./model/type.js";
export { GirType } from "./model/type.js";
export { GirRepository, type RepositoryOptions } from "./repository.js";
export { toCamelCase, toPascalCase } from "./utils.js";
