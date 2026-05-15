/**
 * Code generation config for the gtkx monorepo itself.
 *
 * Consumed by `gtkx codegen` (run via the `@gtkx/ffi` postinstall script).
 * Plain object rather than `defineConfig(...)` so loading it never depends on
 * `@gtkx/cli` being built; `loadGtkxConfig` validates it regardless.
 */
export default {
    libraries: ["Gtk-4.0", "Adw-1", "GtkSource-5", "WebKit-6.0"],
};
