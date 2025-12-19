import { afterAll, beforeAll } from "vitest";
import * as Gtk from "../src/generated/gtk/index.js";
import { registerNativeClass, start, stop } from "../src/index.js";

const toAppId = (name: string) => {
    return `com.gtkx.${name.replace(/[^a-zA-Z0-9]/g, "_")}`;
};

beforeAll((context) => {
    registerNativeClass(Gtk.Application);
    start(toAppId(context.name));
});

afterAll(() => {
    stop();
});
