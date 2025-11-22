/**
 * GTKx Kitchen Sink Demo - Debugging Version
 *
 * We'll start minimal and uncomment sections one by one to isolate the segfault
 */

import React, { useState } from "react";
import {
  render,
  quit,
  ApplicationWindow,
  Box,
  CenterBox,
  ScrolledWindow,
  Label,
  Button,
  CheckButton,
  Separator,
  ListView,
} from "@gtkx/gtkx";
import * as Gtk from "@gtkx/ffi/gtk";

interface TodoItem {
  id: number;
  text: string;
  completed: boolean;
}

function KitchenSinkDemo() {
  const [counter, setCounter] = useState(0);
  const [todos, setTodos] = useState<TodoItem[]>([
    { id: 1, text: "Learn GTK", completed: true },
    { id: 2, text: "Build React renderer", completed: true },
    { id: 3, text: "Create awesome apps", completed: false },
  ]);

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
      title="GTKx Kitchen Sink - Debug"
      defaultWidth={800}
      defaultHeight={600}
      onCloseRequest={() => {
        quit();
        return false;
      }}
    >
      <Box vexpand={true} spacing={10}>
        <Label.Root label="🧪 Testing Section 8: CenterBox Named Slots" />

        <Box spacing={10}>
          <Label.Root label="🎯 Feature 1: Named Child Slots (CenterBox)" />
        </Box>

        <CenterBox.Root>
          <CenterBox.StartWidget>
            <Label.Root label="Left Side" />
          </CenterBox.StartWidget>
          <CenterBox.CenterWidget>
            <Label.Root label={`Counter: ${counter}`} />
          </CenterBox.CenterWidget>
          <CenterBox.EndWidget>
            <Button
              label="Increment"
              onClicked={() => setCounter(counter + 1)}
            />
          </CenterBox.EndWidget>
        </CenterBox.Root>

        <Separator />

        <Box spacing={5}>
          <Label.Root label="📋 Feature 2: ListView with ItemFactory" />
        </Box>

        <Box spacing={10}>
          <Button label="Add Todo" onClicked={handleAddTodo} />
          <Label.Root label={`Total: ${todos.length}`} />
        </Box>

        <ListView.Root
          itemFactory={(item: TodoItem | null) => {
            const label = new Gtk.Label(item ? item.text : "");
            return label;
          }}
        >
          {todos.map((todo) => (
            <ListView.Item item={todo} key={todo.id} />
          ))}
        </ListView.Root>

        <Separator />
      </Box>
    </ApplicationWindow>
  );
}

render(<KitchenSinkDemo />, "com.gtkx.kitchen-sink");
