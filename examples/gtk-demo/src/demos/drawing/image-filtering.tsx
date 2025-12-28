import * as cairo from "@gtkx/ffi/cairo";
import * as Gtk from "@gtkx/ffi/gtk";
import { GtkBox, GtkButton, GtkDrawingArea, GtkFrame, GtkLabel, GtkScale } from "@gtkx/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Demo } from "../types.js";
import sourceCode from "./image-filtering.tsx?raw";

// Filter types
type FilterType = "none" | "blur" | "sharpen" | "brightness" | "contrast" | "grayscale" | "sepia";

// Convolution kernel definitions
const KERNELS = {
    blur: [
        [1 / 9, 1 / 9, 1 / 9],
        [1 / 9, 1 / 9, 1 / 9],
        [1 / 9, 1 / 9, 1 / 9],
    ],
    sharpen: [
        [0, -1, 0],
        [-1, 5, -1],
        [0, -1, 0],
    ],
    emboss: [
        [-2, -1, 0],
        [-1, 1, 1],
        [0, 1, 2],
    ],
    edgeDetect: [
        [-1, -1, -1],
        [-1, 8, -1],
        [-1, -1, -1],
    ],
};

// Generate a sample "image" as pixel data
const generateSampleImage = (width: number, height: number): number[][] => {
    const data: number[][] = [];
    for (let y = 0; y < height; y++) {
        const row: number[] = [];
        for (let x = 0; x < width; x++) {
            // Create a colorful pattern
            const cx = width / 2;
            const cy = height / 2;
            const dx = x - cx;
            const dy = y - cy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const maxDist = Math.sqrt(cx * cx + cy * cy);

            // RGB values
            const r = Math.sin((x / width) * Math.PI * 2) * 0.5 + 0.5;
            const g = Math.sin((y / height) * Math.PI * 2) * 0.5 + 0.5;
            const b = 1 - dist / maxDist;

            row.push(r, g, b);
        }
        data.push(row);
    }
    return data;
};

// Apply convolution kernel to image data
const applyConvolution = (data: number[][], kernel: number[][]): number[][] => {
    const height = data.length;
    const firstRow = data[0];
    if (!firstRow) return [];
    const width = firstRow.length / 3;
    const result: number[][] = [];
    const kSize = kernel.length;
    const kHalf = Math.floor(kSize / 2);

    for (let y = 0; y < height; y++) {
        const row: number[] = [];
        for (let x = 0; x < width; x++) {
            let r = 0,
                g = 0,
                b = 0;

            for (let ky = 0; ky < kSize; ky++) {
                for (let kx = 0; kx < kSize; kx++) {
                    const sy = Math.min(Math.max(y + ky - kHalf, 0), height - 1);
                    const sx = Math.min(Math.max(x + kx - kHalf, 0), width - 1);
                    const weight = kernel[ky]?.[kx] ?? 0;
                    const dataRow = data[sy];
                    r += (dataRow?.[sx * 3] ?? 0) * weight;
                    g += (dataRow?.[sx * 3 + 1] ?? 0) * weight;
                    b += (dataRow?.[sx * 3 + 2] ?? 0) * weight;
                }
            }

            row.push(Math.max(0, Math.min(1, r)), Math.max(0, Math.min(1, g)), Math.max(0, Math.min(1, b)));
        }
        result.push(row);
    }
    return result;
};

// Apply brightness adjustment
const applyBrightness = (data: number[][], factor: number): number[][] => {
    return data.map((row) => row.map((v) => Math.max(0, Math.min(1, v + factor))));
};

// Apply contrast adjustment
const applyContrast = (data: number[][], factor: number): number[][] => {
    return data.map((row) => row.map((v) => Math.max(0, Math.min(1, (v - 0.5) * factor + 0.5))));
};

// Apply grayscale
const applyGrayscale = (data: number[][]): number[][] => {
    return data.map((row) => {
        const result: number[] = [];
        for (let i = 0; i < row.length; i += 3) {
            const gray = (row[i] ?? 0) * 0.299 + (row[i + 1] ?? 0) * 0.587 + (row[i + 2] ?? 0) * 0.114;
            result.push(gray, gray, gray);
        }
        return result;
    });
};

// Apply sepia
const applySepia = (data: number[][]): number[][] => {
    return data.map((row) => {
        const result: number[] = [];
        for (let i = 0; i < row.length; i += 3) {
            const r = row[i] ?? 0;
            const g = row[i + 1] ?? 0;
            const b = row[i + 2] ?? 0;
            result.push(
                Math.min(1, r * 0.393 + g * 0.769 + b * 0.189),
                Math.min(1, r * 0.349 + g * 0.686 + b * 0.168),
                Math.min(1, r * 0.272 + g * 0.534 + b * 0.131),
            );
        }
        return result;
    });
};

// Draw pixel data to cairo context
const drawPixelData = (cr: cairo.Context, data: number[][], x: number, y: number, scale: number) => {
    const height = data.length;
    const firstRow = data[0];
    if (!firstRow) return;
    const width = firstRow.length / 3;

    for (let py = 0; py < height; py++) {
        for (let px = 0; px < width; px++) {
            const dataRow = data[py];
            const r = dataRow?.[px * 3] ?? 0;
            const g = dataRow?.[px * 3 + 1] ?? 0;
            const b = dataRow?.[px * 3 + 2] ?? 0;
            cairo.setSourceRgb(cr, r, g, b);
            cairo.rectangle(cr, x + px * scale, y + py * scale, scale, scale);
            cairo.fill(cr);
        }
    }
};

// Filter preview component
const FilterPreview = ({
    filter,
    label,
    isActive,
    onSelect,
}: {
    filter: FilterType;
    label: string;
    isActive: boolean;
    onSelect: () => void;
}) => {
    const ref = useRef<Gtk.DrawingArea | null>(null);
    const imageData = useRef(generateSampleImage(20, 20));

    const drawFunc = useCallback(
        (_self: Gtk.DrawingArea, cr: cairo.Context, width: number, height: number) => {
            // Background
            cairo.setSourceRgb(cr, 0.1, 0.1, 0.1);
            cairo.rectangle(cr, 0, 0, width, height);
            cairo.fill(cr);

            let data = imageData.current;

            switch (filter) {
                case "blur":
                    data = applyConvolution(data, KERNELS.blur);
                    break;
                case "sharpen":
                    data = applyConvolution(data, KERNELS.sharpen);
                    break;
                case "brightness":
                    data = applyBrightness(data, 0.2);
                    break;
                case "contrast":
                    data = applyContrast(data, 1.5);
                    break;
                case "grayscale":
                    data = applyGrayscale(data);
                    break;
                case "sepia":
                    data = applySepia(data);
                    break;
            }

            const scale = Math.floor(Math.min(width, height) / 20);
            const offsetX = (width - 20 * scale) / 2;
            const offsetY = (height - 20 * scale) / 2;
            drawPixelData(cr, data, offsetX, offsetY, scale);

            // Active indicator
            if (isActive) {
                cairo.setSourceRgb(cr, 0.3, 0.6, 1);
                cairo.setLineWidth(cr, 3);
                cairo.rectangle(cr, 1.5, 1.5, width - 3, height - 3);
                cairo.stroke(cr);
            }
        },
        [filter, isActive],
    );

    useEffect(() => {
        if (ref.current) {
            ref.current.setDrawFunc(drawFunc);
        }
    }, [drawFunc]);

    return (
        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={4} halign={Gtk.Align.CENTER}>
            <GtkButton onClicked={onSelect} cssClasses={isActive ? ["suggested-action"] : []}>
                <GtkDrawingArea ref={ref} contentWidth={80} contentHeight={80} />
            </GtkButton>
            <GtkLabel label={label} cssClasses={["caption", isActive ? "heading" : "dim-label"]} />
        </GtkBox>
    );
};

// Main preview with adjustable parameters
const MainPreview = ({ filter, intensity }: { filter: FilterType; intensity: number }) => {
    const ref = useRef<Gtk.DrawingArea | null>(null);
    const imageData = useRef(generateSampleImage(40, 40));

    const drawFunc = useCallback(
        (_self: Gtk.DrawingArea, cr: cairo.Context, width: number, height: number) => {
            // Background
            cairo.setSourceRgb(cr, 0.05, 0.05, 0.05);
            cairo.rectangle(cr, 0, 0, width, height);
            cairo.fill(cr);

            let data = imageData.current;

            // Apply multiple passes for intensity
            const passes = Math.ceil(intensity);
            switch (filter) {
                case "blur":
                    for (let i = 0; i < passes; i++) {
                        data = applyConvolution(data, KERNELS.blur);
                    }
                    break;
                case "sharpen":
                    for (let i = 0; i < passes; i++) {
                        data = applyConvolution(data, KERNELS.sharpen);
                    }
                    break;
                case "brightness":
                    data = applyBrightness(data, (intensity - 1) * 0.3);
                    break;
                case "contrast":
                    data = applyContrast(data, intensity);
                    break;
                case "grayscale":
                    data = applyGrayscale(data);
                    break;
                case "sepia":
                    data = applySepia(data);
                    break;
            }

            const scale = Math.floor(Math.min(width, height) / 40);
            const offsetX = (width - 40 * scale) / 2;
            const offsetY = (height - 40 * scale) / 2;
            drawPixelData(cr, data, offsetX, offsetY, scale);
        },
        [filter, intensity],
    );

    useEffect(() => {
        if (ref.current) {
            ref.current.setDrawFunc(drawFunc);
        }
    }, [drawFunc]);

    return <GtkDrawingArea ref={ref} contentWidth={240} contentHeight={240} cssClasses={["card"]} />;
};

const ImageFilteringDemo = () => {
    const [activeFilter, setActiveFilter] = useState<FilterType>("none");
    const [intensity, setIntensity] = useState(1);

    const intensityAdj = useMemo(() => new Gtk.Adjustment(1, 0.5, 3, 0.1, 0.5, 0), []);

    useEffect(() => {
        intensityAdj.connect("value-changed", (adj: Gtk.Adjustment) => setIntensity(adj.getValue()));
    }, [intensityAdj]);

    const filters: { filter: FilterType; label: string }[] = [
        { filter: "none", label: "Original" },
        { filter: "blur", label: "Blur" },
        { filter: "sharpen", label: "Sharpen" },
        { filter: "brightness", label: "Brightness" },
        { filter: "contrast", label: "Contrast" },
        { filter: "grayscale", label: "Grayscale" },
        { filter: "sepia", label: "Sepia" },
    ];

    return (
        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={24}>
            <GtkLabel label="Image Filters" cssClasses={["title-2"]} halign={Gtk.Align.START} />

            <GtkLabel
                label="Demonstrates image filter effects using Cairo graphics. These filters are implemented as pixel-level operations including convolution kernels, color adjustments, and transforms."
                wrap
                halign={Gtk.Align.START}
                cssClasses={["dim-label"]}
            />

            <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={24}>
                {/* Main Preview */}
                <GtkFrame label="Preview">
                    <GtkBox
                        orientation={Gtk.Orientation.VERTICAL}
                        spacing={12}
                        marginTop={12}
                        marginBottom={12}
                        marginStart={12}
                        marginEnd={12}
                        halign={Gtk.Align.CENTER}
                    >
                        <MainPreview filter={activeFilter} intensity={intensity} />
                        <GtkLabel
                            label={`Filter: ${activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1)}`}
                            cssClasses={["heading"]}
                        />
                    </GtkBox>
                </GtkFrame>

                {/* Controls */}
                <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={16} hexpand>
                    {/* Intensity Slider */}
                    <GtkFrame label="Intensity">
                        <GtkBox
                            orientation={Gtk.Orientation.VERTICAL}
                            spacing={8}
                            marginTop={12}
                            marginBottom={12}
                            marginStart={12}
                            marginEnd={12}
                        >
                            <GtkScale
                                orientation={Gtk.Orientation.HORIZONTAL}
                                adjustment={intensityAdj}
                                drawValue
                                digits={1}
                                hexpand
                            />
                            <GtkButton
                                label="Reset"
                                onClicked={() => intensityAdj.setValue(1)}
                                halign={Gtk.Align.END}
                            />
                        </GtkBox>
                    </GtkFrame>

                    {/* Filter Info */}
                    <GtkFrame label="Current Filter">
                        <GtkBox
                            orientation={Gtk.Orientation.VERTICAL}
                            spacing={8}
                            marginTop={12}
                            marginBottom={12}
                            marginStart={12}
                            marginEnd={12}
                        >
                            {activeFilter === "blur" && (
                                <GtkLabel
                                    label="Box blur: Averages neighboring pixels using a 3x3 kernel. Multiple passes increase blur radius."
                                    wrap
                                    halign={Gtk.Align.START}
                                    cssClasses={["dim-label"]}
                                />
                            )}
                            {activeFilter === "sharpen" && (
                                <GtkLabel
                                    label="Sharpening: Enhances edges using a kernel that emphasizes the center pixel and subtracts neighbors."
                                    wrap
                                    halign={Gtk.Align.START}
                                    cssClasses={["dim-label"]}
                                />
                            )}
                            {activeFilter === "brightness" && (
                                <GtkLabel
                                    label="Brightness: Adds a constant value to all color channels. Intensity controls the offset amount."
                                    wrap
                                    halign={Gtk.Align.START}
                                    cssClasses={["dim-label"]}
                                />
                            )}
                            {activeFilter === "contrast" && (
                                <GtkLabel
                                    label="Contrast: Stretches values away from middle gray. Intensity > 1 increases contrast, < 1 decreases."
                                    wrap
                                    halign={Gtk.Align.START}
                                    cssClasses={["dim-label"]}
                                />
                            )}
                            {activeFilter === "grayscale" && (
                                <GtkLabel
                                    label="Grayscale: Converts to luminance using ITU-R BT.601 weights (0.299R + 0.587G + 0.114B)."
                                    wrap
                                    halign={Gtk.Align.START}
                                    cssClasses={["dim-label"]}
                                />
                            )}
                            {activeFilter === "sepia" && (
                                <GtkLabel
                                    label="Sepia: Applies a warm, vintage color tone using a color matrix transformation."
                                    wrap
                                    halign={Gtk.Align.START}
                                    cssClasses={["dim-label"]}
                                />
                            )}
                            {activeFilter === "none" && (
                                <GtkLabel
                                    label="No filter applied. Select a filter below to see the effect."
                                    wrap
                                    halign={Gtk.Align.START}
                                    cssClasses={["dim-label"]}
                                />
                            )}
                        </GtkBox>
                    </GtkFrame>
                </GtkBox>
            </GtkBox>

            {/* Filter Selection */}
            <GtkFrame label="Available Filters">
                <GtkBox
                    orientation={Gtk.Orientation.HORIZONTAL}
                    spacing={16}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                    halign={Gtk.Align.CENTER}
                >
                    {filters.map(({ filter, label }) => (
                        <FilterPreview
                            key={filter}
                            filter={filter}
                            label={label}
                            isActive={activeFilter === filter}
                            onSelect={() => setActiveFilter(filter)}
                        />
                    ))}
                </GtkBox>
            </GtkFrame>

            {/* Convolution Kernels */}
            <GtkFrame label="Convolution Kernels">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={12}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkLabel
                        label="Convolution applies a kernel matrix to each pixel, computing a weighted sum of the pixel and its neighbors. Different kernels produce different effects:"
                        wrap
                        halign={Gtk.Align.START}
                        cssClasses={["dim-label"]}
                    />
                    <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={24}>
                        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={4}>
                            <GtkLabel label="Box Blur (3x3)" cssClasses={["heading"]} halign={Gtk.Align.START} />
                            <GtkLabel
                                label={`[1/9] [1/9] [1/9]
[1/9] [1/9] [1/9]
[1/9] [1/9] [1/9]`}
                                cssClasses={["monospace"]}
                                halign={Gtk.Align.START}
                            />
                        </GtkBox>
                        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={4}>
                            <GtkLabel label="Sharpen" cssClasses={["heading"]} halign={Gtk.Align.START} />
                            <GtkLabel
                                label={`[ 0] [-1] [ 0]
[-1] [ 5] [-1]
[ 0] [-1] [ 0]`}
                                cssClasses={["monospace"]}
                                halign={Gtk.Align.START}
                            />
                        </GtkBox>
                        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={4}>
                            <GtkLabel label="Edge Detect" cssClasses={["heading"]} halign={Gtk.Align.START} />
                            <GtkLabel
                                label={`[-1] [-1] [-1]
[-1] [ 8] [-1]
[-1] [-1] [-1]`}
                                cssClasses={["monospace"]}
                                halign={Gtk.Align.START}
                            />
                        </GtkBox>
                    </GtkBox>
                </GtkBox>
            </GtkFrame>

            {/* Implementation Notes */}
            <GtkFrame label="Implementation Notes">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={8}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkLabel
                        label="These filters are implemented in JavaScript for demonstration. For production use:"
                        wrap
                        halign={Gtk.Align.START}
                        cssClasses={["dim-label"]}
                    />
                    <GtkLabel
                        label="1. Use GPU-accelerated rendering via GSK render nodes"
                        halign={Gtk.Align.START}
                        cssClasses={["dim-label"]}
                    />
                    <GtkLabel
                        label="2. Apply CSS filters for common effects (blur, grayscale, etc.)"
                        halign={Gtk.Align.START}
                        cssClasses={["dim-label"]}
                    />
                    <GtkLabel
                        label="3. Use GdkPixbuf for image loading and manipulation"
                        halign={Gtk.Align.START}
                        cssClasses={["dim-label"]}
                    />
                    <GtkLabel
                        label="4. Consider Cairo's built-in operators for alpha blending"
                        halign={Gtk.Align.START}
                        cssClasses={["dim-label"]}
                    />
                </GtkBox>
            </GtkFrame>
        </GtkBox>
    );
};

export const imageFilteringDemo: Demo = {
    id: "image-filtering",
    title: "Image Filters",
    description: "Image filters and effects using Cairo convolution",
    keywords: [
        "image",
        "filter",
        "blur",
        "sharpen",
        "grayscale",
        "sepia",
        "convolution",
        "cairo",
        "effect",
        "processing",
    ],
    component: ImageFilteringDemo,
    sourceCode,
};
