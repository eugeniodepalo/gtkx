import type { AccessorBuilder } from "../members/accessor.js";
import type { ConstructorBuilder } from "../members/constructor.js";
import { writeJsDoc } from "../members/doc.js";
import type { MethodBuilder } from "../members/method.js";
import type { Builder } from "../types.js";
import type { Writer } from "../writer.js";

/** Configuration options for a class declaration. */
export type ClassOptions = {
    exported?: boolean;
    extends?: string;
    abstract?: boolean;
    doc?: string;
    /** Generic type parameters, e.g. `<TProps extends LabelProps = LabelProps>`. */
    typeParams?: string;
};

/** Builder that emits a class declaration with accessors, constructor, and methods. */
export class ClassDeclarationBuilder implements Builder {
    private readonly accessors: AccessorBuilder[] = [];
    private readonly methods: MethodBuilder[] = [];
    private ctor: ConstructorBuilder | null = null;

    constructor(
        readonly name: string,
        private readonly opts: ClassOptions = {},
    ) {}

    /** Set the class constructor. */
    setConstructor(ctor: ConstructorBuilder): this {
        this.ctor = ctor;
        return this;
    }

    /** Add an ES6 get/set accessor to the class body. */
    addAccessor(a: AccessorBuilder): this {
        this.accessors.push(a);
        return this;
    }

    /** Add a method to the class body. */
    addMethod(m: MethodBuilder): this {
        this.methods.push(m);
        return this;
    }

    /** @inheritdoc */
    write(writer: Writer): void {
        writeJsDoc(writer, this.opts.doc);
        if (this.opts.exported) writer.write("export ");
        const jsMode = writer.getMode() === "js";
        if (!jsMode && this.opts.abstract) writer.write("abstract ");
        writer.write(`class ${this.name}`);
        if (!jsMode && this.opts.typeParams) {
            writer.write(this.opts.typeParams);
        }
        if (this.opts.extends) {
            writer.write(` extends ${this.opts.extends}`);
        }
        writer.write(" ");
        writer.writeBlock(() => {
            if (this.ctor) {
                this.ctor.write(writer);
            }

            for (const a of this.accessors) {
                a.write(writer);
            }

            for (const m of this.methods) {
                m.write(writer);
            }
        });
        writer.newLine();
    }
}

/** Create a {@link ClassDeclarationBuilder} with the given name and options. */
export function classDecl(name: string, opts?: ClassOptions): ClassDeclarationBuilder {
    return new ClassDeclarationBuilder(name, opts);
}
