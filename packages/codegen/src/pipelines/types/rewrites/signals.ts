/**
 * Signal-companion rewrites
 *
 * Aligns the ts-for-gir `on` / `once` / `off` signal-companion surface with
 * the gtkx runtime and removes the GJS-specific synthetic members ts-for-gir
 * emits onto class bodies.
 */

import { findMatchingBrace, TYPE_BLOCK_HEADER } from "./shared.js";

const EVENT_EMITTER_SIGNAL_RETURN = /(\n[ \t]*(?:on|once|off)\(sigName:[^\n]*\): )NodeJS\.EventEmitter\b/g;
const SYNTHETIC_GTYPE_SIGNAL_LINE = /^[ \t]*(?:connect|on|once|off|emit)\(sigName: "notify::__gtype__"[^\n]*\n/gm;
const SYNTHETIC_GTYPE_INSTANCE_LINE = /^[ \t]*gTypeInstance: TypeInstance[ \t]*\n/gm;
const SYNTHETIC_PARENT_INSTANCE_LINE = /^[ \t]*parentInstance: any[ \t]*\n/gm;
const SYNTHETIC_INIT_LINE = /^[ \t]*_init\(config\?: [\w.]*ConstructorProperties\): void[ \t]*\n/gm;

/**
 * Aligns the ts-for-gir signal-companion surface with the gtkx runtime.
 *
 * ts-for-gir emits `on` / `once` / `off` signal aliases typed against
 * `NodeJS.EventEmitter`; the gtkx runtime supplies them through hand-written
 * GObject overrides that return the receiver for chaining. The
 * `NodeJS.EventEmitter` return type is a ts-for-gir bug relative to the gtkx
 * runtime — its `on` / `once` / `off` are not Node `EventEmitter` aliases — so
 * it is corrected to the declaring class or interface, the type the runtime
 * override actually returns, scoped per owner block. The members themselves
 * are kept because they are genuine public API.
 *
 * ts-for-gir also synthesizes a `_init(config?)` constructor helper, a
 * `gTypeInstance: TypeInstance` field, a `parentInstance: any` field, and
 * `notify::__gtype__` signal overloads. `_init`, `gTypeInstance`,
 * `parentInstance` and the `notify::__gtype__` signal are GJS-isms — node-gtk
 * never enumerates class instance-struct fields — with no gtkx counterpart and
 * are removed. The runtime-stamped `__gtype__: number` field is genuine
 * node-gtk API and is kept.
 *
 * @param source - The `.d.ts` source to rewrite.
 * @returns The source with the signal-companion surface aligned to the runtime.
 */
export function stripEventEmitterSignalOverloads(source: string): string {
    let result = source;
    TYPE_BLOCK_HEADER.lastIndex = 0;
    for (;;) {
        const header = TYPE_BLOCK_HEADER.exec(result);
        if (header === null) break;
        const ownerName = header[2];
        if (ownerName === undefined) continue;
        const bodyStart = header.index + header[0].length;
        const bodyEnd = findMatchingBrace(result, bodyStart);
        if (bodyEnd < 0) continue;
        const body = result.slice(bodyStart, bodyEnd);
        const newBody = body.replace(EVENT_EMITTER_SIGNAL_RETURN, `$1${ownerName}`);
        if (newBody === body) continue;
        result = result.slice(0, bodyStart) + newBody + result.slice(bodyEnd);
        TYPE_BLOCK_HEADER.lastIndex = bodyStart + newBody.length;
    }
    return result
        .replace(SYNTHETIC_GTYPE_SIGNAL_LINE, "")
        .replace(SYNTHETIC_GTYPE_INSTANCE_LINE, "")
        .replace(SYNTHETIC_PARENT_INSTANCE_LINE, "")
        .replace(SYNTHETIC_INIT_LINE, "");
}
