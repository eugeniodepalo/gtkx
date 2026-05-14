import { writeJsDoc } from "../members/doc.js";
import type { Builder } from "../types.js";
import type { Writer } from "../writer.js";

/** Configuration options for a namespace declaration. */
export type NamespaceOptions = {
    exported?: boolean;
    doc?: string;
};

/**
 * Builder that emits a TypeScript namespace declaration (typically used to
 * host class-companion `interface` blocks like `Foo.ConstructorProperties`).
 * In JS mode the declaration is omitted because the namespace lives in the
 * companion `.d.ts` contract.
 */
export class NamespaceDeclarationBuilder implements Builder {
    private readonly members: Builder[] = [];

    constructor(
        readonly name: string,
        private readonly opts: NamespaceOptions = {},
    ) {}

    /** Add a builder to the namespace body. */
    add(member: Builder): this {
        this.members.push(member);
        return this;
    }

    /** True when the namespace has no members. */
    get isEmpty(): boolean {
        return this.members.length === 0;
    }

    /** @inheritdoc */
    write(writer: Writer): void {
        if (writer.getMode() === "js") return;
        writeJsDoc(writer, this.opts.doc);
        if (this.opts.exported) writer.write("export ");
        writer.write(`namespace ${this.name} `);
        writer.writeBlock(() => {
            for (const member of this.members) {
                member.write(writer);
            }
        });
        writer.newLine();
    }
}

/** Create a {@link NamespaceDeclarationBuilder} with the given name and options. */
export function namespaceDecl(name: string, opts?: NamespaceOptions): NamespaceDeclarationBuilder {
    return new NamespaceDeclarationBuilder(name, opts);
}
