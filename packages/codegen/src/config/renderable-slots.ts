/**
 * Slots that represent renderable child content (typed as ReactNode).
 *
 * Slot props NOT in this map stay as raw GTK widget types (for widget
 * references like group, stack, view, keyCaptureWidget, etc.).
 *
 * Keys are JSX names (e.g., "GtkWindow"), values are camelCase slot prop names.
 */
const RENDERABLE_SLOTS: Readonly<Record<string, readonly string[]>> = {
    GtkWindow: ["titlebar"],
    AdwWindow: ["content"],
    AdwApplicationWindow: ["content"],
    AdwAlertDialog: ["extraChild"],
    AdwBottomSheet: ["bottomBar", "content", "sheet"],
    GtkCenterBox: ["centerWidget", "endWidget", "startWidget"],
    GtkExpander: ["labelWidget"],
    AdwFlap: ["content", "flap", "separator"],
    GtkFrame: ["labelWidget"],
    GtkHeaderBar: ["titleWidget"],
    AdwHeaderBar: ["titleWidget"],
    GtkMenuButton: ["popover"],
    AdwMessageDialog: ["extraChild"],
    AdwNavigationSplitView: ["content", "sidebar"],
    AdwOverlaySplitView: ["content", "sidebar"],
    GtkPaned: ["endChild", "startChild"],
    AdwPreferencesGroup: ["headerSuffix"],
    AdwPreferencesPage: ["banner"],
    AdwSplitButton: ["popover"],
    AdwTabBar: ["endActionWidget", "startActionWidget"],
    AdwToolbarView: ["content"],
};

export const getRenderableSlotNames = (jsxName: string): ReadonlySet<string> => {
    const slots = RENDERABLE_SLOTS[jsxName];
    return slots ? new Set(slots) : new Set();
};
