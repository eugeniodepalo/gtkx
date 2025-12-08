import { Orientation } from "@gtkx/ffi/gtk";
import { Box, Button, Label } from "@gtkx/react";
import type { Filter } from "./types.js";

interface TodoFiltersProps {
    filter: Filter;
    onFilterChange: (filter: Filter) => void;
    activeCount: number;
    completedCount: number;
    onClearCompleted: () => void;
}

export const TodoFilters = ({
    filter,
    onFilterChange,
    activeCount,
    completedCount,
    onClearCompleted,
}: TodoFiltersProps) => {
    const itemText = activeCount === 1 ? "item" : "items";

    return (
        <Box orientation={Orientation.HORIZONTAL} spacing={8}>
            <Label.Root label={`${activeCount} ${itemText} left`} name="items-left" />
            <Box orientation={Orientation.HORIZONTAL} spacing={4} hexpand={true} halign={3}>
                <Button
                    label="All"
                    onClicked={() => onFilterChange("all")}
                    sensitive={filter !== "all"}
                    name="filter-all"
                />
                <Button
                    label="Active"
                    onClicked={() => onFilterChange("active")}
                    sensitive={filter !== "active"}
                    name="filter-active"
                />
                <Button
                    label="Completed"
                    onClicked={() => onFilterChange("completed")}
                    sensitive={filter !== "completed"}
                    name="filter-completed"
                />
            </Box>
            <Button
                label="Clear completed"
                onClicked={onClearCompleted}
                sensitive={completedCount > 0}
                name="clear-completed"
            />
        </Box>
    );
};
