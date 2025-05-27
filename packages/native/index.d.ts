module "@gtkx/native" {
  type IntegerType = { type: "uint" | "int"; size: 8 | 16 | 32 | 64 };
  type FloatType = { type: "float"; size: 32 | 64 };

  type ReturnType =
    | IntegerType
    | FloatType
    | { type: "boolean" | "string" | "gobject" | "void" }
    | { type: "custom"; unref?: string };

  type ReturnTypeMap = {
    uint: number;
    int: number;
    float: number;
    boolean: boolean;
    string: string;
    gobject: unknown;
    custom: unknown;
    void: void;
  };

  type Arg =
    | (IntegerType & { value: number })
    | (FloatType & { value: number })
    | { type: "boolean"; value: boolean }
    | { type: "string"; value: string }
    | { type: "object"; value: unknown }
    | {
        type: "array";
        value:
          | (IntegerType & { value: number[] })
          | (FloatType & { value: number[] })
          | { type: "boolean"; value: boolean[] }
          | { type: "string"; value: string[] };
      };

  export function start(appId: string): unknown;
  export function quit(): void;

  export function call<T extends ReturnType>(
    name: string,
    args: Arg[],
    returnType: T
  ): ReturnTypeMap[T["type"]];
}
