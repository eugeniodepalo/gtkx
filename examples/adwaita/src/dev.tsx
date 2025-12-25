import pkg from "../package.json" with { type: "json" };

export { App as default } from "./app.js";

export const appId = pkg.gtkx.appId;
