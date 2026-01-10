import * as Adw from "@gtkx/ffi/adw";
import type { Node } from "../node.js";
import { registerNodeClass } from "../registry.js";
import { scheduleAfterCommit } from "../scheduler.js";
import type { Container, ContainerClass, Props } from "../types.js";
import { filterProps, isContainerType } from "./internal/utils.js";
import { NavigationPageNode } from "./navigation-page.js";
import { SlotNode } from "./slot.js";
import { WidgetNode } from "./widget.js";

const CUSTOM_PROPS = ["history"];

type NavigationViewProps = Props & {
    history?: string[] | null;
};

class NavigationViewNode extends WidgetNode<Adw.NavigationView, NavigationViewProps> {
    public static override priority = 1;

    public static override matches(_type: string, containerOrClass?: Container | ContainerClass | null): boolean {
        return isContainerType(Adw.NavigationView, containerOrClass);
    }

    public override appendChild(child: Node): void {
        if (child instanceof NavigationPageNode) {
            child.setParent(this.container);
            return;
        }

        if (child instanceof SlotNode || child instanceof WidgetNode) {
            super.appendChild(child);
            return;
        }

        throw new Error(`Cannot append '${child.typeName}' to 'NavigationView': expected x.NavigationPage or Widget`);
    }

    public override insertBefore(child: Node, before: Node): void {
        if (child instanceof NavigationPageNode) {
            child.setParent(this.container);
            return;
        }

        if (child instanceof SlotNode || child instanceof WidgetNode) {
            super.insertBefore(child, before);
            return;
        }

        throw new Error(`Cannot insert '${child.typeName}' into 'NavigationView': expected x.NavigationPage or Widget`);
    }

    public override removeChild(child: Node): void {
        if (child instanceof NavigationPageNode) {
            return;
        }

        if (child instanceof SlotNode || child instanceof WidgetNode) {
            super.removeChild(child);
            return;
        }

        throw new Error(`Cannot remove '${child.typeName}' from 'NavigationView': expected x.NavigationPage or Widget`);
    }

    public override updateProps(oldProps: NavigationViewProps | null, newProps: NavigationViewProps): void {
        const oldHistory = oldProps?.history;
        const newHistory = newProps.history;

        if (newHistory && !this.arraysEqual(oldHistory, newHistory)) {
            this.syncHistory(newHistory);
        }

        super.updateProps(
            filterProps(oldProps ?? {}, CUSTOM_PROPS),
            filterProps(newProps, CUSTOM_PROPS) as NavigationViewProps,
        );
    }

    private syncHistory(history: string[]): void {
        const container = this.container;

        scheduleAfterCommit(() => {
            container.replaceWithTags(history, history.length);
        });
    }

    private arraysEqual(a: string[] | null | undefined, b: string[] | null | undefined): boolean {
        if (a === b) return true;
        if (!a || !b) return false;
        if (a.length !== b.length) return false;

        for (let i = 0; i < a.length; i++) {
            if (a[i] !== b[i]) return false;
        }

        return true;
    }
}

registerNodeClass(NavigationViewNode);
