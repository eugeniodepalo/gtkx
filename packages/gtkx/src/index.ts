import * as Gtk from "./gtk.js";
import { quit } from "@gtkx/native";
import process from "node:process";

export { Gtk };
export { render } from "./render.js";

// before quitting node, we need to call the quit function
process.on("exit", () => {
  quit();
});
