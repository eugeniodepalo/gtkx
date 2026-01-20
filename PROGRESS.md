# GTK Demo Comparison Progress

This document tracks the progress of comparing gtkx demos with the official GTK4 demos.

## Status Legend
- [ ] Not started
- [~] In progress
- [x] Reviewed (findings documented)

## Advanced
- [x] markup.tsx ↔ markup.c (🟠 Major - add editable source)

## Benchmark
- [x] frames.tsx ↔ frames.c (🟠 Major - frame clock timing)
- [x] themes.tsx ↔ themes.c (🟠 Major - visual demo content)

## Buttons
- [x] expander.tsx ↔ expander.c (🟢 Trivial - matches)
- [x] scale.tsx ↔ scale.c (🟢 Trivial - matches)
- [x] spinbutton.tsx ↔ spinbutton.c (🟠 Major - input validation)

## Constraints
- [x] constraints-vfl.tsx ↔ constraints_vfl.c (🟠 Major - extra live editor)

## CSS
- [x] css-accordion.tsx ↔ css_accordion.c (🟠 Major - different approach)
- [x] css-blendmodes.tsx ↔ css_blendmodes.c (🟠 Major - no visual demo)
- [x] css-multiplebgs.tsx ↔ css_multiplebgs.c (🟡 Minor)
- [x] css-pixbufs.tsx ↔ css_pixbufs.c (🟡 Minor - misleading title)
- [x] css-shadows.tsx ↔ css_shadows.c (🟡 Minor)
- [x] errorstates.tsx ↔ errorstates.c (🟠 Major - enhanced)
- [x] theming-style-classes.tsx ↔ theming_style_classes.c (🟠 Major - enhanced)

## Dialogs
- [x] pickers.tsx ↔ pickers.c (🟡 Minor - missing drag-drop)
- [x] printing.tsx ↔ printing.c (🟠 Major - hardcoded text)

## Drawing
- [x] drawingarea.tsx ↔ drawingarea.c (🟡 Minor)
- [x] image-scaling.tsx ↔ image_scaling.c (gtkx enhancement)
- [x] images.tsx ↔ images.c (🟠 Major - missing features)
- [x] paint.tsx ↔ paint.c (🟠 Major - missing tablet features)
- [x] paintable.tsx ↔ paintable.c (🟡 Minor)
- [x] paintable-animated.tsx ↔ paintable_animated.c (improved)
- [x] paintable-svg.tsx ↔ paintable_svg.c (🟡 Minor)

## Games
- [x] sliding-puzzle.tsx ↔ sliding_puzzle.c (🟡 Major - multi-tile, keyboard)

## Gestures
- [x] clipboard.tsx ↔ clipboard.c (🟡 Minor - different organization)
- [x] cursors.tsx ↔ cursors.c (🟠 Major - missing custom cursor)
- [x] links.tsx ↔ links.c (🟡 Minor - different organization)
- [x] shortcuts.tsx ↔ shortcuts.c (🟠 Major - uses AdwShortcutsDialog)

## Input
- [x] entry-undo.tsx ↔ entry_undo.c (🟡 Minor)
- [x] password-entry.tsx ↔ password_entry.c (🟠 Major - header bar)
- [x] search-entry.tsx ↔ search_entry.c (🟠 Major - header bar)
- [x] tabs.tsx ↔ tabs.c (🟡 Minor)
- [x] textscroll.tsx ↔ textscroll.c (🟡 Minor)
- [x] textundo.tsx ↔ textundo.c (🟡 Minor)
- [x] textview.tsx ↔ textview.c (🟠 Major - features, i18n)

## Layout
- [x] fixed2.tsx ↔ fixed2.c (🟠 Major - timing, window size)
- [x] flowbox.tsx ↔ flowbox.c (🟠 Major - dataset size)
- [x] overlay.tsx ↔ overlay.c (🟡 Minor - spacing)
- [x] sizegroup.tsx ↔ sizegroup.c (🟡 Minor - baseline alignment)

## Lists
- [x] listbox.tsx ↔ listbox.c (🟠 Major - sort function)
- [x] listbox-controls.tsx ↔ listbox_controls.c (🟠 Major - rich-list)
- [x] listview-applauncher.tsx ↔ listview_applauncher.c (🟠 Major - GridView)
- [x] listview-filebrowser.tsx ↔ listview_filebrowser.c (🟠 Major - polling)
- [x] listview-selections.tsx ↔ listview_selections.c (🟠 Major - suggestion)
- [x] listview-settings.tsx ↔ listview_settings.c (🟠 Major - tree model)
- [x] listview-settings2.tsx ↔ listview_settings2.c (🟠 Major - column view)
- [x] listview-ucd.tsx ↔ listview_ucd.c (🟠 Major - full Unicode)
- [x] listview-weather.tsx ↔ listview_weather.c (🟠 Major - hourly)
- [x] listview-words.tsx ↔ listview_words.c (🟡 Minor)

## Media
- [x] video-player.tsx ↔ video_player.c (🟠 Major - enhanced UI)

## Navigation
- [x] revealer.tsx ↔ revealer.c (🟠 Major - animation timing)

## OpenGL
- [x] shadertoy.tsx ↔ shadertoy.c (gtkx extension)

## Paths
- [x] path-explorer.tsx ↔ path_explorer_demo.c (🟠 Major - Cairo vs GSK)
- [x] path-fill.tsx ↔ path_fill.c (🟠 Major - Cairo vs GSK)
- [x] path-spinner.tsx ↔ path_spinner.c (🟠 Major - Cairo vs GSK)
- [x] path-text.tsx ↔ path_text.c (🟠 Major - manual Bezier)
- [x] path-walk.tsx ↔ path_walk.c (🟠 Major - lookup table)

---

## Removed Demos (require GObject subclassing)
The following demos were removed because they require custom GObject subclasses that cannot be implemented in GTKX:
- fishbowl.tsx - requires custom GtkFishbowl widget
- image-filtering.tsx - requires custom GtkFilterPaintable
- paintable-emblem.tsx - requires custom DemoIcon GdkPaintable
- paintable-mediastream.tsx - requires custom GtkNuclearMediaStream
- paintable-symbolic.tsx - requires custom GtkNuclearSymbolic
- read-more.tsx - requires custom ReadMore widget
- tagged-entry.tsx - requires custom DemoTaggedEntry widget
- layoutmanager.tsx - requires custom DemoLayout manager
- layoutmanager2.tsx - requires custom Demo2Layout manager
- listview-clocks.tsx - requires custom GtkClock GdkPaintable

## Summary
- Total demos: 77 (10 removed - require GObject subclassing)
- Remaining to address: 49
- Major issues: 30
- Minor issues: 19
