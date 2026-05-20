import { writeJsDoc } from "../members/doc.js";
import type { Writer } from "../text-writer.js";
import { DualModeBuilder } from "../types.js";

/** A single member within an enum declaration. */
export type EnumMember = {
    name: string;
    value?: number | string;
    doc?: string;
};

/** Configuration options for an enum declaration. */
export type EnumOptions = {
    exported?: boolean;
    doc?: string;
    const?: boolean;
    /**
     * When set, the JS output wraps the member map in `makeErrorDomain(...)`
     * using this expression as the domain-quark resolver, producing an enum
     * usable as the right-hand side of an `instanceof` check.
     */
    errorDomainResolver?: string;
};

/**
 * Builder that emits an enum.
 *
 * In TS mode the output is a classic `enum Name { ... }` declaration. In
 * JS mode the output is a frozen `const` object literal matching the
 * `(typeof Foo)[keyof typeof Foo]` shape the .d.ts contract publishes; an
 * {@link EnumOptions.errorDomainResolver} instead wraps that literal in
 * `makeErrorDomain(...)`.
 *
 * For the JS path, members without an explicit `value` use a running
 * ordinal that advances by 1 each member; an explicit numeric value
 * resets the ordinal so the next implicit member continues from that
 * value plus one.
 */
export class EnumDeclarationBuilder extends DualModeBuilder {
    private readonly members: EnumMember[] = [];

    constructor(
        readonly name: string,
        private readonly opts: EnumOptions = {},
    ) {
        super();
    }

    /** Add a member to the enum body. */
    addMember(member: EnumMember): this {
        this.members.push(member);
        return this;
    }

    protected writeJs(writer: Writer): void {
        writeJsDoc(writer, this.opts.doc);
        if (this.opts.exported) writer.write("export ");
        const { errorDomainResolver } = this.opts;
        const open = errorDomainResolver ? `makeErrorDomain(${errorDomainResolver}, ` : "globalThis.Object.freeze(";
        writer.write(`const ${this.name} = ${open}`);
        writer.writeBlock(() => {
            let nextOrdinal = 0;
            for (const member of this.members) {
                writeJsDoc(writer, member.doc);
                writer.write(`${member.name}: `);
                const literal = this.resolveLiteral(member.value, nextOrdinal);
                writer.write(literal.text);
                nextOrdinal = literal.nextOrdinal;
                writer.writeLine(",");
            }
        });
        writer.writeLine(");");
    }

    protected writeTs(writer: Writer): void {
        writeJsDoc(writer, this.opts.doc);
        if (this.opts.exported) writer.write("export ");
        if (this.opts.const) writer.write("const ");
        writer.write(`enum ${this.name} `);
        writer.writeBlock(() => {
            for (const member of this.members) {
                writeJsDoc(writer, member.doc);
                writer.write(member.name);
                if (member.value !== undefined) {
                    writer.write(` = ${member.value}`);
                }
                writer.writeLine(",");
            }
        });
        writer.newLine();
    }

    private resolveLiteral(
        value: number | string | undefined,
        nextOrdinal: number,
    ): { text: string; nextOrdinal: number } {
        if (value === undefined) {
            return { text: String(nextOrdinal), nextOrdinal: nextOrdinal + 1 };
        }
        if (typeof value === "number") {
            return { text: String(value), nextOrdinal: value + 1 };
        }
        const parsed = Number(value.trim());
        if (Number.isFinite(parsed)) {
            return { text: value, nextOrdinal: parsed + 1 };
        }
        return { text: value, nextOrdinal };
    }
}

/** Create an {@link EnumDeclarationBuilder} with the given name and options. */
export function enumDecl(name: string, opts?: EnumOptions): EnumDeclarationBuilder {
    return new EnumDeclarationBuilder(name, opts);
}
