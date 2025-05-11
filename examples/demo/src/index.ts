import { Gtk } from "@gtkx/gtkx";

const majorVersion = Gtk.getMajorVersion();
const minorVersion = Gtk.getMinorVersion();
const microVersion = Gtk.getMicroVersion();

console.log(`GTK version: ${majorVersion}.${minorVersion}.${microVersion}`);
