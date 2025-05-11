import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { call, start } = require("./index.node");

export { call, start };
