import {
  Gtk_getMajorVersion,
  Gtk_getMinorVersion,
  Gtk_getMicroVersion,
  Gtk_ApplicationWindow,
  createRef,
  start,
  stop,
} from "@gtkx/ffi";

const app = start("com.gtkx.demo");

const majorVersion = Gtk_getMajorVersion();
const minorVersion = Gtk_getMinorVersion();
const microVersion = Gtk_getMicroVersion();

console.log(`GTK version: ${majorVersion}.${minorVersion}.${microVersion}`);

const window = new Gtk_ApplicationWindow(app);

console.log("Created a new ApplicationWindow: ", window);

window.setTitle("Hello, GTK!");
window.setDefaultSize(800, 600);
window.present();

// Test refs with gtk_window_get_default_size
const wRef = createRef(null);
const hRef = createRef(null);
window.getDefaultSizeRefs(wRef, hRef);
console.log("Default size via refs:", wRef.value, hRef.value);

window.connect("close-request", (...args: any[]) => {
  console.log("Window closed, stopping the app.");
  console.log("Arguments: ", args);
  setTimeout(stop, 0);
  return false;
});
