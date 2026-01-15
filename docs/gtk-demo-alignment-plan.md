# GTK-Demo Alignment Plan

This document outlines the work required to align GTKX's gtk-demo with the official GTK4 gtk4-demo. The goal is to achieve near 1:1 feature parity while maintaining GTKX's React-based architecture.

---

## Priority Levels

- **P0 (Critical)**: Core functionality missing, demo is fundamentally different
- **P1 (High)**: Major features missing, but demo is functional
- **P2 (Medium)**: Missing options, reduced data sets, or minor feature gaps
- **P3 (Low)**: Polish, copy differences, minor UI variations

---

## Category 1: Advanced (6 demos)

### 1.1 font-features (P1)
**Current**: Simplified checklist of 20 features, sample previews
**Target**: Full font explorer with font selection, variations, script/language, waterfall mode

**Tasks**:
- [ ] Add font selection using `GtkFontDialog` or `GtkFontDialogButton`
- [ ] Implement font variations panel (weight, width, slant axes)
- [ ] Add script/language selector dropdown
- [ ] Implement waterfall mode (multiple sizes of same text)
- [ ] Expand feature list to match GTK's complete OpenType feature set
- [ ] Add font info display (family, style, file path)

### 1.2 fontrendering (P2)
**Current**: Dropdowns for hint style/antialias/subpixel, comparison views
**Target**: Font button, hinting dropdown, checkboxes, show extents/outlines

**Tasks**:
- [ ] Replace dropdowns with `GtkFontDialogButton` for font selection
- [ ] Add "Show Extents" checkbox to display glyph bounding boxes
- [ ] Add "Show Outlines" checkbox to display glyph paths
- [ ] Align control labels with GTK version

### 1.3 markup (P2)
**Current**: Interactive editor with 12 examples, live preview
**Target**: Two-pane source/formatted toggle, loads from resource

**Tasks**:
- [ ] Restructure to two-pane layout (source | formatted)
- [ ] Add toggle button to switch between source and formatted views
- [ ] Consider loading examples from resource files for consistency

### 1.4 rotated-text (P2)
**Current**: Custom texts in circle, rotation/size/spacing sliders
**Target**: Fixed "I ♥ GTK" text with custom heart shape renderer, gradient

**Tasks**:
- [ ] Implement custom heart shape path using Cairo/GskPath
- [ ] Add gradient fill to text
- [ ] Match the iconic "I ♥ GTK" circular layout
- [ ] Keep customizable version as an optional "advanced" section

### 1.5 textmask (P2)
**Current**: Text input, gradient presets, font size slider, animation
**Target**: Static "Pango power!" text, rainbow gradient, black outline

**Tasks**:
- [ ] Add default static "Pango power!" text mode
- [ ] Implement rainbow gradient (not just presets)
- [ ] Add black outline effect to text
- [ ] Keep interactive features as "Customize" section

### 1.6 transparent (P0)
**Current**: RGBA education with alpha slider, overlapping shapes
**Target**: Blur overlay with GtkOverlay, floating controls on image

**Tasks**:
- [ ] Complete redesign to match GTK's blur overlay approach
- [ ] Implement blur effect using GTK's snapshot blur
- [ ] Add GtkOverlay with floating controls
- [ ] Use actual image as background
- [ ] Keep educational content as supplementary documentation

---

## Category 2: Benchmark (4 demos)

### 2.1 fishbowl (P1)
**Current**: GtkFlowBox with fish emoji, count slider (10-500), FPS counter
**Target**: Custom GtkFishbowl widget with 16 widget types, prev/next navigation

**Tasks**:
- [ ] Implement widget type selector (not just fish emoji)
- [ ] Add these widget types: Icon, Button, Switch, Label, Spinner, Entry, etc.
- [ ] Increase max count capability (GTK goes to 10,000+)
- [ ] Add prev/next navigation for widget types
- [ ] Optimize rendering for higher counts

### 2.2 frames (P3)
**Current**: Color lerping animation in separate window
**Target**: Similar functionality

**Tasks**:
- [ ] Minor: Ensure FPS display format matches GTK ("X.XX fps")

### 2.3 scrolling (P1)
**Current**: 3 content types (Icons Grid, Plain Text, Color Grid)
**Target**: 12 content types including emoji, image, list, grid, SVG, squiggles

**Tasks**:
- [ ] Add content type: Emoji Grid
- [ ] Add content type: Image (large single image)
- [ ] Add content type: List (GtkListView)
- [ ] Add content type: Grid (GtkGridView)
- [ ] Add content type: SVG content
- [ ] Add content type: Squiggles (procedural drawing)
- [ ] Add content type: Text blocks
- [ ] Add content type: Mixed content
- [ ] Add content type: Nested scrolling

### 2.4 themes (P2)
**Current**: libadwaita ColorScheme, interval slider
**Target**: gtk_settings theme switching with 4 themes

**Tasks**:
- [ ] Add support for switching between multiple GTK themes (not just color schemes)
- [ ] List available themes from system
- [ ] Match theme names with GTK version

---

## Category 3: Buttons (4 demos)

### 3.1 expander (P1)
**Current**: 5 sections educational showcase
**Target**: Error dialog pattern with scrollable details expander

**Tasks**:
- [ ] Add primary demo matching GTK's error dialog pattern
- [ ] Show "Something went wrong" with expandable details
- [ ] Include scrollable content in expanded section
- [ ] Move educational content to secondary section

### 3.2 scale (P2)
**Current**: 4 sections with multiple practical examples
**Target**: Uses .ui file

**Tasks**:
- [ ] Align visual layout with GTK's .ui-based demo
- [ ] Ensure same scale configurations are shown

### 3.3 spinbutton (P1)
**Current**: Basic Integer, Floating Point, Time Input (HH:MM:SS)
**Target**: 4 custom formatters including hex and month

**Tasks**:
- [ ] Add hexadecimal formatter example
- [ ] Add month name formatter example (Jan, Feb, etc.)
- [ ] Match the 4-formatter structure of GTK version

### 3.4 spinner (P2)
**Current**: 4 sections with sizes and loading simulation
**Target**: Simple sensitive + insensitive spinners

**Tasks**:
- [ ] Add primary simple demo matching GTK (sensitive/insensitive toggle)
- [ ] Add "Play" and "Stop" labeled buttons
- [ ] Keep advanced sections as supplementary

---

## Category 4: Constraints (4 demos)

### 4.1 constraints-builder (P2)
**Current**: 4 sections educational with live examples
**Target**: ConstraintsGrid class from .ui file

**Tasks**:
- [ ] Align visual structure with GTK's builder-based layout
- [ ] Ensure constraint examples match GTK's demonstrations

### 4.2 constraints-interactive (P1)
**Current**: Cairo visualizer with sliders and buttons
**Target**: GtkGestureDrag for draggable guide

**Tasks**:
- [ ] Replace button controls with actual drag gesture
- [ ] Implement draggable constraint guide
- [ ] Keep visual feedback during drag operations

### 4.3 constraints (P3)
**Current**: Educational examples
**Target**: SimpleGrid with 3 buttons

**Tasks**:
- [ ] Rename labels from "First/Second/Third" to "Child 1/2/3"
- [ ] Match the stretchable guide behavior

### 4.4 constraints-vfl (P2)
**Current**: 4 sections with programmatic equivalent
**Target**: Uses actual VFL API

**Tasks**:
- [ ] Implement actual VFL parsing if supported by FFI
- [ ] Add `gtk_constraint_layout_add_constraints_from_description` binding if missing
- [ ] Show actual VFL strings in use

---

## Category 5: CSS (8 demos)

### 5.1 css-accordion (P1)
**Current**: FAQ accordion with animations
**Target**: GtkPaned with live CSS editor and error highlighting

**Tasks**:
- [ ] Add live CSS editor pane
- [ ] Implement CSS error highlighting
- [ ] Show real-time CSS application to widgets
- [ ] Keep accordion as the demo subject

### 5.2 css-basics (P1)
**Current**: Toggle between styles, code example
**Target**: GtkPaned with widgets + live CSS editing

**Tasks**:
- [ ] Add editable CSS text area
- [ ] Apply CSS changes in real-time
- [ ] Show CSS errors inline

### 5.3 css-blendmodes (P2)
**Current**: 16 blend modes grid, 7 color buttons
**Target**: Static layout from .ui resource

**Tasks**:
- [ ] Align layout structure with GTK version
- [ ] Ensure all blend modes match

### 5.4 css-multiplebgs (P1)
**Current**: 5 named presets
**Target**: Live CSS editing for backgrounds

**Tasks**:
- [ ] Add CSS editor for background customization
- [ ] Allow real-time editing of background CSS
- [ ] Keep presets as quick-select options

### 5.5 css-pixbufs (P1)
**Current**: 6 icons, 8 CSS filters
**Target**: -gtk-icontheme() CSS editing

**Tasks**:
- [ ] Add live CSS editor
- [ ] Demonstrate `-gtk-icontheme()` usage
- [ ] Rename from "CSS with Icons" to "Animated Backgrounds"

### 5.6 css-shadows (P2)
**Current**: 12 shadow cards by category
**Target**: Toolbar with 3 buttons + CSS editor

**Tasks**:
- [ ] Simplify to 3-button toolbar layout
- [ ] Add CSS editor pane
- [ ] Allow shadow CSS customization

### 5.7 errorstates (P2)
**Current**: Full registration form with validation
**Target**: Simpler entry validation

**Tasks**:
- [ ] Simplify to match GTK's focused validation demo
- [ ] Keep registration form as extended example

### 5.8 style-classes (P2)
**Current**: 33 searchable classes with previews
**Target**: Static grid from GtkBuilder

**Tasks**:
- [ ] Align grid layout with GTK version
- [ ] Ensure class list matches GTK's demonstration

---

## Category 6: Dialogs (4 demos)

### 6.1 dialog (P1)
**Current**: 4 AdwAlertDialog types
**Target**: 2 dialog types (Message, Interactive) using GtkMessageDialog

**Tasks**:
- [ ] Add GtkMessageDialog examples (even if deprecated)
- [ ] Implement interactive dialog with custom content
- [ ] Rename from "Modal Dialogs" to "Dialogs"

### 6.2 pagesetup (P1)
**Current**: Full preview with inline controls
**Target**: Single GtkPageSetupUnixDialog popup

**Tasks**:
- [ ] Add button to launch `GtkPageSetupUnixDialog`
- [ ] Show system page setup dialog
- [ ] Keep visual preview as supplementary feature

### 6.3 pickers (P2)
**Current**: Color, Font, File grouped by type
**Target**: Flat grid with URI launcher

**Tasks**:
- [ ] Add URI/App launcher row
- [ ] Restructure to flat grid layout
- [ ] Add mnemonics to labels

### 6.4 printing (P1)
**Current**: Print/Preview/PDF with custom content
**Target**: Prints own source file

**Tasks**:
- [ ] Add option to print demo's own source code
- [ ] Match GTK's direct print dialog launch behavior

---

## Category 7: Drawing (12 demos)

### 7.1 drawingarea (P2)
**Current**: Scribble, shapes, compositing demo
**Target**: RGB circle knockout, scribble with drag

**Tasks**:
- [ ] Implement RGB overlapping circles demo
- [ ] Ensure scribble uses proper drag gestures
- [ ] Match knockout group demonstration

### 7.2 image-filtering (P1)
**Current**: JS-based convolution kernels
**Target**: GPU-accelerated FilterPaintable with shaders

**Tasks**:
- [ ] Research FilterPaintable availability in GTK4
- [ ] Implement GPU shader-based filtering if possible
- [ ] Document performance comparison

### 7.3 image-scaling (P1)
**Current**: ContentFit modes comparison
**Target**: Custom ImageView with zoom, rotation, filter

**Tasks**:
- [ ] Add zoom controls (scroll wheel or slider)
- [ ] Add rotation controls (slider or buttons)
- [ ] Add filter selection (Linear/Nearest/Trilinear)
- [ ] Implement custom image view behavior

### 7.4 images (P1)
**Current**: GtkImage with themed icons, GtkPicture
**Target**: Multiple paintable sources including GIF, video, WidgetPaintable

**Tasks**:
- [ ] Add animated GIF example
- [ ] Add symbolic icon with states
- [ ] Add video as image source
- [ ] Add WidgetPaintable example (render widget as image)

### 7.5 mask (P2)
**Current**: Circular/star/text clipping, gradient masks
**Target**: Text mask over animated gradient

**Tasks**:
- [ ] Ensure text-as-mask pattern is demonstrated
- [ ] Add animated gradient background
- [ ] Match "Mask Nodes" title

### 7.6 paintable (P1)
**Current**: Procedural textures (checkerboard, gradient, noise)
**Target**: Nuclear icon paintable with rotation property

**Tasks**:
- [ ] Implement custom paintable with animatable properties
- [ ] Add rotation property example
- [ ] Show paintable invalidation pattern

### 7.7 paint (P1)
**Current**: ColorDialogButton, preset colors, brush size
**Target**: GtkGestureStylus with pressure, eraser, pad controller

**Tasks**:
- [ ] Add stylus pressure sensitivity support
- [ ] Add eraser detection
- [ ] Add tablet pad button handling
- [ ] Show "Stylus only" mode
- [ ] Research stylus API availability

### 7.8 paintable-animated (P2)
**Current**: Procedural pixel animations
**Target**: Rotating nuclear icon with g_timeout_add

**Tasks**:
- [ ] Add nuclear icon rotation animation
- [ ] Match timeout-based animation approach

### 7.9 paintable-emblem (P1)
**Current**: GtkOverlay with folder + emblem icons
**Target**: Custom DemoIcon paintable combining base + emblem, animated

**Tasks**:
- [ ] Implement custom paintable that composites icons
- [ ] Add animation to emblem positioning
- [ ] Show paintable composition pattern

### 7.10 paintable-mediastream (P1)
**Current**: GtkVideo + GtkPicture with GtkMediaFile
**Target**: Custom GtkNuclearMediaStream with play/pause/seek

**Tasks**:
- [ ] Implement custom media stream paintable
- [ ] Add play/pause/seek controls
- [ ] Show media stream as paintable pattern

### 7.11 paintable-svg (P2)
**Current**: SVG string generation
**Target**: GtkSvg from resource, stateful SVG

**Tasks**:
- [ ] Load SVG from resource files
- [ ] Implement stateful SVG (color changes based on state)
- [ ] Show .gpa file usage if applicable

### 7.12 paintable-symbolic (P1)
**Current**: Symbolic icon browser by category
**Target**: Warning level symbolic (none/alert/emergency)

**Tasks**:
- [ ] Implement warning level demonstration
- [ ] Show color changes based on warning state
- [ ] Add "Don't click!" interactive element
- [ ] Match nuclear symbolic icon example

---

## Category 8: Games (3 demos)

### 8.1 listview-minesweeper (P1)
**Current**: React state, GtkGridView, 10x10 with 15 mines
**Target**: GObject subclasses, sound effects

**Tasks**:
- [ ] Add sound effects (reveal, flag, explosion, win)
- [ ] Match grid size and mine count with GTK version
- [ ] Improve cell rendering to match GTK styling

### 8.2 peg-solitaire (P1)
**Current**: Click-to-move with GtkGrid
**Target**: Drag-and-drop moves, sounds

**Tasks**:
- [ ] Implement GtkDragSource for peg pieces
- [ ] Implement GtkDropTarget for valid destinations
- [ ] Add sound effects
- [ ] Update instructions from click to drag

### 8.3 sliding-puzzle (P1)
**Current**: 4x4 click-only puzzle
**Target**: Keyboard navigation, video/image as puzzle source

**Tasks**:
- [ ] Add arrow key navigation
- [ ] Add option to use video as puzzle source
- [ ] Add option to use custom image as puzzle source
- [ ] Add media source selection UI

---

## Category 9: Gestures (7 demos)

### 9.1 clipboard (P0)
**Current**: Documentation-focused with GtkEntry fields
**Target**: Full interactive text/image/color/file clipboard, DnD integration

**Tasks**:
- [ ] Implement text clipboard copy/paste
- [ ] Implement image clipboard copy/paste
- [ ] Implement color clipboard copy/paste
- [ ] Implement file clipboard operations
- [ ] Add drag-and-drop integration
- [ ] Make fully interactive, not just documentation

### 9.2 cursors (P1)
**Current**: Interactive cursor grid
**Target**: Cursor callback API demo with GTK logo from callback

**Tasks**:
- [ ] Implement cursor callback API demonstration
- [ ] Show GTK logo rendered via cursor callback
- [ ] Demonstrate custom cursor creation

### 9.3 dnd (P0)
**Current**: Declarative DnD with React props
**Target**: Complex canvas with rotation, trash, context menu

**Tasks**:
- [ ] Implement canvas with freely positionable items
- [ ] Add rotation support for dragged items
- [ ] Add trash/delete zone
- [ ] Add context menu on items
- [ ] Show full DnD capabilities

### 9.4 gestures (P0)
**Current**: API documentation listing gesture types
**Target**: Interactive drawing area responding to all gestures

**Tasks**:
- [ ] Implement interactive GtkDrawingArea
- [ ] Add swipe gesture response
- [ ] Add long-press gesture response
- [ ] Add rotate gesture response
- [ ] Add zoom/pinch gesture response
- [ ] Show visual feedback for all gestures

### 9.5 links (P2)
**Current**: GtkLinkButton demo
**Target**: GtkLabel with Pango markup hyperlinks, custom URI handler

**Tasks**:
- [ ] Add inline links in GtkLabel using Pango markup
- [ ] Implement custom URI handler/interceptor
- [ ] Show both link buttons and inline links

### 9.6 shortcuts (P0)
**Current**: Menu accelerators demo
**Target**: GtkShortcutsWindow overlay system

**Tasks**:
- [ ] Implement GtkShortcutsWindow
- [ ] Add multiple shortcut sections (like Builder/Gedit/Clocks/Boxes)
- [ ] Show shortcuts overlay pattern
- [ ] Keep menu accelerators as supplementary

### 9.7 shortcut-triggers (P2)
**Current**: ShortcutController with multiple trigger types
**Target**: Simple list with Ctrl+G and X shortcuts

**Tasks**:
- [ ] Simplify primary demo to match GTK
- [ ] Keep comprehensive triggers as advanced section

---

## Category 10: Input (10 demos)

### 10.1 entry-undo (P3)
**Current**: Documentation with GtkEntry enableUndo
**Target**: Simple single entry

**Tasks**:
- [ ] Simplify to single entry demonstration
- [ ] Add keyboard shortcut instructions

### 10.2 hypertext (P0)
**Current**: Documentation demo
**Target**: Interactive hypertext browser with pages, emoji, icons, widgets, TTS

**Tasks**:
- [ ] Implement multi-page hypertext browser
- [ ] Add page navigation (like wiki links)
- [ ] Add embedded emoji support
- [ ] Add embedded icons support
- [ ] Add embedded widgets support
- [ ] Research text-to-speech integration

### 10.3 password-entry (P2)
**Current**: Password form with strength indicator
**Target**: GtkHeaderBar layout dialog

**Tasks**:
- [ ] Add GtkHeaderBar-style dialog layout
- [ ] Match "Choose password" dialog structure

### 10.4 read-more (P2)
**Current**: Lines prop with ellipsize
**Target**: Custom ReadMore widget with measure/allocate

**Tasks**:
- [ ] Align text content with GTK (GNU/Linux text)
- [ ] Ensure proper measure/allocate behavior

### 10.5 search-entry (P1)
**Current**: Filter list with delay examples
**Target**: GtkSearchBar with key capture, header bar toggle

**Tasks**:
- [ ] Implement GtkSearchBar pattern
- [ ] Add key capture for search activation
- [ ] Add header bar toggle button

### 10.6 tabs (P3)
**Current**: PangoTabArray with documentation
**Target**: Simple tab demo

**Tasks**:
- [ ] Minor alignment with GTK version

### 10.7 tagged-entry (P2)
**Current**: React-based tag input with GtkFlowBox
**Target**: Custom DemoTaggedEntry composite widget

**Tasks**:
- [ ] Style tags with CSS to match GTK
- [ ] Ensure similar visual appearance

### 10.8 text-scroll (P1)
**Current**: Static scroll controls
**Target**: Auto-scrolling with mark gravity

**Tasks**:
- [ ] Implement auto-appending text demonstration
- [ ] Show mark gravity behavior
- [ ] Add automatic scrolling as text appends

### 10.9 text-undo (P2)
**Current**: Full API reference for undo
**Target**: Irreversible action demonstration

**Tasks**:
- [ ] Add irreversible action example
- [ ] Show beginIrreversibleAction/endIrreversibleAction

### 10.10 textview (P0)
**Current**: Basic multi-line editor with stats
**Target**: Rich text with shared buffer, many tags, embedded widgets

**Tasks**:
- [ ] Implement shared buffer between two views
- [ ] Add comprehensive text tags (bold, italic, colors, sizes)
- [ ] Add embedded widgets in text
- [ ] Show rich text formatting capabilities

---

## Category 11: Layout (11 demos)

### 11.1 sizegroup (P2)
**Current**: Educational showing 3 approaches
**Target**: Single functional demo with toggle

**Tasks**:
- [ ] Add primary demo matching GTK's toggle checkbox pattern
- [ ] Keep educational content as supplementary

### 11.2 paned (P3)
**Current**: x.Slot for children, resize toggles
**Target**: Minimal nested panes

**Tasks**:
- [ ] Minor simplification if needed

### 11.3 fixed (P0)
**Current**: Interactive draggable widgets
**Target**: 3D cube with 6 faces using GskTransform perspective

**Tasks**:
- [ ] Implement 3D cube visualization
- [ ] Use GskTransform for perspective projection
- [ ] Show 6 cube faces with proper 3D positioning
- [ ] Keep draggable demo as alternative section

### 11.4 fixed2 (N/A - GTKX only)
**Current**: 2D transforms demo
**Target**: N/A (similar to fixed.c 3D cube)

**Tasks**:
- [ ] Consider merging with fixed demo
- [ ] Or keep as complementary 2D example

### 11.5 overlay-decorative (N/A - GTKX only)
**Current**: Badges, ribbons, watermarks
**Target**: N/A

**Tasks**:
- [ ] Keep as GTKX-specific demo or merge with overlay

### 11.6 layoutmanager (P0)
**Current**: Circular layout with manual calculation
**Target**: Custom GtkLayoutManager subclass with grid↔circle transition

**Tasks**:
- [ ] Implement custom layout manager (may require FFI extension)
- [ ] Add grid-to-circle animated transition
- [ ] Show click-to-animate behavior

### 11.7 layoutmanager2 (P0)
**Current**: Responsive breakpoints, priority allocation
**Target**: 3D sphere layout with 648 icons, arrow key rotation

**Tasks**:
- [ ] Implement 3D sphere layout
- [ ] Add 648 icons arranged on sphere surface
- [ ] Add arrow key rotation controls
- [ ] Show 3D navigation

### 11.8 aspectframe (N/A - GTKX only)
**Current**: 4 ratio presets
**Target**: N/A

**Tasks**:
- [ ] Keep as GTKX-specific demo

### 11.9 flowbox (N/A - GTKX only)
**Current**: Tag cloud with filtering
**Target**: N/A

**Tasks**:
- [ ] Keep as GTKX-specific demo

### 11.10 overlay (N/A - GTKX only)
**Current**: 4 use cases
**Target**: N/A

**Tasks**:
- [ ] Keep as GTKX-specific demo

### 11.11 centerbox (N/A - GTKX only)
**Current**: Horizontal/vertical demos
**Target**: N/A

**Tasks**:
- [ ] Keep as GTKX-specific demo

---

## Category 12: Lists (12 demos)

### 12.1 listbox (P1)
**Current**: 100 numbered items, sorting, filtering
**Target**: Twitter-like messages with avatars, timestamps

**Tasks**:
- [ ] Implement social media message layout
- [ ] Add avatar images
- [ ] Add timestamps
- [ ] Add @mentions and hashtags styling
- [ ] Keep basic list as alternative

### 12.2 listview-applauncher (P1)
**Current**: 50 hardcoded app entries
**Target**: Real GAppInfo from system

**Tasks**:
- [ ] Implement GAppInfo/GDesktopAppInfo integration
- [ ] List actually installed applications
- [ ] Launch apps on activation
- [ ] Add search functionality

### 12.3 listview-clocks (P2)
**Current**: Analog clocks with onDraw, 12 cities
**Target**: Custom GtkClock paintable

**Tasks**:
- [ ] Match city list with GTK version
- [ ] Ensure clock rendering matches

### 12.4 listview-colors (P1)
**Current**: 1000 hex colors
**Target**: 16 million colors (256^3)

**Tasks**:
- [ ] Implement lazy loading for massive color list
- [ ] Add virtual scrolling optimization
- [ ] Match color format with GTK version

### 12.5 listview-filebrowser (P1)
**Current**: Hardcoded file/folder data
**Target**: Real GtkDirectoryList with GFileInfo

**Tasks**:
- [ ] Implement GtkDirectoryList integration
- [ ] Browse real filesystem
- [ ] Show actual file info (size, date, permissions)
- [ ] Add directory navigation

### 12.6 listview-selections (P0)
**Current**: Selection modes with RadioButtons
**Target**: GtkDropDown examples, SuggestionEntry

**Tasks**:
- [ ] Add GtkDropDown demonstrations
- [ ] Add suggestion entry pattern
- [ ] Show dropdown with custom models

### 12.7 listview-settings (P1)
**Current**: Static settings tree
**Target**: Real GSettings schemas with GtkTreeListModel

**Tasks**:
- [ ] Implement GSettings integration
- [ ] Browse real dconf schemas
- [ ] Show actual system settings
- [ ] Use GtkTreeListModel for hierarchy

### 12.8 listview-settings2 (P1)
**Current**: Flat list with search
**Target**: GSettings with section headers

**Tasks**:
- [ ] Implement GtkListHeaderFactory for sections
- [ ] Show real GSettings data

### 12.9 listview-ucd (P1)
**Current**: 200 sample Unicode characters
**Target**: 33,796 Unicode characters from resource

**Tasks**:
- [ ] Load full Unicode character database
- [ ] Implement efficient scrolling for 33K items
- [ ] Add more columns matching GTK version

### 12.10 listview-weather (P1)
**Current**: 14-day vertical forecast
**Target**: 70,000 hourly records, horizontal layout

**Tasks**:
- [ ] Implement horizontal scrolling weather view
- [ ] Load historical weather data (or generate sample data)
- [ ] Scale up to 70,000 items
- [ ] Optimize for horizontal scrolling

### 12.11 listview-words (P1)
**Current**: 100 sample words
**Target**: /usr/share/dict/words (100K+), async loading

**Tasks**:
- [ ] Load system dictionary file
- [ ] Implement async loading with progress
- [ ] Add file open button for custom word lists
- [ ] Handle 100K+ items efficiently

### 12.12 listbox-controls (N/A - GTKX only)
**Current**: Settings panel
**Target**: N/A

**Tasks**:
- [ ] Keep as GTKX-specific demo

---

## Category 13: Media (1 demo)

### 13.1 video-player (P0)
**Current**: Documentation explaining GtkVideo properties
**Target**: Functional player with file dialog, preset videos

**Tasks**:
- [ ] Implement functional video playback
- [ ] Add GtkFileDialog for video selection
- [ ] Add preset videos (GTK logo, Big Buck Bunny or similar)
- [ ] Show play/pause/seek controls

---

## Category 14: Navigation (3 demos)

### 14.1 stack (P2)
**Current**: 3 pages, 8 transitions, programmatic navigation
**Target**: Loads from stack.ui resource

**Tasks**:
- [ ] Align page structure with GTK version
- [ ] Ensure transition types match

### 14.2 revealer (P1)
**Current**: 4 practical use cases
**Target**: 9 auto-animating revealers at intervals

**Tasks**:
- [ ] Implement auto-animating showcase
- [ ] Add 690ms interval timing
- [ ] Show all revealer transitions cycling

### 14.3 sidebar (P1)
**Current**: 4 navigation patterns
**Target**: GtkStackSidebar with 9 pages, GTK icon

**Tasks**:
- [ ] Add 9 pages matching GTK version
- [ ] Include GTK icon branding
- [ ] Focus on GtkStackSidebar pattern

---

## Category 15: OpenGL (3 demos)

### 15.1 glarea (P1)
**Current**: Triangle with uniform color, 6 color buttons
**Target**: RGB vertex colors, X/Y/Z rotation sliders

**Tasks**:
- [ ] Implement per-vertex RGB colors
- [ ] Add X/Y/Z rotation sliders (0-360 range)
- [ ] Replace color buttons with rotation controls

### 15.2 gears (P2)
**Current**: 3 gears, X/Y sliders, Pause/Play
**Target**: GtkGears widget, vertical sliders, FPS label

**Tasks**:
- [ ] Change sliders to vertical orientation
- [ ] Add FPS counter display
- [ ] Add Z-axis rotation slider

### 15.3 shadertoy (P1)
**Current**: 4 presets, GtkSourceView, Compile/Pause/Reset
**Target**: 5 preset thumbnails as mini-renderers

**Tasks**:
- [ ] Implement live preview thumbnails for presets
- [ ] Show each preset rendering in small preview
- [ ] Match preset selection with GTK version

---

## Category 16: Paths (7 demos)

### 16.1 path-explorer (P1)
**Current**: Bezier editor with 2 curves, draggable points
**Target**: Extensive properties: fill/stroke, line width/cap/join, dashes, fill rule

**Tasks**:
- [ ] Add fill/stroke toggle
- [ ] Add line width control
- [ ] Add line cap selection (butt, round, square)
- [ ] Add line join selection (miter, round, bevel)
- [ ] Add dash pattern editor
- [ ] Add fill rule toggle (even-odd vs winding)
- [ ] Add curvature visualization
- [ ] Add tangent display

### 16.2 path-text (P2)
**Current**: 4 path types, customizable text, animation
**Target**: Single cubic bezier with effects

**Tasks**:
- [ ] Add frosted glass effect
- [ ] Add emboss effect
- [ ] Match default text with GTK version

### 16.3 path-fill (P0)
**Current**: Educational fill rules, gradients
**Target**: GTK logo with 3 paths, PDF printing, context menu

**Tasks**:
- [ ] Implement GTK logo rendering with paths
- [ ] Add PDF export/printing capability
- [ ] Add context menu

### 16.4 path-spinner (P2)
**Current**: 5 spinner styles
**Target**: Single spinner with oscillating completion

**Tasks**:
- [ ] Add oscillating completion percentage mode
- [ ] Keep spinner variations as supplementary

### 16.5 path-sweep (P0)
**Current**: Dash offset animation, 9 easing functions
**Target**: World map with line intersection detection

**Tasks**:
- [ ] Implement world map SVG rendering
- [ ] Add horizontal line intersection visualization
- [ ] Show geographic path operations

### 16.6 path-walk (P0)
**Current**: Single object walking along bezier
**Target**: 500 colored arrows on world map

**Tasks**:
- [ ] Implement world map as path source
- [ ] Add 500 animated arrows along paths
- [ ] Use frame clock for smooth animation

### 16.7 path-maze (P0)
**Current**: BFS/A* algorithm visualization
**Target**: Follow-the-path game with audio

**Tasks**:
- [ ] Implement maze following game
- [ ] Add win/lose audio feedback
- [ ] Add nuclear animation effect
- [ ] Keep algorithm visualization as alternative mode

---

## Cross-Cutting Requirements

### Audio Support
Several GTK demos use sound effects:
- Minesweeper (reveal, flag, explosion, win)
- Peg Solitaire (move sounds)
- Path Maze (win/lose)

**Tasks**:
- [ ] Research audio playback in GTK4/GTKX
- [ ] Implement sound effect utility
- [ ] Add sound files to resources

### Real System Data Integration
Many demos need access to real system data:
- GAppInfo (installed applications)
- GSettings (system settings)
- GFileInfo (filesystem)
- /usr/share/dict/words (dictionary)

**Tasks**:
- [ ] Verify FFI bindings exist for these APIs
- [ ] Add missing bindings if needed
- [ ] Implement async loading patterns

### Custom Paintable Implementation
Several demos require custom GdkPaintable:
- Nuclear icon (rotating)
- DemoIcon (compositing)
- NuclearMediaStream
- Clock faces

**Tasks**:
- [ ] Document custom paintable pattern for GTKX
- [ ] Implement example custom paintables
- [ ] Add animation support to paintables

### Custom Layout Manager
Some demos need custom GtkLayoutManager:
- Circular layout with transition
- Sphere layout with 3D positioning

**Tasks**:
- [ ] Research custom layout manager feasibility
- [ ] Add FFI bindings if possible
- [ ] Document workarounds if not possible

### GskTransform 3D Operations
Several demos use 3D transforms:
- Fixed demo cube
- Sphere layout

**Tasks**:
- [ ] Ensure GskTransform bindings are complete
- [ ] Add perspective transform support
- [ ] Document 3D transform patterns

---

## Implementation Order Recommendation

### Phase 1: Critical Functionality (P0 demos)
1. Gestures: clipboard, dnd, gestures, shortcuts
2. Input: hypertext, textview
3. Layout: fixed (3D cube), layoutmanager, layoutmanager2
4. Lists: listview-selections
5. Media: video-player
6. Paths: path-fill, path-sweep, path-walk, path-maze
7. Advanced: transparent

### Phase 2: High Priority (P1 demos)
1. Complete all P1 demos in order of complexity
2. Focus on interaction model differences first
3. Then address data source differences

### Phase 3: Medium Priority (P2 demos)
1. Address remaining feature gaps
2. Align copy and labels
3. Polish visual layouts

### Phase 4: Low Priority (P3 demos)
1. Minor text changes
2. Label alignment
3. Final polish

---

## Metrics for Success

- [ ] All 93 shared demos have visual parity with GTK version
- [ ] All interaction models match (drag-and-drop, gestures, keyboard)
- [ ] Real system data used where GTK version uses it
- [ ] Sound effects working where GTK version has them
- [ ] No features marked as "documentation-focused" that should be interactive
- [ ] All demos fully functional, not just educational
