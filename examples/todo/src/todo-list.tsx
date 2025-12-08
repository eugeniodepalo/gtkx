import { Orientation } from "@gtkx/ffi/gtk";
import { Box, Label } from "@gtkx/react";
import { TodoItem } from "./todo-item.js";
import type { Todo } from "./types.js";

interface TodoListProps {
    todos: Todo[];
    onToggle: (id: number) => void;
    onDelete: (id: number) => void;
}

export const TodoList = ({ todos, onToggle, onDelete }: TodoListProps) => {
    if (todos.length === 0) {
        return <Label.Root label="No todos to display" name="empty-message" />;
    }

    return (
        <Box orientation={Orientation.VERTICAL} spacing={4} name="todo-list">
            {todos.map((todo) => (
                <TodoItem key={todo.id} todo={todo} onToggle={onToggle} onDelete={onDelete} />
            ))}
        </Box>
    );
};
