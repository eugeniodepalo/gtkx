import { start, stop, createRef } from "@gtkx/ffi";
import {
  getMajorVersion,
  getMicroVersion,
  getMinorVersion,
  ApplicationWindow,
} from "@gtkx/ffi/gtk";
const app = start("com.gtkx.demo");

const majorVersion = getMajorVersion();
const minorVersion = getMinorVersion();
const microVersion = getMicroVersion();

console.log(`GTK version: ${majorVersion}.${minorVersion}.${microVersion}`);

const window = new ApplicationWindow(app);

console.log("Created a new ApplicationWindow: ", window);

window.setTitle("Hello, GTK!");
window.setDefaultSize(800, 600);
window.present();

const wRef = createRef<number>(0);
const hRef = createRef<number>(0);
window.getDefaultSize(wRef, hRef);
console.log("Default size via refs:", wRef.value, hRef.value);

window.connect("close-request", (...args: any[]) => {
  console.log("Window closed, stopping the app.");
  console.log("Arguments: ", args);
  setTimeout(stop, 0);
  return false;
});
