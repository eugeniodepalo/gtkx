import { useCallback, useMemo, useState } from "react";
import type { Filter, Todo } from "../types.js";

let nextId = 1;

export const useTodos = () => {
    const [todos, setTodos] = useState<Todo[]>([]);
    const [filter, setFilter] = useState<Filter>("all");

    const addTodo = useCallback((text: string) => {
        if (!text.trim()) return;
        setTodos((prev) => [...prev, { id: nextId++, text: text.trim(), completed: false }]);
    }, []);

    const toggleTodo = useCallback((id: number) => {
        setTodos((prev) => prev.map((todo) => (todo.id === id ? { ...todo, completed: !todo.completed } : todo)));
    }, []);

    const deleteTodo = useCallback((id: number) => {
        setTodos((prev) => prev.filter((todo) => todo.id !== id));
    }, []);

    const clearCompleted = useCallback(() => {
        setTodos((prev) => prev.filter((todo) => !todo.completed));
    }, []);

    const filteredTodos = useMemo(() => {
        switch (filter) {
            case "active":
                return todos.filter((t) => !t.completed);
            case "completed":
                return todos.filter((t) => t.completed);
            default:
                return todos;
        }
    }, [todos, filter]);

    const activeCount = useMemo(() => todos.filter((t) => !t.completed).length, [todos]);
    const completedCount = useMemo(() => todos.filter((t) => t.completed).length, [todos]);

    return {
        todos,
        filter,
        filteredTodos,
        addTodo,
        toggleTodo,
        deleteTodo,
        clearCompleted,
        setFilter,
        activeCount,
        completedCount,
    };
};
