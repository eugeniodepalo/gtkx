import type { FfiTypeDescriptor } from "@gtkx/gir";

export type CallbackWrapperOptions = {
    /** Name of the original callback/handler parameter */
    callbackName: string;
    /** Name for the wrapped callback variable */
    wrappedName: string;
    /** Argument types for the callback (for static mode) */
    argTypes?: FfiTypeDescriptor[];
    /** Return type for the callback */
    returnType?: FfiTypeDescriptor;
    /** Whether to handle a "self" argument (first arg, always wrapped as gobject) */
    hasSelfArg?: boolean;
    /** Indentation string */
    indent?: string;
    /**
     * Mode for type lookup:
     * - "static": Types are inlined in the generated code (for callbacks)
     * - "runtime": Types are looked up from a metadata variable at runtime (for signals)
     */
    mode?: "static" | "runtime";
    /** Variable name for runtime metadata (only used in runtime mode) */
    metadataVar?: string;
    /** Reference to ParamSpec class (e.g., "ParamSpec" or "GObject.ParamSpec") */
    paramSpecRef?: string;
};

export type CallbackWrapperResult = {
    /** The generated wrapper code */
    code: string;
    /** Whether getNativeObject is used */
    usesGetNativeObject: boolean;
    /** Whether getNativeClass is used (for boxed types) */
    usesGetNativeClass: boolean;
    /** Whether GLib.Variant is used */
    usesGLibVariant: boolean;
};

/**
 * Generates the type check conditions for wrapping callback arguments.
 * Used by both static and runtime modes.
 */
function generateTypeChecks(options: {
    hasGObjectArgs: boolean;
    hasGParamArgs: boolean;
    hasBoxedArgs: boolean;
    hasGVariantArgs: boolean;
    argVar: string;
    typeVar: string;
    indexVar: string;
    argsArrayVar: string;
    indent: string;
    paramSpecRef?: string;
}): string[] {
    const {
        hasGObjectArgs,
        hasGParamArgs,
        hasBoxedArgs,
        hasGVariantArgs,
        argVar,
        typeVar,
        argsArrayVar,
        indexVar,
        indent,
        paramSpecRef = "ParamSpec",
    } = options;
    const checks: string[] = [];

    if (hasGObjectArgs) {
        checks.push(`${indent}if (${typeVar}?.type === "gobject" && ${argsArrayVar}[${indexVar}] != null) {`);
        checks.push(`${indent}  return getNativeObject(${argVar});`);
        checks.push(`${indent}}`);
    }

    if (hasGParamArgs) {
        checks.push(`${indent}if (${typeVar}?.type === "gparam" && ${argsArrayVar}[${indexVar}] != null) {`);
        checks.push(`${indent}  return getNativeObject(${argVar}, ${paramSpecRef});`);
        checks.push(`${indent}}`);
    }

    if (hasBoxedArgs) {
        checks.push(`${indent}if (${typeVar}?.type === "boxed" && ${argsArrayVar}[${indexVar}] != null) {`);
        checks.push(`${indent}  const cls = getNativeClass(${typeVar}.innerType);`);
        checks.push(`${indent}  return cls ? getNativeObject(${argVar}, cls) : ${argVar};`);
        checks.push(`${indent}}`);
    }

    if (hasGVariantArgs) {
        checks.push(`${indent}if (${typeVar}?.type === "gvariant" && ${argsArrayVar}[${indexVar}] != null) {`);
        checks.push(`${indent}  return getNativeObject(${argVar}, GLib.Variant);`);
        checks.push(`${indent}}`);
    }

    return checks;
}

/**
 * Generates wrapper code for a callback that converts raw GObject IDs to typed instances.
 * Used by both signal handlers and callback parameters in constructors/methods.
 *
 * Supports two modes:
 * - Static mode: Types are inlined in the generated code (for callbacks in constructors)
 * - Runtime mode: Types are looked up from metadata at runtime (for signal handlers)
 */
export function generateCallbackWrapperCode(options: CallbackWrapperOptions): CallbackWrapperResult {
    const {
        callbackName,
        wrappedName,
        argTypes = [],
        returnType,
        hasSelfArg = false,
        indent = "      ",
        mode = "static",
        metadataVar = "meta",
        paramSpecRef = "ParamSpec",
    } = options;

    let usesGetNativeObject = false;
    let usesGetNativeClass = false;
    let usesGLibVariant = false;

    const hasGObjectArgs = argTypes.some((t) => t.type === "gobject");
    const hasGParamArgs = argTypes.some((t) => t.type === "gparam");
    const hasBoxedArgs = argTypes.some((t) => t.type === "boxed");
    const hasGVariantArgs = argTypes.some((t) => t.type === "gvariant");
    const returnsGObject = returnType?.type === "gobject";
    const needsArgWrapping = hasGObjectArgs || hasGParamArgs || hasBoxedArgs || hasGVariantArgs;

    if (!needsArgWrapping && !returnsGObject && !hasSelfArg) {
        return { code: "", usesGetNativeObject: false, usesGetNativeClass: false, usesGLibVariant: false };
    }

    usesGetNativeObject = true;
    if (hasBoxedArgs) usesGetNativeClass = true;
    if (hasGVariantArgs) usesGLibVariant = true;

    const lines: string[] = [];
    lines.push(`${indent}const ${wrappedName} = (...args: unknown[]) => {`);

    if (hasSelfArg) {
        lines.push(`${indent}  const self = getNativeObject(args[0]);`);
        lines.push(`${indent}  const callbackArgs = args.slice(1);`);
    } else {
        lines.push(`${indent}  const callbackArgs = args;`);
    }

    if (needsArgWrapping) {
        if (mode === "static") {
            const typesStr = JSON.stringify(argTypes);
            lines.push(`${indent}  const types = ${typesStr} as const;`);
            lines.push(`${indent}  const wrapped = callbackArgs.map((arg, i) => {`);
            lines.push(`${indent}    const t = types[i];`);

            const checks = generateTypeChecks({
                hasGObjectArgs,
                hasGParamArgs,
                hasBoxedArgs,
                hasGVariantArgs,
                argVar: "arg",
                typeVar: "t",
                indexVar: "i",
                argsArrayVar: "callbackArgs",
                indent: `${indent}    `,
                paramSpecRef,
            });
            lines.push(...checks);

            lines.push(`${indent}    return arg;`);
            lines.push(`${indent}  });`);
        } else {
            lines.push(`${indent}  if (!${metadataVar}) return ${callbackName}(self, ...callbackArgs);`);
            lines.push(`${indent}  const wrapped = ${metadataVar}.params.map((t, i) => {`);

            const checks = generateTypeChecks({
                hasGObjectArgs,
                hasGParamArgs,
                hasBoxedArgs,
                hasGVariantArgs,
                argVar: "callbackArgs[i]",
                typeVar: "t",
                indexVar: "i",
                argsArrayVar: "callbackArgs",
                indent: `${indent}    `,
                paramSpecRef,
            });
            lines.push(...checks);

            lines.push(`${indent}    return callbackArgs[i];`);
            lines.push(`${indent}  });`);
        }

        if (mode === "static") {
            const argCount = argTypes.length;
            const argsList = Array.from({ length: argCount }, (_, i) => `wrapped[${i}]`).join(", ");
            if (hasSelfArg) {
                lines.push(`${indent}  const result = (${callbackName} as any)(self, ${argsList});`);
            } else {
                lines.push(`${indent}  const result = (${callbackName} as any)(${argsList});`);
            }
        } else {
            if (hasSelfArg) {
                lines.push(`${indent}  const result = ${callbackName}(self, ...wrapped);`);
            } else {
                lines.push(`${indent}  const result = ${callbackName}(...wrapped);`);
            }
        }
    } else {
        if (hasSelfArg) {
            lines.push(`${indent}  const result = ${callbackName}(self, ...(callbackArgs as any[]));`);
        } else {
            lines.push(`${indent}  const result = ${callbackName}(...(callbackArgs as any[]));`);
        }
    }

    if (returnsGObject) {
        lines.push(`${indent}  return result != null ? (result as any).id ?? result : null;`);
    } else {
        lines.push(`${indent}  return result;`);
    }

    lines.push(`${indent}};`);

    return {
        code: lines.join("\n"),
        usesGetNativeObject,
        usesGetNativeClass,
        usesGLibVariant,
    };
}

/**
 * Generates wrapper code for signal handlers using runtime metadata.
 * This is a convenience wrapper around generateCallbackWrapperCode for signals.
 */
export function generateSignalWrapperCode(options: {
    handlerName: string;
    wrappedName: string;
    metadataVar: string;
    hasGObjectParams: boolean;
    hasGParamParams: boolean;
    hasBoxedParams: boolean;
    hasGVariantParams: boolean;
    indent?: string;
    paramSpecRef?: string;
}): CallbackWrapperResult {
    const {
        handlerName,
        wrappedName,
        metadataVar,
        hasGObjectParams,
        hasGParamParams,
        hasBoxedParams,
        hasGVariantParams,
        indent = "    ",
        paramSpecRef = "ParamSpec",
    } = options;

    const argTypes: FfiTypeDescriptor[] = [];
    if (hasGObjectParams) argTypes.push({ type: "gobject" });
    if (hasGParamParams) argTypes.push({ type: "gparam" });
    if (hasBoxedParams) argTypes.push({ type: "boxed" });
    if (hasGVariantParams) argTypes.push({ type: "gvariant" });

    return generateCallbackWrapperCode({
        callbackName: handlerName,
        wrappedName,
        argTypes,
        hasSelfArg: true,
        mode: "runtime",
        metadataVar,
        indent,
        paramSpecRef,
    });
}
