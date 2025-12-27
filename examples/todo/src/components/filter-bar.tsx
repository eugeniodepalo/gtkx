import * as Gtk from "@gtkx/ffi/gtk";
import { GtkBox, GtkToggleButton } from "@gtkx/react";
import type { Filter } from "../types.js";

interface FilterBarProps {
    filter: Filter;
    onFilterChange: (filter: Filter) => void;
}

export const FilterBar = ({ filter, onFilterChange }: FilterBarProps) => {
    return (
        <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={0} halign={Gtk.Align.CENTER} cssClasses={["linked"]}>
            <GtkToggleButton
                label="All"
                active={filter === "all"}
                onClicked={() => onFilterChange("all")}
                name="filter-all"
            />
            <GtkToggleButton
                label="Active"
                active={filter === "active"}
                onClicked={() => onFilterChange("active")}
                name="filter-active"
            />
            <GtkToggleButton
                label="Completed"
                active={filter === "completed"}
                onClicked={() => onFilterChange("completed")}
                name="filter-completed"
            />
        </GtkBox>
    );
};
