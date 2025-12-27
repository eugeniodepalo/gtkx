import * as Gtk from "@gtkx/ffi/gtk";
import { ActionRow, AdwActionRow, GtkButton, GtkCheckButton } from "@gtkx/react";
import type { Todo } from "../types.js";

interface TodoRowProps {
    todo: Todo;
    onToggle: (id: number) => void;
    onDelete: (id: number) => void;
}

export const TodoRow = ({ todo, onToggle, onDelete }: TodoRowProps) => {
    return (
        <AdwActionRow title={todo.text} name={`todo-${todo.id}`} cssClasses={todo.completed ? ["dim-label"] : []}>
            <ActionRow.Prefix>
                <GtkCheckButton
                    active={todo.completed}
                    onToggled={() => onToggle(todo.id)}
                    name={`toggle-${todo.id}`}
                    valign={Gtk.Align.CENTER}
                />
            </ActionRow.Prefix>
            <ActionRow.Suffix>
                <GtkButton
                    iconName="edit-delete-symbolic"
                    tooltipText="Delete task"
                    cssClasses={["flat", "circular"]}
                    onClicked={() => onDelete(todo.id)}
                    name={`delete-${todo.id}`}
                    valign={Gtk.Align.CENTER}
                />
            </ActionRow.Suffix>
        </AdwActionRow>
    );
};
