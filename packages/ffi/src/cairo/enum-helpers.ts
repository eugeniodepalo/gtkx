import { createRef, type NativeHandle } from "@gtkx/native";
import { read, t } from "../native.js";
import { INT_REF, INT_TYPE, LIB, STRING_BORROWED } from "./common.js";

const { fn } = t;
const INT_ARRAY_REF = t.ref(t.boxed("int*", "borrowed", LIB));

/**
 * Binds a Cairo `*_get_*` enum-list query (e.g. `cairo_pdf_get_versions`) and
 * returns a getter that yields the supported enum values as an array.
 */
export const enumListGetter = <T extends number>(symbol: string): (() => T[]) => {
    const boundFn = fn(LIB, symbol, [{ type: INT_ARRAY_REF }, { type: INT_REF }], t.void);
    return (): T[] => {
        const valuesRef = createRef<NativeHandle | null>(null);
        const numRef = createRef(0);
        boundFn(valuesRef, numRef);
        const count = numRef.value;
        const result: T[] = [];
        if (valuesRef.value === null) return result;
        for (let i = 0; i < count; i++) {
            result.push(read(valuesRef.value, INT_TYPE, i * 4) as T);
        }
        return result;
    };
};

/**
 * Binds a Cairo `*_to_string` enum-name query (e.g. `cairo_pdf_version_to_string`)
 * and returns a function that maps an enum value to its human-readable name.
 */
export const enumToStringFn = <T extends number = number>(symbol: string): ((value: T) => string) => {
    const boundFn = fn(LIB, symbol, [{ type: INT_TYPE }], STRING_BORROWED);
    return (value: T): string => boundFn(value) as string;
};
