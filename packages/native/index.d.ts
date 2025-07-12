module "@gtkx/native" {
  type IntegerType = { type: "int"; size: 8 | 32 | 64; unsigned?: boolean };
  type FloatType = { type: "float"; size: 32 | 64 };
  type BooleanType = { type: "boolean" };
  type StringType = { type: "string" };
  type GObjectType = { type: "gobject"; borrowed?: boolean };
  type BoxedType = { type: "boxed"; borrowed?: boolean; type: string };
  type ArrayType = { type: "array"; itemType: Type };
  type VoidType = { type: "void" };
  type CallbackType = { type: "callback" };
  type NullType = { type: "null" };

  type ResultType =
    | Exclude<Type, ArrayType | CallbackType>
    | VoidType
    | NullType;

  type Type =
    | IntegerType
    | FloatType
    | BooleanType
    | StringType
    | NullType
    | GObjectType
    | BoxedType
    | ArrayType
    | CallbackType;

  type Value =
    | number
    | string
    | boolean
    | unknown
    | unknown[]
    | ((...args: unknown[]) => unknown);

  type Result = {
    int: number;
    float: number;
    boolean: boolean;
    string: string;
    gobject: unknown;
    boxed: unknown;
    void: void;
    null: null;
  };

  type Arg = {
    type: Type;
    value: Value;
  };
}

export function start(appId: string): unknown;
export function stop(app: unknown): void;

export function call<TResultType extends ResultType>(
  name: string,
  args: Arg[],
  returnType: TResultType
): Result[TResultType["type"]];
