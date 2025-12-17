import * as Gdk from "../src/generated/gdk/index.js";
import * as Gtk from "../src/generated/gtk/index.js";
import { registerType, start, stop } from "../src/native.js";

const APP_ID = "com.gtkx.test.ffi";

let initialized = false;

export const initGtk = () => {
    if (initialized) return;

    registerType(Gtk.Application);
    registerType(Gtk.Widget);
    registerType(Gtk.Button);
    registerType(Gtk.Label);
    registerType(Gtk.Entry);
    registerType(Gtk.Box);
    registerType(Gtk.Window);
    registerType(Gtk.ApplicationWindow);
    registerType(Gtk.Builder);
    registerType(Gtk.Orientable);
    registerType(Gdk.Rgba);

    start(APP_ID);
    initialized = true;
};

export const cleanupGtk = () => {
    if (initialized) {
        stop();
        initialized = false;
    }
};
