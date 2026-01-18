import * as Gtk from "@gtkx/ffi/gtk";
import { registerNodeClass } from "../registry.js";
import type { Container, ContainerClass, Props } from "../types.js";
import { filterProps, matchesAnyClass, primitiveArrayEqual } from "./internal/utils.js";
import { WidgetNode } from "./widget.js";

type CalendarProps = Props & {
    markedDays?: number[] | null;
};

const OWN_PROPS = ["markedDays"] as const;

class CalendarNode extends WidgetNode<Gtk.Calendar> {
    public static override priority = 1;

    private appliedMarks: number[] = [];

    public static override matches(_type: string, containerOrClass?: Container | ContainerClass | null): boolean {
        return matchesAnyClass([Gtk.Calendar], containerOrClass);
    }

    public override updateProps(oldProps: CalendarProps | null, newProps: CalendarProps): void {
        super.updateProps(
            oldProps ? (filterProps(oldProps, OWN_PROPS) as CalendarProps) : null,
            filterProps(newProps, OWN_PROPS) as CalendarProps,
        );
        this.applyOwnProps(oldProps, newProps);
    }

    protected applyOwnProps(_oldProps: CalendarProps | null, newProps: CalendarProps): void {
        this.applyMarkedDays(newProps);
    }

    private applyMarkedDays(newProps: CalendarProps): void {
        const newMarkedDays = newProps.markedDays ?? [];

        if (primitiveArrayEqual(this.appliedMarks, newMarkedDays)) {
            return;
        }

        this.container.clearMarks();

        for (const day of newMarkedDays) {
            this.container.markDay(day);
        }

        this.appliedMarks = [...newMarkedDays];
    }
}

registerNodeClass(CalendarNode);
