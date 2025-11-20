import { createElement as h } from "react";
import { stop, render } from "@gtkx/gtkx";

render(
  h(
    "ApplicationWindow",
    {
      title: "Hello, GTK with React!",
      defaultWidth: 800,
      defaultHeight: 600,
      onCloseRequest: () => {
        console.log("Window closed, stopping the app.");
        setTimeout(stop, 0);
        return false;
      },
    },
    h("Button", {
      label: "Click me!",
      onClicked: () => {
        console.log("Button clicked!");
      },
    })
  ),
  "com.gtkx.demo"
);
