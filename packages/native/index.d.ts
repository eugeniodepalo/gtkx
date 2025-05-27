module "@gtkx/native" {
  type ArgType =
    | "u8"
    | "u16"
    | "u32"
    | "u64"
    | "i8"
    | "i16"
    | "i32"
    | "i64"
    | "f32"
    | "f64"
    | "boolean"
    | "string"
    | "pointer"
    | "string[]"
    | "u8[]"
    | "u16[]"
    | "u32[]"
    | "u64[]"
    | "i8[]"
    | "i16[]"
    | "i32[]"
    | "i64[]"
    | "f32[]"
    | "f64[]";

  type ReturnType =
    | "u8"
    | "u16"
    | "u32"
    | "u64"
    | "i8"
    | "i16"
    | "i32"
    | "i64"
    | "f32"
    | "f64"
    | "boolean"
    | "string"
    | "gpointer"
    | "gobject-borrowed"
    | "gobject"
    | "void";

  type ArgTypeMap = {
    u8: number;
    u16: number;
    u32: number;
    u64: number;
    i8: number;
    i16: number;
    i32: number;
    i64: number;
    f32: number;
    f64: number;
    boolean: boolean;
    string: string;
    pointer: unknown;
    "string[]": string[];
    "u8[]": number[];
    "u16[]": number[];
    "u32[]": number[];
    "u64[]": number[];
    "i8[]": number[];
    "i16[]": number[];
    "i32[]": number[];
    "i64[]": number[];
    "f32[]": number[];
    "f64[]": number[];
  };

  type ReturnTypeMap = {
    u8: number;
    u16: number;
    u32: number;
    u64: number;
    i8: number;
    i16: number;
    i32: number;
    i64: number;
    f32: number;
    f64: number;
    boolean: boolean;
    string: string;
    gpointer: unknown;
    "gobject-borrowed": unknown;
    gobject: unknown;
    void: void;
  };

  type Arg<T extends ArgType> = {
    type: T;
    value: ArgTypeMap[T];
  };

  export function start(appId: string): unknown;
  export function quit(): void;

  export function call<T extends ReturnType>(
    name: string,
    args: Arg[],
    returnType: T
  ): ReturnTypeMap[T];
}
