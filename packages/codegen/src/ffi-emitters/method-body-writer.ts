/**
 * Method Body Writer
 *
 * Builds the `MethodStructure`s the FFI generators emit: capability detection,
 * signature and return-type computation, and structure assembly. Executable
 * body emission is delegated to {@link CallableBodyEmitter}.
 */

import type { Writer } from "../builders/text-writer.js";
import type { GirConstructor, GirFunction, GirMethod, GirParameter, GirType } from "../gir/index.js";
import type { FfiMapper } from "../type-system/ffi-mapper.js";
import { FFI_VOID, type MappedType, SELF_TYPE_GOBJECT, type SelfTypeDescriptor } from "../type-system/ffi-types.js";
import { buildJsDocStructure } from "../utils/doc-formatter.js";
import { hasVarargs, isVararg } from "../utils/filtering.js";
import { toCamelCase, toValidIdentifier, toValidMemberName } from "../utils/naming.js";
import { formatNullableReturn } from "../utils/type-qualification.js";
import type { CallArgument } from "./call-expression-builder.js";
import { type AsyncCallableStructureOptions, CallableBodyEmitter } from "./callable-body-emitter.js";
import { buildCallableShape, type CallableShape, type HiddenOut } from "./callable-shape.js";
import type { FfiDescriptorRegistry } from "./descriptor-registry.js";
import { FfiTypeWriter } from "./ffi-type-writer.js";
import { addTypeImports, type ImportCollector } from "./import-collector.js";

export type { ImportCollector };
export { addTypeImports };

const VOID_RETURN_MAPPING: MappedType = { ts: "void", ffi: FFI_VOID, imports: [] };

/**
 * Options for building a complete method structure.
 */
type MethodStructureOptions = {
    /** The method name to use (after any renaming) */
    methodName: string;
    /** Self type descriptor for FFI marshalling */
    selfTypeDescriptor: SelfTypeDescriptor;
    /** The shared library (e.g., "libgtk-4.so.1") */
    sharedLibrary: string;
    /** Current namespace for documentation links */
    namespace: string;
    /** Class name for object wrapping (boxed types) */
    className?: string;
};

type StaticFunctionStructureOptions = {
    /** The normalized TypeScript class name (e.g., "TextIter", "Button") */
    className: string;
    /** The original GIR class/record name for return type comparison */
    originalClassName: string;
    /** The shared library (e.g., "libgtk-4.so.1") */
    sharedLibrary: string;
    /** Current namespace for documentation links */
    namespace: string;
};

/**
 * Options for building a gtype-struct method hoisted onto its owning class.
 */
type ClassStructStaticOptions = {
    /** The shared library (e.g., "libgtk-4.so.1") */
    sharedLibrary: string;
    /** Current namespace for documentation links */
    namespace: string;
};

/**
 * Shape returned by buildMethodStructure and buildStaticFunctionStructure.
 * Generators consume this to emit method declarations.
 */
export type MethodStructure = {
    name: string;
    isStatic?: boolean;
    override?: boolean;
    parameters: Array<{ name: string; type: string; optional?: boolean; isRestParameter?: boolean }>;
    returnType: string | undefined;
    docs: Array<{ description: string }> | undefined;
    statements: (writer: Writer) => void;
    overloads?: Array<{
        params: Array<{ name: string; type: string; optional?: boolean; isRestParameter?: boolean }>;
        returnType?: string;
    }>;
};

/**
 * Result of constructor selection analysis.
 */
export type ConstructorSelection = {
    /** Constructors whose every parameter marshals safely. */
    supported: GirConstructor[];
    /** Constructors with at least one parameter the runtime cannot marshal. */
    unsupported: GirConstructor[];
    /** The main constructor (first non-vararg supported constructor) */
    main: GirConstructor | undefined;
};

/**
 * Builds the method/function/constructor structures emitted by the FFI
 * generators.
 *
 * Centralizes capability detection, signature and return-type computation, and
 * structure assembly; delegates executable body emission to a
 * {@link CallableBodyEmitter} collaborator.
 *
 * @example
 * ```typescript
 * const writer = new MethodBodyWriter(ffiMapper, imports);
 *
 * if (writer.hasUnsupportedCallbacks(params)) return;
 *
 * const structure = writer.buildMethodStructure(method, options);
 * ```
 */
export class MethodBodyWriter {
    private readonly bodyEmitter: CallableBodyEmitter;
    private selfNames: ReadonlySet<string> = new Set();

    constructor(
        private readonly ffiMapper: FfiMapper,
        private readonly imports: ImportCollector,
        ffiTypeWriter?: FfiTypeWriter,
        descriptors?: FfiDescriptorRegistry,
    ) {
        this.bodyEmitter = new CallableBodyEmitter(
            ffiMapper,
            imports,
            ffiTypeWriter ?? new FfiTypeWriter(),
            descriptors,
        );
    }

    /**
     * Sets names that should be excluded from type imports.
     * Use this to prevent a class from importing itself.
     */
    setSelfNames(names: ReadonlySet<string>): void {
        this.selfNames = names;
        this.bodyEmitter.setSelfNames(names);
    }

    /**
     * Filters parameters to get only the ones that should be in the function signature.
     * Removes varargs and closure target parameters.
     */
    filterParameters(parameters: readonly GirParameter[]): GirParameter[] {
        return parameters.filter((p) => !isVararg(p) && !this.ffiMapper.isClosureTarget(p, parameters));
    }

    /**
     * Checks if any user-visible parameter has a type the native marshaling
     * layer cannot safely handle. Closure targets (`user_data`, `destroy`) and
     * varargs are excluded — those are stripped from the public signature and
     * handled internally by the trampoline FFI.
     */
    hasUnsupportedCallbacks(params: readonly GirParameter[]): boolean {
        return this.filterParameters(params).some((p) => this.ffiMapper.hasUnsupportedCallback(p));
    }

    /**
     * Checks if a return type is one the native marshaling layer cannot
     * safely handle (raw pointer, callback typedef as type ref, untyped
     * container, or a composite whose inner type is unsafe).
     *
     * Returns false for `null`/`undefined`/`void`/`none` return types.
     */
    isReturnTypeUnsafe(returnType: GirType | null | undefined): boolean {
        if (!returnType) return false;
        const name = returnType.name;
        if (name === "void" || name === "none") return false;
        return this.ffiMapper.mapType(returnType, true, returnType.transferOwnership).unsafe === true;
    }

    /**
     * Selects supported constructors and identifies the main constructor.
     */
    selectConstructors(constructors: readonly GirConstructor[]): ConstructorSelection {
        const candidates = constructors.filter((c) => !c.shadowedBy);
        const supported: GirConstructor[] = [];
        const unsupported: GirConstructor[] = [];
        for (const ctor of candidates) {
            if (this.hasUnsupportedCallbacks(ctor.parameters)) {
                unsupported.push(ctor);
            } else {
                supported.push(ctor);
            }
        }
        const main = supported.find((c) => !c.parameters.some(isVararg));
        return { supported, unsupported, main };
    }

    /**
     * Converts a parameter name to a valid JavaScript identifier.
     */
    toJsParamName(param: GirParameter): string {
        return toValidIdentifier(toCamelCase(param.name));
    }

    /**
     * Resolves the method name, applying any dynamic renames.
     */
    resolveMethodName(method: GirMethod, methodRenames: ReadonlyMap<string, string>): string {
        const dynamicRename = methodRenames.get(method.cIdentifier);
        const camelName = toCamelCase(method.name);
        return dynamicRename ?? camelName;
    }

    /**
     * Determines if a return type needs object wrapping (getNativeObject call).
     */
    needsObjectWrap(
        ...args: Parameters<CallableBodyEmitter["needsObjectWrap"]>
    ): ReturnType<CallableBodyEmitter["needsObjectWrap"]> {
        return this.bodyEmitter.needsObjectWrap(...args);
    }

    /**
     * Generates a unique result variable name.
     * Avoids collision with a parameter named "result".
     */
    getResultVarName(parameters: readonly GirParameter[]): string {
        const hasResultParam = parameters.some((p) => this.toJsParamName(p) === "result");
        return hasResultParam ? "_result" : "result";
    }

    /**
     * Builds a callable shape from raw parameters.
     *
     * Computes signature visibility, hidden allocations, and the
     * return-tuple plan in a single pass. Imports collected by the shape
     * are forwarded to the import collector.
     */
    buildShape(
        parameters: readonly GirParameter[],
        returnType: GirType | undefined,
        sizeParamOffset: number,
    ): CallableShape {
        const returnMapping =
            returnType === undefined
                ? VOID_RETURN_MAPPING
                : this.ffiMapper.mapType(returnType, true, returnType.transferOwnership, sizeParamOffset);

        const shape = buildCallableShape({
            parameters,
            returnTypeMapping: returnMapping,
            returnNullable: returnType?.nullable === true,
            sizeParamOffset,
            ffiMapper: this.ffiMapper,
        });

        addTypeImports(this.imports, shape.imports, this.selfNames);
        for (const mapping of shape.paramMappings) {
            if (mapping.mapped.ffi.type === "ref") {
                this.imports.addTypeImport("../../handles.js", ["NativeHandle"]);
            }
        }
        return shape;
    }

    /**
     * Builds parameter list entries for a method declaration from a shape.
     */
    buildSignatureParameters(
        shape: CallableShape,
        hasVarargsFlag: boolean,
    ): Array<{ name: string; type: string; optional?: boolean; isRestParameter?: boolean }> {
        const result: Array<{ name: string; type: string; optional?: boolean; isRestParameter?: boolean }> =
            shape.signatureParams.map((p) => ({
                name: p.name,
                type: p.tsType,
                optional: p.optional,
            }));

        if (hasVarargsFlag) {
            this.imports.addTypeImport("@gtkx/native", ["Arg"]);
            result.push({
                name: "args",
                type: "Arg[]",
                isRestParameter: true,
            });
        }
        return result;
    }

    /**
     * Builds a parameter list for method declarations from raw parameters.
     *
     * Used by callers that don't construct a shape themselves
     * (e.g., async wrapper generation, where there are no out/inout params).
     */
    buildParameterList(
        parameters: readonly GirParameter[],
    ): Array<{ name: string; type: string; optional?: boolean; isRestParameter?: boolean }> {
        const shape = this.buildShape(parameters, undefined, 0);
        return this.buildSignatureParameters(shape, hasVarargs(parameters));
    }

    /**
     * Computes the public TypeScript return type for a callable based on its shape.
     */
    computeReturnTypeString(shape: CallableShape, ownClassName: string | undefined): string {
        if (shape.returnTupleEntries.length === 0) {
            if (!shape.hasOriginalReturn) return "void";
            const base = ownClassName ?? shape.originalReturnTsType;
            return formatNullableReturn(base, shape.originalReturnNullable);
        }
        if (shape.returnTupleEntries.length === 1 && !shape.hasOriginalReturn) {
            const entry = shape.returnTupleEntries[0];
            if (!entry) {
                return "void";
            }
            return entry.nullable ? `${entry.tsType} | null` : entry.tsType;
        }
        const parts = shape.returnTupleEntries.map((entry) => {
            if (entry.kind === "original-return") {
                const base = ownClassName ?? entry.tsType;
                return entry.nullable ? `${base} | null` : base;
            }
            return entry.nullable ? `${entry.tsType} | null` : entry.tsType;
        });
        return `[${parts.join(", ")}]`;
    }

    /**
     * Builds CallArgument entries from a callable shape.
     */
    buildShapeCallArguments(...args: Parameters<CallableBodyEmitter["buildShapeCallArguments"]>): CallArgument[] {
        return this.bodyEmitter.buildShapeCallArguments(...args);
    }

    /**
     * Builds a complete MethodStructure for method declarations.
     */
    buildMethodStructure(method: GirMethod, options: MethodStructureOptions): MethodStructure {
        const shape = this.buildShape(method.parameters, method.returnType, 1);
        const params = this.buildSignatureParameters(shape, hasVarargs(method.parameters));
        this.addTypeImportsFromMapping(shape.returnTypeMapping);

        const tsReturnType = this.computeReturnTypeString(shape, undefined);

        return {
            name: options.methodName,
            parameters: params,
            returnType: tsReturnType === "void" ? undefined : tsReturnType,
            docs: buildJsDocStructure(method.doc, options.namespace),
            statements: this.writeMethodBody(method, shape, {
                sharedLibrary: options.sharedLibrary,
                selfTypeDescriptor: options.selfTypeDescriptor,
                className: options.className,
            }),
        };
    }

    buildStaticFunctionStructure(func: GirFunction, options: StaticFunctionStructureOptions): MethodStructure {
        const funcName = toValidMemberName(toCamelCase(func.name));
        const shape = this.buildShape(func.parameters, func.returnType, 0);
        const params = this.buildSignatureParameters(shape, hasVarargs(func.parameters));
        this.addTypeImportsFromMapping(shape.returnTypeMapping);

        const returnTypeName = func.returnType.name;
        const returnsOwnClass =
            returnTypeName === options.originalClassName || returnTypeName.endsWith(`.${options.originalClassName}`);
        const ownClassName = returnsOwnClass ? options.className : undefined;
        const tsReturnType = this.computeReturnTypeString(shape, ownClassName);

        return {
            name: funcName,
            isStatic: true,
            parameters: params,
            returnType: tsReturnType === "void" ? undefined : tsReturnType,
            docs: buildJsDocStructure(func.doc, options.namespace),
            statements: this.writeFunctionBody(func, shape, {
                sharedLibrary: options.sharedLibrary,
                className: options.className,
                returnsOwnClass,
            }),
        };
    }

    /**
     * Builds a static MethodStructure for a gtype-struct `<method>` hoisted
     * onto its owning class.
     *
     * GIR exposes class-level operations (e.g. the `gtk_widget_class_*`
     * family) as `<method>` elements on the class's gtype-struct record. Such
     * a method takes the `GTypeClass *` as its implicit first argument; the
     * generated static accepts the class, an instance, or a `GType` and
     * resolves the class-struct pointer at call time.
     *
     * @param method - The gtype-struct method.
     * @param options - Class-struct static structure options.
     * @returns A static MethodStructure whose first parameter identifies the class.
     */
    buildClassStructStaticStructure(method: GirMethod, options: ClassStructStaticOptions): MethodStructure {
        const methodName = toValidMemberName(toCamelCase(method.name));
        const shape = this.buildShape(method.parameters, method.returnType, 1);
        const params = this.buildSignatureParameters(shape, hasVarargs(method.parameters));
        this.addTypeImportsFromMapping(shape.returnTypeMapping);
        this.imports.addImport("../../class-struct-pointer.js", ["resolveClassStructPointer"]);
        this.imports.addTypeImport("../../class-struct-pointer.js", ["ClassStructTarget"]);

        const tsReturnType = this.computeReturnTypeString(shape, undefined);

        return {
            name: methodName,
            isStatic: true,
            parameters: [{ name: "widgetClass", type: "ClassStructTarget" }, ...params],
            returnType: tsReturnType === "void" ? undefined : tsReturnType,
            docs: buildJsDocStructure(method.doc, options.namespace),
            statements: this.bodyEmitter.writeCallableBody({
                sharedLibrary: options.sharedLibrary,
                cIdentifier: method.cIdentifier,
                shape,
                parameters: method.parameters,
                throws: method.throws,
                self: { type: SELF_TYPE_GOBJECT, value: "resolveClassStructPointer(widgetClass)" },
                hasVarargs: hasVarargs(method.parameters),
            }),
        };
    }

    /**
     * Builds a Promise-returning wrapper MethodStructure for a GIO-style
     * async callable.
     *
     * The emitted member drops the `GAsyncReadyCallback` and `user_data`
     * parameters from its signature and returns `Promise<R>`, where `R` is the
     * companion `*_finish` callable's return type. The body starts the native
     * async operation with an internal callback that resolves the promise with
     * the result of `*_finish` — or rejects it when `*_finish` throws a
     * `GError`.
     *
     * @param options - Async wrapper structure options.
     * @returns A MethodStructure whose body returns a Promise.
     */
    buildAsyncCallableStructure(options: AsyncCallableStructureOptions): MethodStructure {
        const { asyncCallable, finishCallable, callbackParameter } = options;
        const sizeParamOffset = options.self ? 1 : 0;
        const shape = this.buildShape(asyncCallable.parameters, asyncCallable.returnType, sizeParamOffset);

        const callbackJsName = toValidIdentifier(toCamelCase(callbackParameter.name));
        const params = this.buildSignatureParameters(shape, hasVarargs(asyncCallable.parameters)).filter(
            (p) => p.name !== callbackJsName,
        );

        const finishShape = this.buildShape(finishCallable.parameters, finishCallable.returnType, options.self ? 1 : 0);
        this.addTypeImportsFromMapping(finishShape.returnTypeMapping);
        const resultType = this.computeReturnTypeString(finishShape, options.finishOwnClassName);

        return {
            name: options.memberName,
            isStatic: options.isStatic || undefined,
            parameters: params,
            returnType: `Promise<${resultType === "void" ? "void" : resultType}>`,
            docs: buildJsDocStructure(asyncCallable.doc, options.namespace),
            statements: this.bodyEmitter.writeAsyncCallableBody(shape, options, callbackJsName),
        };
    }

    /**
     * Builds a throwing-stub MethodStructure for a method or static function
     * whose signature the FFI layer cannot marshal.
     *
     * node-gtk exposes every method and static function as a property
     * regardless of whether a given call can be marshalled, so generators
     * emit unmarshalable members as throwing stubs rather than dropping them.
     *
     * The stub carries the same JS-visible parameter list as a marshalable
     * member would, so its call-convention shape — parameter arity — still
     * matches the declared contract; only the body differs.
     *
     * @param opts - Stub configuration.
     * @param opts.memberName - The TypeScript member name to emit.
     * @param opts.qualifiedName - The fully qualified `Namespace.Class.member` name used in the error message.
     * @param opts.doc - Optional GIR documentation text for the member.
     * @param opts.namespace - Current namespace for documentation links.
     * @param opts.isStatic - Whether the member is a static function.
     * @param opts.parameters - The GIR parameters whose JS-visible arity the stub reproduces.
     * @returns A MethodStructure whose body throws a descriptive error.
     */
    buildStubStructure(opts: {
        memberName: string;
        qualifiedName: string;
        doc: string | undefined;
        namespace: string;
        isStatic: boolean;
        parameters?: readonly GirParameter[];
    }): MethodStructure {
        const { memberName, qualifiedName, doc, namespace, isStatic, parameters = [] } = opts;
        const message = `${qualifiedName} is not callable through the @gtkx/ffi runtime`;
        this.imports.addImport("../../native.js", ["throwUnsupported"]);
        return {
            name: memberName,
            isStatic: isStatic || undefined,
            parameters: this.buildParameterList(parameters),
            returnType: undefined,
            docs: buildJsDocStructure(doc, namespace),
            statements: (writer: Writer) => {
                writer.write(`return throwUnsupported(${JSON.stringify(message)});`);
            },
        };
    }

    /**
     * Writes method body using the precomputed shape.
     */
    writeMethodBody(...args: Parameters<CallableBodyEmitter["writeMethodBody"]>): (writer: Writer) => void {
        return this.bodyEmitter.writeMethodBody(...args);
    }

    /**
     * Writes function body using the precomputed shape.
     */
    writeFunctionBody(...args: Parameters<CallableBodyEmitter["writeFunctionBody"]>): (writer: Writer) => void {
        return this.bodyEmitter.writeFunctionBody(...args);
    }

    /**
     * Emits the `const` declarations for resolved callback wrappers.
     */
    writeCallbackWrapperDeclarations(
        ...args: Parameters<CallableBodyEmitter["writeCallbackWrapperDeclarations"]>
    ): void {
        this.bodyEmitter.writeCallbackWrapperDeclarations(...args);
    }

    /**
     * Emits a hidden out-parameter declaration; used to seed factory bodies.
     */
    writeHiddenOutDeclarationFor(writer: Writer, hidden: HiddenOut): void {
        this.bodyEmitter.writeHiddenOutDeclarationFor(writer, hidden);
    }

    /**
     * Sets up GError import tracking and returns the appropriate GError reference.
     */
    setupGErrorImports(currentNamespace?: string): string {
        return this.bodyEmitter.setupGErrorImports(currentNamespace);
    }

    /**
     * Writes a static factory method body.
     *
     * Out and inout parameters from the original GIR signature are hidden
     * behind internal allocations (passed via {@link HiddenOut}); their
     * post-call values are discarded — factory methods always return the
     * constructed object.
     */
    writeFactoryMethodBody(
        ...args: Parameters<CallableBodyEmitter["writeFactoryMethodBody"]>
    ): (writer: Writer) => void {
        return this.bodyEmitter.writeFactoryMethodBody(...args);
    }

    /**
     * Processes type imports from a MappedType, adding them via the ImportCollector.
     */
    private addTypeImportsFromMapping(mapped: MappedType): void {
        addTypeImports(this.imports, mapped.imports, this.selfNames);
    }
}
