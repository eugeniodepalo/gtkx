/**
 * Class Instance Field Builder
 *
 * Some GIR `<class>` elements declare public instance-struct fields directly —
 * most commonly the embedded parent struct (`parent_instance`, `parent`,
 * `widget`, `object`). ts-for-gir surfaces these as instance members, and
 * node-gtk exposes them at runtime.
 *
 * Every such field is the embedded parent struct at offset 0 of the instance,
 * which shares the object's own address. The generated accessor therefore
 * returns the object itself viewed as that embedded struct, which is the
 * runtime behaviour node-gtk exposes.
 */

import { accessor } from "../../../builders/index.js";
import type { AccessorBuilder } from "../../../builders/members/accessor.js";
import type { Writer } from "../../../builders/writer.js";
import { toCamelCase, toValidMemberName } from "../../../core/utils/naming.js";
import type { GirClass } from "../../../gir/index.js";

/**
 * Builds read-only accessors for public instance-struct fields declared
 * directly on a GIR class.
 */
export class ClassInstanceFieldBuilder {
    constructor(private readonly cls: GirClass) {}

    /**
     * Builds an accessor for every public instance field of the class.
     *
     * @returns Read-only accessors, one per public instance field.
     */
    buildAccessors(): AccessorBuilder[] {
        return this.cls.fields
            .filter((field) => !field.private && field.readable !== false)
            .map((field) => {
                const name = toValidMemberName(toCamelCase(field.name));
                const getBody = (writer: Writer): void => {
                    writer.writeLine("return this;");
                };
                return accessor(name, { type: "unknown", getBody });
            });
    }
}
