import { createRequire } from "node:module";
import { Arg, Ref, Type } from "./types.js";

const require = createRequire(import.meta.url);
const native = require("./index.node");

export const createRef = <T>(value: T): Ref<T> => {
	return { value };
};

export const call = native.call as (
	library: string,
	symbol: string,
	args: Arg[],
	returnType: Type,
) => unknown;

export const start = native.start as (appId: string) => unknown;
export const stop = native.stop as () => void;
export { Ref, Arg, Type };
