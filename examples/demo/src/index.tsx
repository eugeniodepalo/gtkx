import { ApplicationWindow, Button, quit, render } from "@gtkx/gtkx";

render(
  <ApplicationWindow
    title="Hello, GTK with React!"
    defaultWidth={800}
    defaultHeight={600}
    onCloseRequest={() => {
      console.log("Window closed, stopping the app.");
      quit();
      return false;
    }}
  >
    <Button
      label="Click me!"
      onClicked={() => {
        console.log("Button clicked!");
      }}
    />
  </ApplicationWindow>,
  "com.gtkx.demo"
);
