# @gtkx/gtkx

Top-level developer API for GTKx and future home of the React reconciler.

## Goals

- Provide a stable, ergonomic API for building GTK4 apps from JS/TS
- Eventually export `render(jsx, appOptions)` that drives a custom React renderer
- Wrap the `@gtkx/bridge` surface with higher-level components and patterns

## Today

- Placeholder package depending on `@gtkx/native`
- Will consolidate public API once the bridge surface is generated from GIR

## Roadmap

- Custom React reconciler that renders GTK widgets
- JSX components for widgets and layout
- Signal/props mapping, lifecycle, and diffing
