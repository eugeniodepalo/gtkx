import { Gtk, render, stop } from "@gtkx/gtkx";

const app = render("com.gtkx.demo");

const majorVersion = Gtk.getMajorVersion();
const minorVersion = Gtk.getMinorVersion();
const microVersion = Gtk.getMicroVersion();

console.log(`GTK version: ${majorVersion}.${minorVersion}.${microVersion}`);

const window = new Gtk.ApplicationWindow(app);

console.log("Created a new ApplicationWindow: ", window);

window.setTitle("Hello, GTK!");
window.setDefaultSize(800, 600);
window.present();

let globalState: { window: Gtk.ApplicationWindow } | null = {
  window,
};

setTimeout(() => {
  stop();
  globalState = null;
}, 50000);
