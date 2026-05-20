import { describe, expect, it } from "vitest";
import * as runtime from "../src/runtime.js";

const EXPECTED_RUNTIME_EXPORTS = [
    "createRef",
    "promisify",
    "registerConstructionMeta",
    "getClassStruct",
    "getHandle",
    "setClassStruct",
    "setHandle",
    "tryGetHandle",
    "alloc",
    "call",
    "freeze",
    "getNativeId",
    "read",
    "t",
    "unfreeze",
    "write",
    "resolveClassStructPointer",
    "checkError",
    "makeErrorDomain",
    "NativeError",
    "throwUnsupported",
    "registerInterfaceClassStruct",
    "getNativeObject",
    "getNativeObjectAsInterface",
    "registerNativeClass",
    "registerNativeInterface",
    "connectSignal",
    "emitSignal",
    "registerSignalMeta",
    "constructNativeObject",
] as const;

describe("runtime barrel", () => {
    it("exposes every value symbol generated code depends on", () => {
        for (const name of EXPECTED_RUNTIME_EXPORTS) {
            expect(runtime, `missing runtime export: ${name}`).toHaveProperty(name);
        }
    });

    it("re-exports `constructNativeObject` last so the import cycle through ./object.js closes after the acyclic runtime is initialized", () => {
        const exportNames = Object.keys(runtime);
        expect(exportNames[exportNames.length - 1]).toBe("constructNativeObject");
    });
});
