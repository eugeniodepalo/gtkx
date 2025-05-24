import { Gtk, render } from "@gtkx/gtkx";

render("com.gtkx.demo");

const majorVersion = Gtk.getMajorVersion();
const minorVersion = Gtk.getMinorVersion();
const microVersion = Gtk.getMicroVersion();

console.log(`GTK version: ${majorVersion}.${minorVersion}.${microVersion}`);
