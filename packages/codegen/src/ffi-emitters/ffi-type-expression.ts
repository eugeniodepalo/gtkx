/**
 * FFI Type Expression Writer
 *
 * Emits TypeScript expressions that build FFI type descriptors via the
 * `t` helper namespace from `@gtkx/ffi` (e.g. `t.int8`, `t.boxed("Foo",
 * "borrowed", "libgtk-4.so.1", "gtk_foo_get_type")`). This keeps generated
 * code free of inline POJO descriptors and gives every call site a uniform,
 * compact shape.
 */

import type { Writer } from "../builders/text-writer.js";
import type { FfiTypeDescriptor } from "../type-system/ffi-types.js";

const PRIMITIVE_TYPES = new Set([
    "void",
    "boolean",
    "unichar",
    "int8",
    "uint8",
    "int16",
    "uint16",
    "int32",
    "uint32",
    "int64",
    "uint64",
    "float32",
    "float64",
]);

const stringify = (value: string): string => JSON.stringify(value);

const ownership = (descriptor: FfiTypeDescriptor): string => stringify(descriptor.ownership ?? "borrowed");

/**
 * Writes a `t.<helper>(...)` expression for the given FFI type descriptor.
 *
 * Recursively expands nested types (array item types, ref inner types,
 * hashtable key/value types, callback/trampoline arg and return types).
 *
 * @param writer - Stream writer for the generated source
 * @param descriptor - FFI type descriptor to render
 */
type ComplexTypeWriter = (writer: Writer, descriptor: FfiTypeDescriptor) => void;

const writeStringExpression: ComplexTypeWriter = (writer, descriptor) => {
    writer.write(`t.string(${ownership(descriptor)})`);
};

const writeGObjectExpression: ComplexTypeWriter = (writer, descriptor) => {
    writer.write(`t.object(${ownership(descriptor)})`);
};

const writeRefExpression: ComplexTypeWriter = (writer, descriptor) => {
    writer.write("t.ref(");
    if (typeof descriptor.innerType === "object") {
        writeFfiTypeExpression(writer, descriptor.innerType);
    }
    writer.write(")");
};

const writeHashTableExpression: ComplexTypeWriter = (writer, descriptor) => {
    writer.write("t.hashTable(");
    if (descriptor.keyType !== undefined) {
        writeFfiTypeExpression(writer, descriptor.keyType);
    }
    writer.write(", ");
    if (descriptor.valueType !== undefined) {
        writeFfiTypeExpression(writer, descriptor.valueType);
    }
    writer.write(`, ${ownership(descriptor)})`);
};

const writeEnumOrFlagsExpression: ComplexTypeWriter = (writer, descriptor) => {
    writer.write(
        `t.${descriptor.type}(${stringify(descriptor.library ?? "")}, ${stringify(descriptor.getTypeFn ?? "")}, ${descriptor.signed === true})`,
    );
};

const writeCallbackExpression: ComplexTypeWriter = (writer, descriptor) => {
    writer.write("t.callback(");
    writeTypeArray(writer, descriptor.argTypes ?? []);
    writer.write(", ");
    if (descriptor.returnType !== undefined) {
        writeFfiTypeExpression(writer, descriptor.returnType);
    }
    writer.write(")");
};

const writeTrampolineExpression: ComplexTypeWriter = (writer, descriptor) => {
    writer.write("t.trampoline(");
    writeTypeArray(writer, descriptor.argTypes ?? []);
    writer.write(", ");
    if (descriptor.returnType !== undefined) {
        writeFfiTypeExpression(writer, descriptor.returnType);
    }
    writeTrampolineOptions(writer, descriptor);
    writer.write(")");
};

const COMPLEX_TYPE_WRITERS: Record<string, ComplexTypeWriter | undefined> = {
    string: writeStringExpression,
    gobject: writeGObjectExpression,
    boxed: writeBoxedExpression,
    struct: writeStructExpression,
    fundamental: writeFundamentalExpression,
    ref: writeRefExpression,
    hashtable: writeHashTableExpression,
    enum: writeEnumOrFlagsExpression,
    flags: writeEnumOrFlagsExpression,
    array: writeArrayExpression,
    callback: writeCallbackExpression,
    trampoline: writeTrampolineExpression,
};

export function writeFfiTypeExpression(writer: Writer, descriptor: FfiTypeDescriptor): void {
    if (PRIMITIVE_TYPES.has(descriptor.type)) {
        writer.write(`t.${descriptor.type}`);
        return;
    }

    const handler = COMPLEX_TYPE_WRITERS[descriptor.type];
    if (handler !== undefined) {
        handler(writer, descriptor);
        return;
    }

    writer.write(JSON.stringify(descriptor));
}

function writeBoxedExpression(writer: Writer, descriptor: FfiTypeDescriptor): void {
    const inner = typeof descriptor.innerType === "string" ? descriptor.innerType : "";
    writer.write(`t.boxed(${stringify(inner)}, ${ownership(descriptor)}`);
    if (descriptor.library !== undefined) {
        writer.write(`, ${stringify(descriptor.library)}`);
        if (descriptor.getTypeFn !== undefined) {
            writer.write(`, ${stringify(descriptor.getTypeFn)}`);
        }
    } else if (descriptor.getTypeFn !== undefined) {
        writer.write(`, undefined, ${stringify(descriptor.getTypeFn)}`);
    }
    writer.write(")");
}

function writeStructExpression(writer: Writer, descriptor: FfiTypeDescriptor): void {
    const inner = typeof descriptor.innerType === "string" ? descriptor.innerType : "";
    writer.write(`t.struct(${stringify(inner)}, ${ownership(descriptor)}`);
    if (descriptor.size !== undefined) {
        writer.write(`, ${descriptor.size}`);
    }
    writer.write(")");
}

function writeFundamentalExpression(writer: Writer, descriptor: FfiTypeDescriptor): void {
    const optionParts = [`ownership: ${ownership(descriptor)}`];
    if (descriptor.typeName !== undefined) {
        optionParts.push(`typeName: ${stringify(descriptor.typeName)}`);
    }
    writer.write(
        `t.fundamental(${stringify(descriptor.library ?? "")}, ${stringify(descriptor.refFn ?? "")}, ${stringify(descriptor.unrefFn ?? "")}, { ${optionParts.join(", ")} })`,
    );
}

type ArrayKindWriter = (writer: Writer, descriptor: FfiTypeDescriptor, item: FfiTypeDescriptor, own: string) => void;

const writeListLikeArray = (helperName: string): ArrayKindWriter => {
    return (writer, _descriptor, item, own) => {
        writer.write(`t.${helperName}(`);
        writeFfiTypeExpression(writer, item);
        writer.write(`, ${own})`);
    };
};

const writeGArrayExpression: ArrayKindWriter = (writer, descriptor, item, own) => {
    writer.write("t.gArray(");
    writeFfiTypeExpression(writer, item);
    writer.write(`, ${own}`);
    if (descriptor.elementSize !== undefined) {
        writer.write(`, ${descriptor.elementSize}`);
    }
    writer.write(")");
};

const writeByteArrayExpression: ArrayKindWriter = (writer, _descriptor, _item, own) => {
    writer.write(`t.byteArray(${own})`);
};

const writeSizedArrayExpression: ArrayKindWriter = (writer, descriptor, item, own) => {
    writer.write("t.sizedArray(");
    writeFfiTypeExpression(writer, item);
    writer.write(`, ${descriptor.sizeParamIndex ?? 0}, ${own}`);
    if (descriptor.elementSize !== undefined) {
        writer.write(`, ${descriptor.elementSize}`);
    }
    writer.write(")");
};

const writeFixedArrayExpression: ArrayKindWriter = (writer, descriptor, item, own) => {
    writer.write("t.fixedArray(");
    writeFfiTypeExpression(writer, item);
    writer.write(`, ${descriptor.fixedSize ?? 0}, ${own}`);
    if (descriptor.elementSize !== undefined) {
        writer.write(`, ${descriptor.elementSize}`);
    }
    writer.write(")");
};

const writeDefaultArrayExpression = (
    writer: Writer,
    opts: { descriptor: FfiTypeDescriptor; item: FfiTypeDescriptor; own: string; kind: string },
): void => {
    const { descriptor, item, own, kind } = opts;
    writer.write("t.array(");
    writeFfiTypeExpression(writer, item);
    writer.write(`, ${stringify(kind)}, ${own}`);
    writeArrayOptions(writer, descriptor);
    writer.write(")");
};

const ARRAY_KIND_WRITERS: Record<string, ArrayKindWriter | undefined> = {
    glist: writeListLikeArray("list"),
    gslist: writeListLikeArray("slist"),
    gptrarray: writeListLikeArray("ptrArray"),
    garray: writeGArrayExpression,
    gbytearray: writeByteArrayExpression,
    sized: writeSizedArrayExpression,
    fixed: writeFixedArrayExpression,
};

function writeArrayExpression(writer: Writer, descriptor: FfiTypeDescriptor): void {
    const item = descriptor.itemType;
    const own = ownership(descriptor);
    const kind = descriptor.kind ?? "array";

    if (item === undefined) {
        writer.write("undefined");
        return;
    }

    const handler = ARRAY_KIND_WRITERS[kind];
    if (handler !== undefined) {
        handler(writer, descriptor, item, own);
        return;
    }
    writeDefaultArrayExpression(writer, { descriptor, item, own, kind });
}

function writeArrayOptions(writer: Writer, descriptor: FfiTypeDescriptor): void {
    const opts: string[] = [];
    if (descriptor.elementSize !== undefined) opts.push(`elementSize: ${descriptor.elementSize}`);
    if (descriptor.sizeParamIndex !== undefined) opts.push(`sizeParamIndex: ${descriptor.sizeParamIndex}`);
    if (descriptor.fixedSize !== undefined) opts.push(`fixedSize: ${descriptor.fixedSize}`);
    if (opts.length === 0) return;
    writer.write(`, { ${opts.join(", ")} }`);
}

function writeTrampolineOptions(writer: Writer, descriptor: FfiTypeDescriptor): void {
    const opts: string[] = [];
    if (descriptor.hasDestroy === true) opts.push("hasDestroy: true");
    if (descriptor.userDataIndex !== undefined) opts.push(`userDataIndex: ${descriptor.userDataIndex}`);
    if (descriptor.scope !== undefined) opts.push(`scope: ${stringify(descriptor.scope)}`);
    if (opts.length === 0) return;
    writer.write(`, { ${opts.join(", ")} }`);
}

function writeTypeArray(writer: Writer, types: readonly FfiTypeDescriptor[]): void {
    if (types.length === 0) {
        writer.write("[]");
        return;
    }
    writer.write("[");
    for (let i = 0; i < types.length; i++) {
        if (i > 0) writer.write(", ");
        const type = types[i];
        if (type !== undefined) writeFfiTypeExpression(writer, type);
    }
    writer.write("]");
}
