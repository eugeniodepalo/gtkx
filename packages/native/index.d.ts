module "@gtkx/native" {
  type IntegerType = { type: "int"; size: 8 | 32 | 64; unsigned?: boolean };
  type FloatType = { type: "float"; size: 32 | 64 };
  type BooleanType = { type: "boolean" };
  type StringType = { type: "string" };
  type GObjectType = { type: "gobject"; borrowed?: boolean };
  type BoxedType = { type: "boxed"; borrowed?: boolean; innerType: string };
  type ArrayType = { type: "array"; itemType: Type };
  type RefType = { type: "ref" };
  type VoidType = { type: "void" };
  type CallbackType = { type: "callback" };
  type NullType = { type: "null" };

  type Type =
    | IntegerType
    | FloatType
    | BooleanType
    | StringType
    | NullType
    | GObjectType
    | BoxedType
    | ArrayType
    | RefType
    | CallbackType;

  type ResultType =
    | Exclude<Type, ArrayType | CallbackType>
    | VoidType
    | NullType;

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
    value: unknown;
  };
}

export function createRef(type: Type, value: unknown): unknown;
export function getRef(ref: unknown): unknown;
export function start(appId: string): unknown;
export function stop(): void;

export function call<TResultType extends ResultType>(
  library: string,
  symbol: string,
  args: Arg[],
  returnType: TResultType
): Result[TResultType["type"]];
