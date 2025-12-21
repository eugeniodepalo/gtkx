import * as Gtk from "@gtkx/ffi/gtk";
import { GtkBox, GtkToggleButton } from "@gtkx/react";
import { useCallback } from "react";
import type { Filter } from "./types.js";

type ViewSwitcherProps = {
    filter: Filter;
    onFilterChange: (filter: Filter) => void;
};

export const ViewSwitcher = ({ filter, onFilterChange }: ViewSwitcherProps) => {
    const handleAll = useCallback(() => onFilterChange("all"), [onFilterChange]);
    const handleActive = useCallback(() => onFilterChange("active"), [onFilterChange]);
    const handleCompleted = useCallback(() => onFilterChange("completed"), [onFilterChange]);

    return (
        <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={0} cssClasses={["linked"]} halign={Gtk.Align.CENTER}>
            <GtkToggleButton label="All" active={filter === "all"} onToggled={handleAll} name="filter-all" />
            <GtkToggleButton
                label="Active"
                active={filter === "active"}
                onToggled={handleActive}
                name="filter-active"
            />
            <GtkToggleButton
                label="Completed"
                active={filter === "completed"}
                onToggled={handleCompleted}
                name="filter-completed"
            />
        </GtkBox>
    );
};
