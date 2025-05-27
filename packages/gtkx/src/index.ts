import * as Gtk from "./gtk.js";
import { quit } from "@gtkx/native";
import process from "node:process";

export { Gtk };
export { render } from "./render.js";

process.on("exit", () => {
  quit();
});
