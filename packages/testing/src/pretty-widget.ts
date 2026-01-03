import * as Gtk from "@gtkx/ffi/gtk";
import { getWidgetText } from "./queries.js";
import { type Container, isApplication } from "./traversal.js";

const DEFAULT_MAX_LENGTH = 7000;
const INDENT = "  ";

export type PrettyWidgetOptions = {
    maxLength?: number;
    highlight?: boolean;
};

type HighlightColors = {
    tag: (s: string) => string;
    attr: (s: string) => string;
    value: (s: string) => string;
    text: (s: string) => string;
    reset: string;
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
        return { tag: identity, attr: identity, value: identity, text: identity, reset: "" };
    }
    return {
        tag: (s) => `${ansi.cyan}${s}${ansi.reset}`,
        attr: (s) => `${ansi.yellow}${s}${ansi.reset}`,
        value: (s) => `${ansi.green}${s}${ansi.reset}`,
        text: (s) => s,
        reset: ansi.reset,
    };
};

const formatRole = (role: Gtk.AccessibleRole | undefined): string => {
    if (role === undefined) return "unknown";
    const name = Gtk.AccessibleRole[role];
    if (!name) return String(role);
    return name.toLowerCase();
};

const formatTagName = (widget: Gtk.Widget): string => {
    return widget.constructor.name;
};

const escapeAttrValue = (value: string): string => {
    return value.replace(/"/g, "&quot;");
};

const formatAttributes = (widget: Gtk.Widget, colors: HighlightColors): string => {
    const attrs: [string, string][] = [];

    const name = widget.getName();
    if (name) {
        attrs.push(["data-testid", name]);
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

    if (attrs.length === 0) return "";

    return attrs
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => ` ${colors.attr(key)}=${colors.value(`"${escapeAttrValue(value)}"`)}`)
        .join("");
};

const hasChildren = (widget: Gtk.Widget): boolean => {
    return widget.getFirstChild() !== null;
};

const printWidget = (widget: Gtk.Widget, colors: HighlightColors, depth: number): string => {
    const indent = INDENT.repeat(depth);
    const tagName = formatTagName(widget);
    const attributes = formatAttributes(widget, colors);
    const text = getWidgetText(widget);
    const children: string[] = [];

    let child = widget.getFirstChild();
    while (child) {
        children.push(printWidget(child, colors, depth + 1));
        child = child.getNextSibling();
    }

    const openTag = `${colors.tag("<")}${colors.tag(tagName)}${attributes}${colors.tag(">")}`;

    if (!hasChildren(widget) && !text) {
        return `${indent}${openTag}\n`;
    }

    const closeTag = `${colors.tag("</")}${colors.tag(tagName)}${colors.tag(">")}`;

    if (text && !hasChildren(widget)) {
        const textContent = colors.text(text);
        return `${indent}${openTag}\n${indent}${INDENT}${textContent}\n${indent}${closeTag}\n`;
    }

    let result = `${indent}${openTag}\n`;
    if (text) {
        result += `${indent}${INDENT}${colors.text(text)}\n`;
    }
    for (const childOutput of children) {
        result += childOutput;
    }
    result += `${indent}${closeTag}\n`;

    return result;
};

const printContainer = (container: Container, colors: HighlightColors): string => {
    if (isApplication(container)) {
        const windows = container.getWindows();
        return windows.map((window) => printWidget(window, colors, 0)).join("");
    }
    return printWidget(container, colors, 0);
};

export const prettyWidget = (container: Container, options: PrettyWidgetOptions = {}): string => {
    const envLimit = process.env.DEBUG_PRINT_LIMIT ? Number(process.env.DEBUG_PRINT_LIMIT) : DEFAULT_MAX_LENGTH;
    const maxLength = options.maxLength ?? envLimit;
    const highlight = options.highlight ?? shouldHighlight();

    if (maxLength === 0) {
        return "";
    }

    const colors = createColors(highlight);
    const output = printContainer(container, colors);

    if (output.length > maxLength) {
        return `${output.slice(0, maxLength)}...`;
    }

    return output.trimEnd();
};

export const logWidget = (container: Container, options: PrettyWidgetOptions = {}): void => {
    console.log(prettyWidget(container, options));
};
