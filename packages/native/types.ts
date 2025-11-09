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

export type Type =
  | IntegerType
  | FloatType
  | BooleanType
  | StringType
  | GObjectType
  | BoxedType
  | ArrayType
  | RefType
  | CallbackType
  | VoidType;

export type Param = { type: Type; value: unknown };
export type Ref<T> = { value: T };
