/**
 * Shared widget fakes used across the `mcp/*` test files.
 *
 * Internal test helper — not part of any package export — kept here so the
 * handler and registry tests share a single source of truth for the
 * minimal GTK widget surface they exercise.
 */

export type FakeWidgetOverrides = {
    type?: string;
    getFirstChild?: () => unknown;
    getNextSibling?: () => unknown;
    getAccessibleRole?: () => number | undefined;
    getName?: () => string | null;
    getSensitive?: () => boolean;
    getVisible?: () => boolean;
    getCssClasses?: () => string[];
    getLabel?: () => string | null;
    getText?: () => string | null;
    getTitle?: () => string | null;
};

const DEFAULTS = {
    getFirstChild: () => null,
    getNextSibling: () => null,
    getAccessibleRole: () => 1,
    getName: () => null,
    getSensitive: () => true,
    getVisible: () => true,
    getCssClasses: () => [],
};

/**
 * Returns a fake widget with overridable getters. The result is typed as
 * `never` so call sites can pass it to `WidgetRegistry` / `dispatch` —
 * which expect `Gtk.Widget` — without TypeScript fighting the test fakes.
 */
export const makeFakeWidget = (overrides: FakeWidgetOverrides = {}): never => {
    const { type = "GtkWidget", ...rest } = overrides;
    return {
        constructor: { name: type },
        ...DEFAULTS,
        ...rest,
    } as never;
};
