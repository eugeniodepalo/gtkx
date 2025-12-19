import { registerNativeClass, start, stop } from "@gtkx/ffi";
import * as Gtk from "@gtkx/ffi/gtk";
import { afterAll, beforeAll } from "vitest";

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
