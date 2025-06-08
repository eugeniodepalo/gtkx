import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { call, start, stop } = require("./index.node");

export { call, start, stop };
