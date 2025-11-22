import React, { useRef, useState, useEffect } from "react";
import { render, quit, createPortal } from "./index.js";

// Example 1: Direct children in Box container
function BoxExample() {
  return (
    <ApplicationWindow title="Box Example" onCloseRequest={() => quit()}>
      <Box orientation={0} spacing={10}>
        <Label label="Child 1" />
        <Label label="Child 2" />
        <Label label="Child 3" />
      </Box>
    </ApplicationWindow>
  );
}

// Example 2: Named child slots with CenterBox
function CenterBoxExample() {
  return (
    <ApplicationWindow title="CenterBox Example" onCloseRequest={() => quit()}>
      <CenterBox>
        <CenterBox.StartWidget>
          <Label label="Start" />
        </CenterBox.StartWidget>
        <CenterBox.CenterWidget>
          <Label label="Center" />
        </CenterBox.CenterWidget>
        <CenterBox.EndWidget>
          <Label label="End" />
        </CenterBox.EndWidget>
      </CenterBox>
    </ApplicationWindow>
  );
}

// Example 3: Combination - Box with named child slots
function CombinedExample() {
  return (
    <ApplicationWindow title="Combined Example" onCloseRequest={() => quit()}>
      <Box orientation={1} spacing={10}>
        <CenterBox>
          <CenterBox.StartWidget>
            <Label label="Header Start" />
          </CenterBox.StartWidget>
          <CenterBox.CenterWidget>
            <Label label="Header Center" />
          </CenterBox.CenterWidget>
          <CenterBox.EndWidget>
            <Label label="Header End" />
          </CenterBox.EndWidget>
        </CenterBox>
        <Box orientation={0} spacing={5}>
          <Label label="Content 1" />
          <Label label="Content 2" />
          <Label label="Content 3" />
        </Box>
        <Label label="Footer" />
      </Box>
    </ApplicationWindow>
  );
}

// Example 4: ListView with itemFactory
interface Person {
  id: number;
  name: string;
  age: number;
}

function ListViewExample() {
  const people: Person[] = [
    { id: 1, name: "Alice", age: 30 },
    { id: 2, name: "Bob", age: 25 },
    { id: 3, name: "Charlie", age: 35 },
    { id: 4, name: "Diana", age: 28 },
    { id: 5, name: "Eve", age: 32 },
  ];

  return (
    <ApplicationWindow title="ListView Example" onCloseRequest={() => quit()}>
      <ListView<Person>
        itemFactory={(item) => (
          <Label label={item ? `${item.name} (${item.age})` : "Loading..."} />
        )}
      >
        {people.map((person) => (
          <ListView.Item item={person} key={person.id} />
        ))}
      </ListView>
    </ApplicationWindow>
  );
}

// Example 5: Portal - render content into a different widget
function PortalExample() {
  const [portalContainer, setPortalContainer] = useState<unknown>(null);

  return (
    <ApplicationWindow title="Portal Example" onCloseRequest={() => quit()}>
      <Box orientation={1} spacing={10}>
        <Label label="Main content area" />

        {/* This Box will receive portal content */}
        <Box orientation={1} spacing={5} ref={setPortalContainer}>
          <Label label="Portal container (content will appear below):" />
        </Box>

        <Label label="More main content" />

        {/* Portal: render into the Box above */}
        {portalContainer &&
          createPortal(
            <Label label="This was rendered via createPortal!" />,
            portalContainer,
          )}
      </Box>
    </ApplicationWindow>
  );
}

// Example 6: FileDialog - non-Widget dialog example
function FileDialogExample() {
  const [showDialog, setShowDialog] = useState(false);

  return (
    <ApplicationWindow title="FileDialog Example" onCloseRequest={() => quit()}>
      <Box orientation={1} spacing={10}>
        <Label label="Click the button to open a file dialog" />
        <Button label="Open File" onClick={() => setShowDialog(true)} />

        {/* FileDialog is a non-Widget dialog that is automatically shown when mounted */}
        {showDialog && <FileDialog mode="open" />}
      </Box>
    </ApplicationWindow>
  );
}

// Run one of the examples
render(<FileDialogExample />, "com.example.gtkx.test");
