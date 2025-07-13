import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { call, start, stop } = require("./index.node");

const createRef = (value) => {
  return { value };
};

export { call, start, stop, createRef };
