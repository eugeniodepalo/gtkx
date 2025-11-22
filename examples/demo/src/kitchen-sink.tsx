/**
 * GTKx Kitchen Sink Demo
 *
 * This example showcases ALL major reconciler features and common GTK widgets:
 *
 * RECONCILER FEATURES DEMONSTRATED:
 * 1. Named Child Slots (CenterBox, Paned, Grid)
 * 2. ListView with itemFactory
 * 3. createPortal for out-of-tree rendering
 * 4. Typed Refs with full type safety
 * 5. Signal handlers (onClick, onToggled, etc.)
 *
 * COMMON WIDGETS DEMONSTRATED:
 * - Layout: Box, CenterBox, Grid, Paned, Frame, ScrolledWindow
 * - Buttons: Button, ToggleButton, CheckButton, Switch
 * - Input: Entry
 * - Display: Label, ProgressBar, Spinner, Separator
 * - Lists: ListView with dynamic data
 */

import React, { useState, useRef, useEffect } from "react";
import {
  render,
  quit,
  createPortal,
  ApplicationWindow,
  Box,
  CenterBox,
  Grid,
  Paned,
  ScrolledWindow,
  Frame,
  Button,
  ToggleButton,
  CheckButton,
  Label,
  Entry,
  ProgressBar,
  Spinner,
  Separator,
  ListView,
  Switch,
} from "@gtkx/gtkx";
import * as Gtk from "@gtkx/ffi/gtk";

// Data models for ListView examples
interface TodoItem {
  id: number;
  text: string;
  completed: boolean;
}

interface Person {
  id: number;
  name: string;
  role: string;
}

function KitchenSinkDemo() {
  // State
  const [counter, setCounter] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [progress, setProgress] = useState(0.5);
  const [todos, setTodos] = useState<TodoItem[]>([
    { id: 1, text: "Learn GTK", completed: true },
    { id: 2, text: "Build React renderer", completed: true },
    { id: 3, text: "Create awesome apps", completed: false },
  ]);
  const [people] = useState<Person[]>([
    { id: 1, name: "Alice Johnson", role: "Developer" },
    { id: 2, name: "Bob Smith", role: "Designer" },
    { id: 3, name: "Carol White", role: "Manager" },
  ]);

  // Typed refs
  const labelRef = useRef<Gtk.Label>(null);
  const portalContainerRef = useRef<unknown>(null);
  const boxRef = useRef<Gtk.Box>(null);

  // Effects
  useEffect(() => {
    if (labelRef.current) {
      console.log("Label ref initialized:", labelRef.current);
    }
  }, []);

  // Progress animation
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => (prev + 0.01 > 1 ? 0 : prev + 0.01));
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // Event handlers
  const handleAddTodo = () => {
    setTodos([
      ...todos,
      {
        id: Date.now(),
        text: `New todo ${todos.length + 1}`,
        completed: false,
      },
    ]);
  };

  const handleRemoveTodo = (id: number) => {
    setTodos(todos.filter((t) => t.id !== id));
  };

  return (
    <ApplicationWindow
      title="GTKx Kitchen Sink - All Features"
      defaultWidth={1000}
      defaultHeight={700}
      onCloseRequest={() => {
        quit();
        return false;
      }}
    >
      <Box vexpand={true}>
        {/* Header with CenterBox named slots */}
        <Box spacing={10}>
          <Label.Root label="🎯 Feature 1: Named Child Slots (CenterBox)" />
        </Box>

        <CenterBox.Root>
          <CenterBox.StartWidget>
            <Label.Root label="Left Side" />
          </CenterBox.StartWidget>
          <CenterBox.CenterWidget>
            <Label.Root label={`Counter: ${counter}`} ref={labelRef} />
          </CenterBox.CenterWidget>
          <CenterBox.EndWidget>
            <Button label="Increment" onClicked={() => setCounter(counter + 1)} />
          </CenterBox.EndWidget>
        </CenterBox.Root>

        <Separator />

        {/* ListView Demo */}
        <Box spacing={5}>
          <Label.Root label="📋 Feature 2: ListView with ItemFactory" />
        </Box>

        <Box spacing={10}>
          <Button label="Add Todo" onClicked={handleAddTodo} />
          <Label.Root label={`Total: ${todos.length}`} />
        </Box>

        <ScrolledWindow heightRequest={200} vexpand={false}>
          <ListView.Root
            itemFactory={(item: TodoItem | null) => {
              const box = new Gtk.Box(Gtk.Orientation.HORIZONTAL, 10);
              const checkButton = new Gtk.CheckButton();
              checkButton.setActive(item?.completed ?? false);
              const label = new Gtk.Label(item?.text ?? "");
              label.setHexpand(true);
              const button = new Gtk.Button();
              button.setLabel("Remove");
              if (item) {
                button.connect("clicked", () => handleRemoveTodo(item.id));
              }
              box.append(checkButton.ptr);
              box.append(label.ptr);
              box.append(button.ptr);
              return box;
            }}
          >
            {todos.map((todo) => (
              <ListView.Item item={todo} key={todo.id} />
            ))}
          </ListView.Root>
        </ScrolledWindow>

        <Separator />

        {/* Another ListView */}
        <Box spacing={5}>
          <Label.Root label="👥 Feature 3: Another ListView Example" />
        </Box>

        <ScrolledWindow heightRequest={150} vexpand={false}>
          <ListView.Root
            itemFactory={(item: Person | null) => {
              const box = new Gtk.Box(Gtk.Orientation.HORIZONTAL, 15);
              const nameLabel = new Gtk.Label(item?.name ?? "");
              nameLabel.setHexpand(true);
              const roleLabel = new Gtk.Label(item?.role ?? "");
              box.append(nameLabel.ptr);
              box.append(roleLabel.ptr);
              return box;
            }}
          >
            {people.map((person) => (
              <ListView.Item item={person} key={person.id} />
            ))}
          </ListView.Root>
        </ScrolledWindow>

        <Separator />

        {/* Portal Demo */}
        <Box spacing={5}>
          <Label.Root label="🌀 Feature 4: createPortal()" />
        </Box>

        <Box spacing={10}>
          <Label.Root label="Main content before portal" />

          <Frame.Root label="Portal Container">
            <Box spacing={5} ref={portalContainerRef}>
              <Label.Root label="Waiting for portal..." />
            </Box>
          </Frame.Root>

          <Label.Root label="Main content after portal" />

          {portalContainerRef.current &&
            createPortal(
              <Box spacing={5}>
                <Label.Root label="✨ Portaled content!" />
                <Button label="Portaled Button" onClicked={() => console.log("Clicked!")} />
              </Box>,
              portalContainerRef.current
            )}
        </Box>

        <Separator />

        {/* Typed Refs */}
        <Box spacing={5}>
          <Label.Root label="🎯 Feature 5: Typed Refs" />
          <Box ref={boxRef}>
            <Label.Root label="This Box has a typed ref!" />
          </Box>
        </Box>

        <Separator />

        {/* Paned Layout */}
        <Box spacing={5}>
          <Label.Root label="↔️ Feature 6: Paned Layout" />
        </Box>

        <Paned.Root position={300} vexpand={false} heightRequest={100}>
          <Paned.StartChild resize={true} shrink={false}>
            <Frame.Root label="Left Pane">
              <Label.Root label="Drag the divider →" />
            </Frame.Root>
          </Paned.StartChild>
          <Paned.EndChild resize={true} shrink={false}>
            <Frame.Root label="Right Pane">
              <Label.Root label="← to resize" />
            </Frame.Root>
          </Paned.EndChild>
        </Paned.Root>

        <Separator />

        {/* Grid Layout */}
        <Box spacing={5}>
          <Label.Root label="📐 Feature 7: Grid Layout" />
        </Box>

        <Grid.Root rowSpacing={10} columnSpacing={10}>
          <Grid.Child row={0} column={0}>
            <Button label="(0,0)" />
          </Grid.Child>
          <Grid.Child row={0} column={1}>
            <Button label="(0,1)" />
          </Grid.Child>
          <Grid.Child row={1} column={0} columnSpan={2}>
            <Button label="Spans 2 columns" />
          </Grid.Child>
        </Grid.Root>

        <Separator />

        {/* Common Widgets */}
        <Box spacing={5}>
          <Label.Root label="🎨 Bonus: Common Widgets" />
        </Box>

        <Box spacing={10}>
          <ProgressBar fraction={progress} showText={true} />

          <Box spacing={10}>
            <Spinner spinning={isSpinning} />
            <Button
              label={isSpinning ? "Stop" : "Start"}
              onClicked={() => setIsSpinning(!isSpinning)}
            />
          </Box>

          <Entry placeholderText="Enter text..." />

          <Box spacing={10}>
            <ToggleButton.Root label="Toggle" />
            <CheckButton.Root label="Check" />
            <Switch />
          </Box>
        </Box>

        {/* Footer */}
        <Separator />
        <Label.Root label="✨ All reconciler features demonstrated!" />
      </Box>
    </ApplicationWindow>
  );
}

render(<KitchenSinkDemo />, "com.gtkx.kitchen-sink");
