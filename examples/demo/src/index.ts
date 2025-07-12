import { start, stop } from "@gtkx/bridge";
import {
  getMajorVersion,
  getMinorVersion,
  getMicroVersion,
  ApplicationWindow,
} from "@gtkx/bridge/gtk";

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

window.connect("close-request", (...args: any[]) => {
  console.log("Window closed, stopping the app.");
  console.log("Arguments: ", args);
  setTimeout(stop, 0);
  return false;
});
