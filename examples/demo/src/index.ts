import { Gtk, render } from "@gtkx/gtkx";

render("com.gtkx.demo");

const majorVersion = Gtk.getMajorVersion();
const minorVersion = Gtk.getMinorVersion();
const microVersion = Gtk.getMicroVersion();

console.log(`GTK version: ${majorVersion}.${minorVersion}.${microVersion}`);

const window = new Gtk.ApplicationWindow();
console.log(window);

window.setTitle("Hello, GTK!");
window.setDefaultSize(800, 600);
window.present();

setTimeout(() => {}, Number.MAX_SAFE_INTEGER);
