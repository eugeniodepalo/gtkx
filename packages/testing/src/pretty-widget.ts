import * as Gtk from "@gtkx/ffi/gtk";
import { formatRole } from "./role-helpers.js";
import { type Container, isApplication } from "./traversal.js";
import { getWidgetPropertyText } from "./widget-text.js";

const DEFAULT_MAX_LENGTH = 7000;
const INDENT = "  ";

const debugIdMap = new WeakMap<Gtk.Widget, string>();
let nextDebugId = 0;

const getWidgetDebugId = (widget: Gtk.Widget): string => {
    let id = debugIdMap.get(widget);
    if (!id) {
        id = String(nextDebugId++);
        debugIdMap.set(widget, id);
    }
    return id;
};

/**
 * Options for {@link prettyWidget}.
 */
export type PrettyWidgetOptions = {
    /** Maximum output length before truncation (default: 7000) */
    maxLength?: number;
    /** Enable ANSI color highlighting (default: auto-detect) */
    highlight?: boolean;
    /** Include widget IDs for MCP/agentic interactions (default: false) */
    includeIds?: boolean;
};

/**
 * A single widget visited during traversal, decoupled from any output format.
 */
export type WidgetNode = {
    widget: Gtk.Widget;
    tag: string;
    attrs: ReadonlyArray<readonly [string, string]>;
    depth: number;
    hasChildren: boolean;
};

/**
 * Events emitted by {@link iterateWidgets} in pre-order. `text` is emitted between
 * `open` and the first child (or `close` for leaf nodes with text content).
 */
export type WidgetEvent =
    | { readonly kind: "open"; readonly node: WidgetNode }
    | { readonly kind: "close"; readonly node: WidgetNode }
    | { readonly kind: "text"; readonly node: WidgetNode; readonly text: string };

/**
 * A pluggable formatter mapping each {@link WidgetEvent} to its serialized string.
 */
export type WidgetSerializer = (event: WidgetEvent) => string;

const buildAttrs = (widget: Gtk.Widget, includeIds: boolean): ReadonlyArray<readonly [string, string]> => {
    const attrs: [string, string][] = [];

    if (includeIds) {
        attrs.push(["id", getWidgetDebugId(widget)]);
    }

    const name = widget.getName();
    if (name) {
        attrs.push(["name", name]);
    }

    const role = widget.getAccessibleRole();
    if (role !== undefined) {
        attrs.push(["role", formatRole(role)]);
    }

    if (!widget.getSensitive()) {
        attrs.push(["aria-disabled", "true"]);
    }

    if (!widget.getVisible()) {
        attrs.push(["aria-hidden", "true"]);
    }

    return attrs.toSorted(([a], [b]) => {
        if (a === "id") return -1;
        if (b === "id") return 1;
        return a.localeCompare(b);
    });
};

const buildNode = (widget: Gtk.Widget, depth: number, includeIds: boolean): WidgetNode => ({
    widget,
    tag: widget.constructor.name,
    attrs: buildAttrs(widget, includeIds),
    depth,
    hasChildren: widget.getFirstChild() !== null,
});

function* iterateWidget(widget: Gtk.Widget, depth: number, includeIds: boolean): Generator<WidgetEvent> {
    const node = buildNode(widget, depth, includeIds);
    yield { kind: "open", node };

    const text = getWidgetPropertyText(widget);
    if (text) {
        yield { kind: "text", node, text };
    }

    let child = widget.getFirstChild();
    while (child) {
        yield* iterateWidget(child, depth + 1, includeIds);
        child = child.getNextSibling();
    }

    yield { kind: "close", node };
}

/**
 * Walks `container` in pre-order, emitting one {@link WidgetEvent} per visit.
 *
 * Iterates every toplevel `Gtk.Window` when given a `Gtk.Application`.
 */
export function* iterateWidgets(container: Container, options?: { includeIds?: boolean }): Generator<WidgetEvent> {
    const includeIds = options?.includeIds ?? false;

    if (isApplication(container)) {
        for (const window of Gtk.Window.listToplevels()) {
            yield* iterateWidget(window, 0, includeIds);
        }
        return;
    }

    yield* iterateWidget(container, 0, includeIds);
}

type HighlightColors = {
    tag: (s: string) => string;
    attr: (s: string) => string;
    value: (s: string) => string;
    text: (s: string) => string;
};

const shouldHighlight = (): boolean => {
    if (typeof process === "undefined") return false;
    if (process.env.COLORS === "false" || process.env.NO_COLOR) return false;
    if (process.env.COLORS === "true" || process.env.FORCE_COLOR) return true;
    return process.stdout?.isTTY ?? false;
};

const ansi = {
    cyan: "\x1b[36m",
    yellow: "\x1b[33m",
    green: "\x1b[32m",
    reset: "\x1b[0m",
};

const createColors = (enabled: boolean): HighlightColors => {
    if (!enabled) {
        const identity = (s: string): string => s;
        return { tag: identity, attr: identity, value: identity, text: identity };
    }
    return {
        tag: (s) => `${ansi.cyan}${s}${ansi.reset}`,
        attr: (s) => `${ansi.yellow}${s}${ansi.reset}`,
        value: (s) => `${ansi.green}${s}${ansi.reset}`,
        text: (s) => s,
    };
};

const escapeAttrValue = (value: string): string => value.replaceAll('"', "&quot;");

const formatAttrs = (attrs: ReadonlyArray<readonly [string, string]>, colors: HighlightColors): string =>
    attrs.map(([key, value]) => ` ${colors.attr(key)}=${colors.value(`"${escapeAttrValue(value)}"`)}`).join("");

/**
 * Creates an HTML-style serializer with optional ANSI coloring.
 *
 * Emits `<Tag attr="value">\n` for `open`, indented text for `text`, and
 * `</Tag>\n` for `close`. Self-closes leaf nodes that have neither text nor
 * children.
 */
export const createAnsiSerializer = (highlight: boolean): WidgetSerializer => {
    const colors = createColors(highlight);
    const openTagPending = new WeakMap<WidgetNode, true>();

    return (event: WidgetEvent): string => {
        const { node } = event;
        const indent = INDENT.repeat(node.depth);
        const attrs = formatAttrs(node.attrs, colors);
        const openTag = `${colors.tag("<")}${colors.tag(node.tag)}${attrs}${colors.tag(">")}`;
        const closeTag = `${colors.tag("</")}${colors.tag(node.tag)}${colors.tag(">")}`;

        switch (event.kind) {
            case "open":
                openTagPending.set(node, true);
                return `${indent}${openTag}\n`;
            case "text":
                openTagPending.delete(node);
                return `${indent}${INDENT}${colors.text(event.text)}\n`;
            case "close":
                if (!node.hasChildren && openTagPending.get(node)) {
                    openTagPending.delete(node);
                    return "";
                }
                openTagPending.delete(node);
                return `${indent}${closeTag}\n`;
        }
    };
};

/**
 * Formats a widget tree as a readable string for debugging.
 *
 * Renders the widget hierarchy in an HTML-like format with accessibility
 * attributes like role, name, and text content. The default ANSI serializer
 * can be replaced via {@link iterateWidgets} when you need a different format
 * (JSON, YAML, plain markdown).
 *
 * @param container - The container widget or application to format
 * @param options - Formatting options for length and highlighting
 * @returns Formatted string representation of the widget tree
 *
 * @example
 * ```tsx
 * import { prettyWidget } from "@gtkx/testing";
 *
 * console.log(prettyWidget(application));
 * // Output:
 * // <GtkApplicationWindow role="window">
 * //   <GtkButton role="button">
 * //     Click me
 * //   </GtkButton>
 * // </GtkApplicationWindow>
 * ```
 */
export const prettyWidget = (container: Container, options: PrettyWidgetOptions = {}): string => {
    const envLimit = process.env.DEBUG_PRINT_LIMIT ? Number(process.env.DEBUG_PRINT_LIMIT) : DEFAULT_MAX_LENGTH;
    const maxLength = options.maxLength ?? envLimit;

    if (maxLength === 0) {
        return "";
    }

    const highlight = options.highlight ?? shouldHighlight();
    const includeIds = options.includeIds ?? false;
    const serialize = createAnsiSerializer(highlight);

    let output = "";
    for (const event of iterateWidgets(container, { includeIds })) {
        output += serialize(event);
    }

    if (output.length > maxLength) {
        return `${output.slice(0, maxLength)}...`;
    }

    return output.trimEnd();
};
