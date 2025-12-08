import { Orientation } from "@gtkx/ffi/gtk";
import { Box, Button, CheckButton, Label } from "@gtkx/react";
import type { Todo } from "./types.js";

interface TodoItemProps {
    todo: Todo;
    onToggle: (id: number) => void;
    onDelete: (id: number) => void;
}

export const TodoItem = ({ todo, onToggle, onDelete }: TodoItemProps) => {
    return (
        <Box orientation={Orientation.HORIZONTAL} spacing={8} name={`todo-${todo.id}`}>
            <CheckButton.Root active={todo.completed} onToggled={() => onToggle(todo.id)} name={`toggle-${todo.id}`} />
            <Label.Root label={todo.text} hexpand={true} xalign={0} name={`text-${todo.id}`} />
            <Button label="Delete" onClicked={() => onDelete(todo.id)} name={`delete-${todo.id}`} />
        </Box>
    );
};
