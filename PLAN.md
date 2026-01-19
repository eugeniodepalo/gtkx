# Plan: Font Rendering Demo - Full GTK4 Feature Parity

## Overview

Rewrite `fontrendering.tsx` to match the official GTK4 Font Rendering demo with full feature parity while using GTKX-specific features where available.

**Current State:** ~464 lines, missing critical glyph inspection mode and visual overlays
**Target State:** Full parity with official demo including glyph-level inspection

## Key Missing Features

1. **Glyphs Mode (Critical)** - 4x4 grid showing subpixel positioning variations
2. **Visual Overlays** - Show/Hide Pixels, Outlines, Extents, Grid with animated alpha
3. **GtkFontDialogButton** - For font selection (currently uses hardcoded "Sans")
4. **Text Entry** - Editable input text (currently hardcoded)
5. **Header Bar Toggle** - Text/Glyphs mode switch

## Implementation Phases

### Phase 1: FFI Binding Updates

The Glyphs mode requires modifying `PangoGlyphInfo.geometry.x_offset` and `y_offset`. Currently `GlyphInfo` and `GlyphGeometry` are stub classes.

**Tasks:**
1. Update codegen to properly generate `Pango.GlyphGeometry` struct with fields:
   - `width: number` (PangoGlyphUnit = i32)
   - `xOffset: number` (PangoGlyphUnit = i32)
   - `yOffset: number` (PangoGlyphUnit = i32)

2. Update codegen to properly generate `Pango.GlyphInfo` struct with fields:
   - `glyph: number` (PangoGlyph = u32)
   - `geometry: GlyphGeometry`
   - `attr: GlyphVisAttr`

3. Verify `Pango.GlyphString.glyphs` returns proper `GlyphInfo[]` with writable geometry

4. Verify `Pango.LayoutIter.getRun()` and `getRunReadonly()` work correctly

**Files to modify:**
- `packages/codegen/src/ffi/generators/` - Check why these structs are stubs
- `girs/Pango-1.0.gir` - Reference for struct definitions

### Phase 2: Demo UI Restructure

Match the official demo's layout and controls.

**Tasks:**
1. Create header bar with Text/Glyphs toggle buttons (linked style)
2. Replace font dropdown controls with `x.FontDialogButton`
3. Add editable `GtkEntry` for preview text
4. Reorganize controls into a GtkGrid layout:
   - Row 0: Text label + Entry | Show Pixels | Hinting dropdown | Show Extents | Zoom +
   - Row 1: Font label + FontDialogButton | Show Outlines | Antialias + Hint Metrics | Show Grid | Zoom -
5. Add zoom +/- circular buttons with `<Control>plus` and `<Control>minus` shortcuts
6. Remove the comparison views and reference sections (not in official demo)

**GTKX Features to Use:**
- `x.FontDialogButton` - Already implemented
- `ShortcutController` with `x.Shortcut` - For zoom keyboard shortcuts
- `GtkCheckButton` - For show toggles
- `GtkDropDown` with `x.SimpleListItem` - For hinting dropdown

### Phase 3: Visual Overlays Implementation

Add the four overlay options with animated alpha transitions.

**Tasks:**
1. **Show Pixels** - Control pixel_alpha (text rendering opacity)
   - When both pixels and outlines: pixel_alpha = 0.5
   - When only pixels: pixel_alpha = 1.0
   - When neither: pixel_alpha = 0.0

2. **Show Outlines** - Draw glyph vector paths
   - Use `PangoCairo.layoutPath(cr, layout)` to add text paths
   - Store path, scale coordinates, stroke with outline_alpha
   - `outline_alpha = 1.0` when enabled, `0.0` when disabled

3. **Show Extents** - Draw bounding rectangles
   - Blue: logical rectangle + baseline
   - Red: ink rectangle

4. **Show Grid** - Pixel grid overlay
   - Draw horizontal and vertical lines at scaled pixel boundaries
   - Color: rgba(0.2, 0, 0, 0.2)

5. **Animated Alpha Fading**
   - Use `Adw.TimedAnimation` with `ease_out_cubic` easing
   - Duration: 500ms
   - Animate pixel_alpha and outline_alpha simultaneously

### Phase 4: Glyphs Mode Implementation

Implement the 4x4 subpixel positioning grid.

**Algorithm (from official demo):**
1. Take first character from input text
2. Create layout with: `char + ZWNJ + char + ZWNJ + char + ZWNJ + char` (4 copies)
3. Get layout iterator and run
4. For each glyph, set `geometry.width = width * 3/2` (spacing)
5. Render 4 rows with different y_offsets:
   - Row j: Set each glyph's `geometry.x_offset = i * (PANGO_SCALE / 4)`
   - Row j: Set each glyph's `geometry.y_offset = j * (PANGO_SCALE / 4)`
6. Render at (0, j * logical_height)

**PANGO_SCALE = 1024** (units per pixel)

**Fallback:** If first character doesn't produce enough glyphs (< 8), use 'a'

### Phase 5: Rendering Pipeline

Match the official demo's rendering approach.

**Current:** GtkDrawingArea with direct Cairo rendering
**Official:** Cairo surface → GdkPixbuf scale → overlay drawing → GtkPicture

**Tasks:**
1. Render text to `cairo_image_surface_create(ARGB32, ...)`
2. Apply pixel_alpha to text color
3. Extract pixbuf data and scale with nearest-neighbor interpolation
4. Create new surface from scaled pixbuf
5. Draw overlays (grid, extents, outlines) on scaled surface
6. Display in GtkDrawingArea (using the scaled image as source)

**Alternative:** Continue using GtkDrawingArea but apply `cr.scale()` for magnification - this is cleaner and already works in current demo.

## Files to Create/Modify

1. **packages/codegen/** - FFI struct generation fixes
2. **examples/gtk-demo/src/demos/advanced/fontrendering.tsx** - Complete rewrite

## Dependencies

- `x.FontDialogButton` ✅ Already implemented
- `PangoCairo.layoutPath()` ✅ Already exists
- `Pango.LayoutIter` ✅ Fully implemented
- `Pango.GlyphInfo.geometry` ❌ Needs implementation
- `Pango.GlyphGeometry` ❌ Needs implementation

## Testing Strategy

1. Verify FFI bindings work with simple glyph geometry access test
2. Test Text mode with all overlay combinations
3. Test Glyphs mode with various characters (ASCII, Unicode, complex scripts)
4. Verify animated transitions are smooth
5. Test zoom +/- at extremes (1x to 32x)
6. Compare visual output with official GTK4 demo

## Estimated Complexity

- Phase 1 (FFI): Medium - codegen investigation needed
- Phase 2 (UI): Low - straightforward GTKX patterns
- Phase 3 (Overlays): Medium - path manipulation and animation
- Phase 4 (Glyphs): High - depends on FFI bindings
- Phase 5 (Rendering): Low - existing patterns work

## Risk Mitigation

If `GlyphInfo.geometry` modification proves too complex:
- Alternative: Use Cairo transforms with fractional pixel offsets
- This achieves the same visual demonstration of subpixel positioning
- Downside: Not using actual glyph offset APIs

However, per user requirements, we should implement the proper FFI bindings rather than work around them.
