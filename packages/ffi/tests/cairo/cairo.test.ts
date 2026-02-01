import { existsSync, unlinkSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Context, FontOptions, Pattern, PdfSurface, Surface } from "../../src/cairo/index.js";

const createTestSurface = (): Surface => {
    return new PdfSurface("/dev/null", 200, 200);
};

const createTestContext = (): Context => {
    return createTestSurface().createContext();
};

describe("Context", () => {
    describe("path operations", () => {
        it("moves to a point", () => {
            const ctx = createTestContext();
            ctx.moveTo(10, 20);
            const point = ctx.getCurrentPoint();
            expect(point).not.toBeNull();
            expect(point?.x).toBeCloseTo(10);
            expect(point?.y).toBeCloseTo(20);
        });

        it("draws a line to a point", () => {
            const ctx = createTestContext();
            ctx.moveTo(0, 0).lineTo(50, 50);
            const point = ctx.getCurrentPoint();
            expect(point?.x).toBeCloseTo(50);
            expect(point?.y).toBeCloseTo(50);
        });

        it("performs relative move", () => {
            const ctx = createTestContext();
            ctx.moveTo(10, 10).relMoveTo(5, 5);
            const point = ctx.getCurrentPoint();
            expect(point?.x).toBeCloseTo(15);
            expect(point?.y).toBeCloseTo(15);
        });

        it("performs relative line", () => {
            const ctx = createTestContext();
            ctx.moveTo(10, 10).relLineTo(20, 30);
            const point = ctx.getCurrentPoint();
            expect(point?.x).toBeCloseTo(30);
            expect(point?.y).toBeCloseTo(40);
        });

        it("draws a curve", () => {
            const ctx = createTestContext();
            ctx.moveTo(0, 0).curveTo(10, 10, 20, 20, 30, 30);
            const point = ctx.getCurrentPoint();
            expect(point?.x).toBeCloseTo(30);
            expect(point?.y).toBeCloseTo(30);
        });

        it("draws a relative curve", () => {
            const ctx = createTestContext();
            ctx.moveTo(0, 0).relCurveTo(10, 10, 20, 20, 30, 30);
            const point = ctx.getCurrentPoint();
            expect(point?.x).toBeCloseTo(30);
            expect(point?.y).toBeCloseTo(30);
        });

        it("draws an arc", () => {
            const ctx = createTestContext();
            ctx.arc(50, 50, 25, 0, Math.PI * 2);
            const point = ctx.getCurrentPoint();
            expect(point).not.toBeNull();
        });

        it("draws a negative arc", () => {
            const ctx = createTestContext();
            ctx.arcNegative(50, 50, 25, Math.PI * 2, 0);
            const point = ctx.getCurrentPoint();
            expect(point).not.toBeNull();
        });

        it("draws a rectangle", () => {
            const ctx = createTestContext();
            ctx.rectangle(10, 10, 80, 60);
            const point = ctx.getCurrentPoint();
            expect(point).not.toBeNull();
        });

        it("closes a path", () => {
            const ctx = createTestContext();
            ctx.moveTo(0, 0).lineTo(50, 50).lineTo(100, 0).closePath();
            const point = ctx.getCurrentPoint();
            expect(point?.x).toBeCloseTo(0);
            expect(point?.y).toBeCloseTo(0);
        });

        it("creates a new path", () => {
            const ctx = createTestContext();
            ctx.moveTo(10, 10).newPath();
            const point = ctx.getCurrentPoint();
            expect(point).toBeNull();
        });

        it("creates a new sub-path", () => {
            const ctx = createTestContext();
            ctx.moveTo(10, 10).newSubPath();
            const point = ctx.getCurrentPoint();
            expect(point).toBeNull();
        });
    });

    describe("getCurrentPoint", () => {
        it("returns null when no current point exists", () => {
            const ctx = createTestContext();
            expect(ctx.getCurrentPoint()).toBeNull();
        });

        it("returns coordinates after moveTo", () => {
            const ctx = createTestContext();
            ctx.moveTo(42, 84);
            const point = ctx.getCurrentPoint();
            expect(point).toEqual({ x: 42, y: 84 });
        });
    });

    describe("drawing operations", () => {
        it("strokes the current path", () => {
            const ctx = createTestContext();
            const result = ctx.moveTo(0, 0).lineTo(100, 100).stroke();
            expect(result).toBe(ctx);
        });

        it("strokes preserving the path", () => {
            const ctx = createTestContext();
            const result = ctx.moveTo(0, 0).lineTo(100, 100).strokePreserve();
            expect(result).toBe(ctx);
        });

        it("fills the current path", () => {
            const ctx = createTestContext();
            const result = ctx.rectangle(0, 0, 100, 100).fill();
            expect(result).toBe(ctx);
        });

        it("fills preserving the path", () => {
            const ctx = createTestContext();
            const result = ctx.rectangle(0, 0, 100, 100).fillPreserve();
            expect(result).toBe(ctx);
        });

        it("paints the entire surface", () => {
            const ctx = createTestContext();
            const result = ctx.paint();
            expect(result).toBe(ctx);
        });

        it("paints with alpha", () => {
            const ctx = createTestContext();
            const result = ctx.paintWithAlpha(0.5);
            expect(result).toBe(ctx);
        });
    });

    describe("clipping", () => {
        it("clips to the current path", () => {
            const ctx = createTestContext();
            const result = ctx.rectangle(10, 10, 80, 80).clip();
            expect(result).toBe(ctx);
        });

        it("clips preserving the path", () => {
            const ctx = createTestContext();
            const result = ctx.rectangle(10, 10, 80, 80).clipPreserve();
            expect(result).toBe(ctx);
        });

        it("resets the clip region", () => {
            const ctx = createTestContext();
            const result = ctx.resetClip();
            expect(result).toBe(ctx);
        });
    });

    describe("source color", () => {
        it("sets source RGB", () => {
            const ctx = createTestContext();
            const result = ctx.setSourceRgb(1.0, 0.0, 0.0);
            expect(result).toBe(ctx);
        });

        it("sets source RGBA", () => {
            const ctx = createTestContext();
            const result = ctx.setSourceRgba(1.0, 0.0, 0.0, 0.5);
            expect(result).toBe(ctx);
        });

        it("sets a pattern as source", () => {
            const ctx = createTestContext();
            const pattern = Pattern.createLinear(0, 0, 100, 100);
            pattern.addColorStopRgb(0, 1, 0, 0);
            pattern.addColorStopRgb(1, 0, 0, 1);
            const result = ctx.setSource(pattern);
            expect(result).toBe(ctx);
        });
    });

    describe("line settings", () => {
        it("sets line width", () => {
            const ctx = createTestContext();
            const result = ctx.setLineWidth(2.5);
            expect(result).toBe(ctx);
        });

        it("sets line cap", () => {
            const ctx = createTestContext();
            const result = ctx.setLineCap(0);
            expect(result).toBe(ctx);
        });

        it("sets line join", () => {
            const ctx = createTestContext();
            const result = ctx.setLineJoin(0);
            expect(result).toBe(ctx);
        });

        it("sets dash pattern", () => {
            const ctx = createTestContext();
            const result = ctx.setDash([5, 3], 0);
            expect(result).toBe(ctx);
        });
    });

    describe("fill rule", () => {
        it("sets and gets the fill rule", () => {
            const ctx = createTestContext();
            ctx.setFillRule(1);
            expect(ctx.getFillRule()).toBe(1);
        });
    });

    describe("transformations", () => {
        it("saves and restores state", () => {
            const ctx = createTestContext();
            ctx.save();
            ctx.translate(10, 10);
            ctx.restore();
            ctx.moveTo(0, 0);
            const point = ctx.getCurrentPoint();
            expect(point?.x).toBeCloseTo(0);
            expect(point?.y).toBeCloseTo(0);
        });

        it("translates the coordinate system", () => {
            const ctx = createTestContext();
            const result = ctx.translate(50, 50);
            expect(result).toBe(ctx);
        });

        it("scales the coordinate system", () => {
            const ctx = createTestContext();
            const result = ctx.scale(2, 2);
            expect(result).toBe(ctx);
        });

        it("rotates the coordinate system", () => {
            const ctx = createTestContext();
            const result = ctx.rotate(Math.PI / 4);
            expect(result).toBe(ctx);
        });
    });

    describe("operator", () => {
        it("sets the compositing operator", () => {
            const ctx = createTestContext();
            const result = ctx.setOperator(0);
            expect(result).toBe(ctx);
        });
    });

    describe("text", () => {
        it("selects a font face", () => {
            const ctx = createTestContext();
            const result = ctx.selectFontFace("Sans", 0, 0);
            expect(result).toBe(ctx);
        });

        it("sets font size", () => {
            const ctx = createTestContext();
            const result = ctx.setFontSize(14);
            expect(result).toBe(ctx);
        });

        it("shows text", () => {
            const ctx = createTestContext();
            ctx.selectFontFace("Sans", 0, 0).setFontSize(14);
            const result = ctx.moveTo(10, 50).showText("Hello");
            expect(result).toBe(ctx);
        });

        it("adds text to path", () => {
            const ctx = createTestContext();
            ctx.selectFontFace("Sans", 0, 0).setFontSize(14);
            const result = ctx.moveTo(10, 50).textPath("Hello");
            expect(result).toBe(ctx);
        });

        it("measures text extents", () => {
            const ctx = createTestContext();
            ctx.selectFontFace("Sans", 0, 0).setFontSize(14);
            const extents = ctx.textExtents("Hello");
            expect(extents).toHaveProperty("xBearing");
            expect(extents).toHaveProperty("yBearing");
            expect(extents).toHaveProperty("width");
            expect(extents).toHaveProperty("height");
            expect(extents).toHaveProperty("xAdvance");
            expect(extents).toHaveProperty("yAdvance");
            expect(extents.width).toBeGreaterThan(0);
        });
    });

    describe("font options", () => {
        it("sets and gets font options", () => {
            const ctx = createTestContext();
            const options = FontOptions.create();
            ctx.setFontOptions(options);
            const retrieved = ctx.getFontOptions();
            expect(retrieved).not.toBeNull();
        });
    });

    describe("antialias", () => {
        it("sets and gets antialias mode", () => {
            const ctx = createTestContext();
            ctx.setAntialias(0);
            expect(ctx.getAntialias()).toBe(0);
        });
    });

    describe("page operations", () => {
        it("shows a page", () => {
            const ctx = createTestContext();
            const result = ctx.showPage();
            expect(result).toBe(ctx);
        });
    });

    describe("surface interaction", () => {
        it("gets the target surface", () => {
            const surface = createTestSurface();
            const ctx = surface.createContext();
            const target = ctx.getTarget();
            expect(target).not.toBeNull();
        });

        it("sets a surface as source", () => {
            const surface = createTestSurface();
            const ctx = surface.createContext();
            const result = ctx.setSourceSurface(surface, 0, 0);
            expect(result).toBe(ctx);
        });
    });
});

describe("Pattern", () => {
    describe("createLinear", () => {
        it("creates a linear gradient pattern", () => {
            const pattern = Pattern.createLinear(0, 0, 100, 100);
            expect(pattern).not.toBeNull();
            expect(pattern).toBeInstanceOf(Pattern);
        });
    });

    describe("createRadial", () => {
        it("creates a radial gradient pattern", () => {
            const pattern = Pattern.createRadial(50, 50, 10, 50, 50, 50);
            expect(pattern).not.toBeNull();
            expect(pattern).toBeInstanceOf(Pattern);
        });
    });

    describe("addColorStopRgb", () => {
        it("adds an RGB color stop to a gradient", () => {
            const pattern = Pattern.createLinear(0, 0, 100, 0);
            const result = pattern.addColorStopRgb(0, 1, 0, 0);
            expect(result).toBe(pattern);
        });
    });

    describe("addColorStopRgba", () => {
        it("adds an RGBA color stop to a gradient", () => {
            const pattern = Pattern.createLinear(0, 0, 100, 0);
            const result = pattern.addColorStopRgba(0.5, 0, 1, 0, 0.5);
            expect(result).toBe(pattern);
        });
    });
});

describe("FontOptions", () => {
    describe("create", () => {
        it("creates a new FontOptions instance", () => {
            const options = FontOptions.create();
            expect(options).not.toBeNull();
        });
    });

    describe("settings", () => {
        it("sets hint style", () => {
            const options = FontOptions.create();
            const result = options.setHintStyle(1);
            expect(result).toBe(options);
        });

        it("sets antialias", () => {
            const options = FontOptions.create();
            const result = options.setAntialias(1);
            expect(result).toBe(options);
        });

        it("sets hint metrics", () => {
            const options = FontOptions.create();
            const result = options.setHintMetrics(1);
            expect(result).toBe(options);
        });

        it("sets subpixel order", () => {
            const options = FontOptions.create();
            const result = options.setSubpixelOrder(1);
            expect(result).toBe(options);
        });
    });
});

describe("Surface", () => {
    describe("createContext", () => {
        it("creates a context from a surface", () => {
            const surface = createTestSurface();
            const ctx = surface.createContext();
            expect(ctx).not.toBeNull();
            expect(ctx).toBeInstanceOf(Context);
        });
    });

    describe("finish", () => {
        it("finishes a surface", () => {
            const surface = createTestSurface();
            expect(() => surface.finish()).not.toThrow();
        });
    });

    describe("createSimilar", () => {
        it("creates a similar surface", () => {
            const surface = createTestSurface();
            const similar = surface.createSimilar("COLOR_ALPHA", 100, 100);
            expect(similar).not.toBeNull();
            expect(similar).toBeInstanceOf(Surface);
        });
    });
});

describe("PdfSurface", () => {
    it("creates a PDF surface with given dimensions", () => {
        const tmpPath = "/tmp/gtkx-test-cairo.pdf";
        try {
            const surface = new PdfSurface(tmpPath, 612, 792);
            expect(surface).toBeInstanceOf(Surface);
            const ctx = surface.createContext();
            ctx.setSourceRgb(0, 0, 0).selectFontFace("Sans", 0, 0).setFontSize(12);
            ctx.moveTo(72, 72).showText("Test PDF");
            surface.finish();
            expect(existsSync(tmpPath)).toBe(true);
        } finally {
            if (existsSync(tmpPath)) unlinkSync(tmpPath);
        }
    });
});
