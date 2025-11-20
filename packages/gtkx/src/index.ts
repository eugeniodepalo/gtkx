export { createRef } from "@gtkx/ffi";
export * from "./generated/jsx.js";
export { render } from "./render.js";
import { stop } from "@gtkx/ffi";

export const quit = () => {
  setTimeout(() => {
    stop();
  }, 0);
};
