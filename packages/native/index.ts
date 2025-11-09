import { createRequire } from "node:module";

type IntegerType = { type: "int"; size: 8 | 32 | 64; unsigned?: boolean };
type FloatType = { type: "float"; size: 32 | 64 };
type BooleanType = { type: "boolean" };
type StringType = { type: "string" };
type GObjectType = { type: "gobject"; borrowed?: boolean };
type BoxedType = { type: "boxed"; borrowed?: boolean; innerType: string };
type ArrayType = { type: "array"; itemType: Type };
type RefType = { type: "ref"; innerType: Type };
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

type ResultType = Exclude<Type, ArrayType | CallbackType> | VoidType;
type Arg = { type: Type; value: unknown };
type Ref<T> = { value: T };

const require = createRequire(import.meta.url);
const native = require("./index.node");

const createRef = (value: any) => {
  return { value };
};

const call = native.call as <TResultType extends ResultType>(
  library: string,
  symbol: string,
  args: Arg[],
  returnType: TResultType
) => any;

const start = native.start as (appId: string) => unknown;
const stop = native.stop as () => void;

export { call, start, stop, createRef };
