import { createRequire } from "node:module";
import { Ref, Param, Type } from "./types.js";

const require = createRequire(import.meta.url);
const native = require("./index.node");

export const createRef = <T>(value: T): Ref<T> => {
  return { value };
};

export const call = native.call as (
  library: string,
  symbol: string,
  params: Param[],
  returnType: Type
) => unknown;

export const start = native.start as (appId: string) => unknown;
export const stop = native.stop as () => void;
