import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { call, start, quit } = require("./index.node");

export { call, start, quit };
