import { createRef, type NativeHandle } from "@gtkx/native";
import { call, read, t } from "../native.js";
import { INT_TYPE, LIB } from "./common.js";

export function getEnumList<T extends number>(fnName: string): T[] {
    const versionsRef = createRef<NativeHandle | null>(null);
    const numRef = createRef(0);
    call(
        LIB,
        fnName,
        [
            { type: t.ref(t.boxed("int*", "borrowed", LIB)), value: versionsRef },
            { type: t.ref(INT_TYPE), value: numRef },
        ],
        t.void,
    );
    const count = numRef.value as number;
    const result: T[] = [];
    for (let i = 0; i < count; i++) {
        result.push(read(versionsRef.value as NativeHandle, INT_TYPE, i * 4) as T);
    }
    return result;
}

export function enumToString(fnName: string, value: number): string {
    return call(LIB, fnName, [{ type: INT_TYPE, value }], t.string("borrowed")) as string;
}
