# GTK Demo Comparison Progress

This document tracks the progress of comparing gtkx demos with the official GTK4 demos.

## Status Legend
- [ ] Not started
- [~] In progress
- [x] Reviewed (findings documented)
- [✓] Fully matched (no changes needed or fixes applied)

## Advanced
- [✓] font-features.tsx ↔ font_features.c (FIXED - full feature parity)
- [x] fontrendering.tsx ↔ fontrendering.c (🔴 Critical - missing glyph inspection)
- [x] markup.tsx ↔ markup.c (🟠 Major - add editable source)
- [x] rotated-text.tsx ↔ rotated_text.c (🔴 Critical - different visual)
- [✓] textmask.tsx ↔ textmask.c (gtkx superset)
- [x] transparent.tsx ↔ transparent.c (🔴 Critical - missing backdrop blur)

## Benchmark
- [x] fishbowl.tsx ↔ fishbowl.c (🔴 Critical - complete reimplementation)
- [x] frames.tsx ↔ frames.c (🟠 Major - frame clock timing)
- [x] themes.tsx ↔ themes.c (🟠 Major - visual demo content)

## Buttons
- [x] expander.tsx ↔ expander.c (🟢 Trivial - matches)
- [x] scale.tsx ↔ scale.c (🟢 Trivial - matches)
- [x] spinbutton.tsx ↔ spinbutton.c (🟠 Major - input validation)
- [✓] spinner.tsx ↔ spinner.c (matches well)

## Constraints
- [✓] constraints.tsx ↔ constraints.c (matches)
- [✓] constraints-interactive.tsx ↔ constraints_interactive.c (matches)
- [x] constraints-vfl.tsx ↔ constraints_vfl.c (🟠 Major - extra live editor)

## CSS
- [x] css-accordion.tsx ↔ css_accordion.c (🟠 Major - different approach)
- [✓] css-basics.tsx ↔ css_basics.c (matches)
- [x] css-blendmodes.tsx ↔ css_blendmodes.c (🟠 Major - no visual demo)
- [x] css-multiplebgs.tsx ↔ css_multiplebgs.c (🟡 Minor)
- [x] css-pixbufs.tsx ↔ css_pixbufs.c (🟡 Minor - misleading title)
- [x] css-shadows.tsx ↔ css_shadows.c (🟡 Minor)
- [x] errorstates.tsx ↔ errorstates.c (🟠 Major - enhanced)
- [x] theming-style-classes.tsx ↔ theming_style_classes.c (🟠 Major - enhanced)

## Dialogs
- [x] dialog.tsx ↔ dialog.c (🔴 Critical - missing interactive dialog)
- [✓] pagesetup.tsx ↔ pagesetup.c (uses modern GTK4 API)
- [x] pickers.tsx ↔ pickers.c (🟡 Minor - missing drag-drop)
- [x] printing.tsx ↔ printing.c (🟠 Major - hardcoded text)

## Drawing
- [x] drawingarea.tsx ↔ drawingarea.c (🟡 Minor)
- [x] image-filtering.tsx ↔ image_filtering.c (🔴 Critical - CSS vs GSK)
- [x] image-scaling.tsx ↔ image_scaling.c (gtkx enhancement)
- [x] images.tsx ↔ images.c (🟠 Major - missing features)
- [✓] mask.tsx ↔ mask.c (matches)
- [x] paint.tsx ↔ paint.c (🟠 Major - missing tablet features)
- [x] paintable.tsx ↔ paintable.c (🟡 Minor)
- [x] paintable-animated.tsx ↔ paintable_animated.c (improved)
- [x] paintable-emblem.tsx ↔ paintable_emblem.c (🟠 Major - architecture)
- [x] paintable-mediastream.tsx ↔ paintable_mediastream.c (🟠 Major)
- [x] paintable-svg.tsx ↔ paintable_svg.c (🟡 Minor)
- [x] paintable-symbolic.tsx ↔ paintable_symbolic.c (🟡 Minor)

## Games
- [x] listview-minesweeper.tsx ↔ listview_minesweeper.c (🔴 Critical - flood-fill)
- [x] peg-solitaire.tsx ↔ peg_solitaire.c (🔴 Critical - drag-drop)
- [x] sliding-puzzle.tsx ↔ sliding_puzzle.c (🟡 Major - multi-tile, keyboard)

## Gestures
- [x] clipboard.tsx ↔ clipboard.c (🟡 Minor - different organization)
- [x] cursors.tsx ↔ cursors.c (🟠 Major - missing custom cursor)
- [x] dnd.tsx ↔ dnd.c (🔴 Critical - missing rotation, menus)
- [x] gestures.tsx ↔ gestures.c (🔴 Critical - too elaborate)
- [x] links.tsx ↔ links.c (🟡 Minor - different organization)
- [x] shortcuts.tsx ↔ shortcuts.c (🟠 Major - uses AdwShortcutsDialog)
- [✓] shortcut-triggers.tsx ↔ shortcut_triggers.c (gtkx superset)

## Input
- [x] entry-undo.tsx ↔ entry_undo.c (🟡 Minor)
- [x] hypertext.tsx ↔ hypertext.c (🔴 Critical - pages, widgets)
- [x] password-entry.tsx ↔ password_entry.c (🟠 Major - header bar)
- [x] read-more.tsx ↔ read_more.c (🔴 Critical - custom widget)
- [x] search-entry.tsx ↔ search_entry.c (🟠 Major - header bar)
- [x] tabs.tsx ↔ tabs.c (🟡 Minor)
- [x] tagged-entry.tsx ↔ tagged_entry.c (🔴 Critical - custom widget)
- [x] textscroll.tsx ↔ textscroll.c (🟡 Minor)
- [x] textundo.tsx ↔ textundo.c (🟡 Minor)
- [x] textview.tsx ↔ textview.c (🟠 Major - features, i18n)

## Layout
- [x] aspect-frame.tsx ↔ aspect_frame.c (🔴 Critical - missing GtkPicture)
- [✓] fixed.tsx ↔ fixed.c (matches well)
- [x] fixed2.tsx ↔ fixed2.c (🟠 Major - timing, window size)
- [x] flowbox.tsx ↔ flowbox.c (🟠 Major - dataset size)
- [x] headerbar.tsx ↔ headerbar.c (🔴 Critical - titlebar integration)
- [x] layoutmanager.tsx ↔ layoutmanager.c (🟠 Major - different approach)
- [x] layoutmanager2.tsx ↔ layoutmanager2.c (🟠 Major - icon dataset)
- [x] overlay.tsx ↔ overlay.c (🟡 Minor - spacing)
- [x] overlay-decorative.tsx ↔ overlay_decorative.c (🔴 Critical - wrong images)
- [✓] panes.tsx ↔ panes.c (matches well)
- [x] sizegroup.tsx ↔ sizegroup.c (🟡 Minor - baseline alignment)

## Lists
- [x] listbox.tsx ↔ listbox.c (🟠 Major - sort function)
- [x] listbox-controls.tsx ↔ listbox_controls.c (🟠 Major - rich-list)
- [x] listview-applauncher.tsx ↔ listview_applauncher.c (🟠 Major - GridView)
- [x] listview-clocks.tsx ↔ listview_clocks.c (🟠 Major - analog clocks)
- [x] listview-colors.tsx ↔ listview_colors.c (🔴 Critical - wrong view type)
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
- [✓] sidebar.tsx ↔ sidebar.c (matches)
- [✓] stack.tsx ↔ stack.c (matches)

## OpenGL
- [x] gears.tsx ↔ gears.c (🔴 Critical - FPS display)
- [✓] glarea.tsx ↔ glarea.c (matches)
- [x] shadertoy.tsx ↔ shadertoy.c (gtkx extension)

## Paths
- [x] path-explorer.tsx ↔ path_explorer_demo.c (🟠 Major - Cairo vs GSK)
- [x] path-fill.tsx ↔ path_fill.c (🟠 Major - Cairo vs GSK)
- [x] path-maze.tsx ↔ path_maze.c (🔴 Critical - grid vs GSK path)
- [x] path-spinner.tsx ↔ path_spinner.c (🟠 Major - Cairo vs GSK)
- [x] path-sweep.tsx ↔ path_sweep.c (🔴 Critical - manual vs GSK)
- [x] path-text.tsx ↔ path_text.c (🟠 Major - manual Bezier)
- [x] path-walk.tsx ↔ path_walk.c (🟠 Major - lookup table)

---

## Summary
- Total demos: 87
- Not started: 0
- Reviewed: 73
- Fully matched: 14
- Critical issues: 19 (font-features fixed)
- Major issues: 42
