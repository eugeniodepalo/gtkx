module "@gtkx/native" {
  type IntegerType = { type: "int"; size: 8 | 32 | 64; unsigned?: boolean };
  type FloatType = { type: "float"; size: 32 | 64 };
  type BooleanType = { type: "boolean" };
  type StringType = { type: "string" };
  type GObjectType = { type: "gobject"; borrowed?: boolean };
  type CustomType = { type: "custom"; borrowed?: boolean; unref?: string };
  type VoidType = { type: "void" };

  type NativeType =
    | IntegerType
    | FloatType
    | BooleanType
    | StringType
    | GObjectType
    | CustomType
    | VoidType;

  type NativeTypeMap = {
    int: number;
    float: number;
    boolean: boolean;
    string: string;
    gobject: unknown;
    custom: unknown;
    void: void;
  };

  type NativeTypeToJs<T extends NativeType> = NativeTypeMap[T["type"]];

  type NativeTypeArrayToJs<T extends NativeType[]> = {
    [K in keyof T]: NativeTypeToJs<T[K]>;
  };

  type Arg =
    | (IntegerType & { value: number })
    | (FloatType & { value: number })
    | (BooleanType & { value: boolean })
    | (StringType & { value: string })
    | (GObjectType & { value: unknown })
    | (CustomType & { value: unknown })
    | {
        type: "callback";
        argTypes: NativeType[];
        returnType: NativeType;
        value: unknown;
      }
    | {
        type: "array";
        value:
          | (IntegerType & { value: number[] })
          | (FloatType & { value: number[] })
          | (BooleanType & { value: boolean[] })
          | (StringType & { value: string[] });
      };

  type Args<T extends Arg[]> = {
    [K in keyof T]: T[K] extends {
      type: "callback";
      argTypes: infer TCallbackArgs;
      returnType: infer TReturnType;
    }
      ? {
          type: "callback";
          argTypes: TCallbackArgs;
          returnType: TReturnType;
          value: (
            ...args: NativeTypeArrayToJs<TCallbackArgs>
          ) => NativeTypeToJs<TReturnType>;
        }
      : T[K];
  };

  export function start(appId: string): unknown;
  export function quit(): void;

  export function call<TReturnType extends NativeType, TArgs extends Arg[]>(
    name: string,
    args: Args<TArgs>,
    returnType: TReturnType
  ): NativeTypeToJs<TReturnType>;
}
