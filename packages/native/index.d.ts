module "@gtkx/native" {
  type VoidType = { type: "void" };
  type IntegerType = { type: "int"; size: 8 | 32 | 64; unsigned?: boolean };
  type FloatType = { type: "float"; size: 32 | 64 };
  type BooleanType = { type: "boolean" };
  type StringType = { type: "string" };
  type GObjectType = { type: "gobject"; borrowed?: boolean };

  type CustomType = {
    type: "custom";
    borrowed?: boolean;
    unref?: string;
    ref?: string;
  };

  type ArrayType = {
    type: "array";
    itemType: IntegerType | FloatType | BooleanType | StringType;
  };

  type CallbackType = {
    type: "callback";
    argTypes: Type[];
    returnType: Type;
  };

  type Type =
    | IntegerType
    | FloatType
    | BooleanType
    | StringType
    | GObjectType
    | CustomType
    | ArrayType
    | CallbackType
    | VoidType;

  type TypeMap = {
    int: number;
    float: number;
    boolean: boolean;
    string: string;
    gobject: unknown;
    custom: unknown;
    array: never;
    callback: never;
    void: void;
  };

  type TypeToPrimitive<T extends Type> = TypeMap[T["type"]];

  type TypeArrayToPrimitive<T extends Type[]> = {
    [K in keyof T]: TypeToPrimitive<T[K]>;
  };

  type Arg =
    | (IntegerType & { value: number })
    | (FloatType & { value: number })
    | (BooleanType & { value: boolean })
    | (StringType & { value: string })
    | (GObjectType & { value: unknown })
    | (CustomType & { value: unknown })
    | (CallbackType & { value: unknown })
    | (ArrayType & { itemType: IntegerType; value: number[] })
    | (ArrayType & { itemType: FloatType; value: number[] })
    | (ArrayType & { itemType: BooleanType; value: boolean[] })
    | (ArrayType & { itemType: StringType; value: string[] });
}

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
          ...args: TypeArrayToPrimitive<TCallbackArgs>
        ) => TypeToPrimitive<TReturnType>;
      }
    : T[K];
};

export function start(appId: string): unknown;
export function stop(app: unknown): void;

export function call<TReturnType extends Type, TArgs extends Arg[]>(
  name: string,
  args: Args<TArgs>,
  returnType: TReturnType
): TypeToPrimitive<TReturnType>;
