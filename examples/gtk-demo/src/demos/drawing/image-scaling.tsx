import * as cairo from "@gtkx/ffi/cairo";
import * as Gtk from "@gtkx/ffi/gtk";
import { GtkBox, GtkDrawingArea, GtkFrame, GtkLabel, GtkPicture } from "@gtkx/react";
import { useCallback, useEffect, useRef } from "react";
import type { Demo } from "../types.js";
import sourceCode from "./image-scaling.tsx?raw";

// Content fit mode descriptions
const CONTENT_FIT_MODES = [
    {
        mode: Gtk.ContentFit.FILL,
        name: "FILL",
        description: "Stretch to fill, ignoring aspect ratio",
    },
    {
        mode: Gtk.ContentFit.CONTAIN,
        name: "CONTAIN",
        description: "Scale to fit, preserving aspect ratio (may letterbox)",
    },
    {
        mode: Gtk.ContentFit.COVER,
        name: "COVER",
        description: "Scale to cover, preserving aspect ratio (may crop)",
    },
    {
        mode: Gtk.ContentFit.SCALE_DOWN,
        name: "SCALE_DOWN",
        description: "Like CONTAIN, but never scales up",
    },
];

// Draw a sample image pattern for demonstration
const drawSampleImage = (
    cr: cairo.Context,
    width: number,
    height: number,
    sourceWidth: number,
    sourceHeight: number,
    fitMode: Gtk.ContentFit,
) => {
    // Calculate scaling based on fit mode
    let scale = 1;
    let offsetX = 0;
    let offsetY = 0;
    let drawWidth = sourceWidth;
    let drawHeight = sourceHeight;

    const scaleX = width / sourceWidth;
    const scaleY = height / sourceHeight;

    switch (fitMode) {
        case Gtk.ContentFit.FILL:
            // Stretch to fill
            drawWidth = width;
            drawHeight = height;
            break;
        case Gtk.ContentFit.CONTAIN:
            // Fit inside, preserving aspect ratio
            scale = Math.min(scaleX, scaleY);
            drawWidth = sourceWidth * scale;
            drawHeight = sourceHeight * scale;
            offsetX = (width - drawWidth) / 2;
            offsetY = (height - drawHeight) / 2;
            break;
        case Gtk.ContentFit.COVER:
            // Cover the area, may crop
            scale = Math.max(scaleX, scaleY);
            drawWidth = sourceWidth * scale;
            drawHeight = sourceHeight * scale;
            offsetX = (width - drawWidth) / 2;
            offsetY = (height - drawHeight) / 2;
            break;
        case Gtk.ContentFit.SCALE_DOWN:
            // Like contain, but never scale up
            scale = Math.min(1, Math.min(scaleX, scaleY));
            drawWidth = sourceWidth * scale;
            drawHeight = sourceHeight * scale;
            offsetX = (width - drawWidth) / 2;
            offsetY = (height - drawHeight) / 2;
            break;
    }

    // Draw background to show letterboxing/cropping
    cairo.setSourceRgb(cr, 0.15, 0.15, 0.15);
    cairo.rectangle(cr, 0, 0, width, height);
    cairo.fill(cr);

    // Clip to container (for COVER mode)
    cairo.save(cr);
    cairo.rectangle(cr, 0, 0, width, height);
    cairo.clip(cr);

    // Draw the "image" content
    cairo.save(cr);
    cairo.translate(cr, offsetX, offsetY);

    // Gradient background
    const pattern = cairo.patternCreateLinear(0, 0, drawWidth, drawHeight);
    cairo.patternAddColorStopRgb(pattern, 0, 0.2, 0.5, 0.8);
    cairo.patternAddColorStopRgb(pattern, 1, 0.8, 0.3, 0.5);
    cairo.setSource(cr, pattern);
    cairo.rectangle(cr, 0, 0, drawWidth, drawHeight);
    cairo.fill(cr);

    // Draw a grid to show scaling
    cairo.setSourceRgba(cr, 1, 1, 1, 0.3);
    cairo.setLineWidth(cr, 1);
    const gridSize = drawWidth / 5;
    for (let i = 0; i <= 5; i++) {
        const x = i * gridSize;
        cairo.moveTo(cr, x, 0);
        cairo.lineTo(cr, x, drawHeight);
        cairo.stroke(cr);
        const y = i * (drawHeight / 5);
        cairo.moveTo(cr, 0, y);
        cairo.lineTo(cr, drawWidth, y);
        cairo.stroke(cr);
    }

    // Draw center circle
    cairo.setSourceRgba(cr, 1, 1, 1, 0.7);
    cairo.arc(cr, drawWidth / 2, drawHeight / 2, Math.min(drawWidth, drawHeight) / 4, 0, 2 * Math.PI);
    cairo.fill(cr);

    // Draw border
    cairo.setSourceRgb(cr, 1, 1, 1);
    cairo.setLineWidth(cr, 2);
    cairo.rectangle(cr, 1, 1, drawWidth - 2, drawHeight - 2);
    cairo.stroke(cr);

    cairo.restore(cr);
    cairo.restore(cr);
};

// Component for each content fit demo
const ContentFitDemo = ({ mode, name, description }: { mode: Gtk.ContentFit; name: string; description: string }) => {
    const ref = useRef<Gtk.DrawingArea | null>(null);

    const drawFunc = useCallback(
        (_self: Gtk.DrawingArea, cr: cairo.Context, width: number, height: number) => {
            // Source image is 100x60 (wide)
            drawSampleImage(cr, width, height, 100, 60, mode);
        },
        [mode],
    );

    useEffect(() => {
        if (ref.current) {
            ref.current.setDrawFunc(drawFunc);
        }
    }, [drawFunc]);

    return (
        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={6} halign={Gtk.Align.CENTER}>
            <GtkDrawingArea ref={ref} contentWidth={120} contentHeight={100} cssClasses={["card"]} />
            <GtkLabel label={name} cssClasses={["heading"]} />
            <GtkLabel label={description} wrap cssClasses={["dim-label", "caption"]} widthChars={20} />
        </GtkBox>
    );
};

// Component for showing different source aspect ratios
const AspectRatioDemo = ({
    sourceWidth,
    sourceHeight,
    label,
}: {
    sourceWidth: number;
    sourceHeight: number;
    label: string;
}) => {
    const ref = useRef<Gtk.DrawingArea | null>(null);

    const drawFunc = useCallback(
        (_self: Gtk.DrawingArea, cr: cairo.Context, width: number, height: number) => {
            drawSampleImage(cr, width, height, sourceWidth, sourceHeight, Gtk.ContentFit.CONTAIN);
        },
        [sourceWidth, sourceHeight],
    );

    useEffect(() => {
        if (ref.current) {
            ref.current.setDrawFunc(drawFunc);
        }
    }, [drawFunc]);

    return (
        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={6} halign={Gtk.Align.CENTER}>
            <GtkDrawingArea ref={ref} contentWidth={100} contentHeight={100} cssClasses={["card"]} />
            <GtkLabel label={label} cssClasses={["dim-label", "caption"]} />
        </GtkBox>
    );
};

const ImageScalingDemo = () => {
    return (
        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={24}>
            <GtkLabel label="Image Scaling" cssClasses={["title-2"]} halign={Gtk.Align.START} />

            <GtkLabel
                label="GtkPicture displays images with different scaling behaviors controlled by the content-fit property. This demo shows how each mode handles aspect ratio and scaling."
                wrap
                halign={Gtk.Align.START}
                cssClasses={["dim-label"]}
            />

            {/* Content Fit Modes */}
            <GtkFrame label="ContentFit Modes">
                <GtkBox
                    orientation={Gtk.Orientation.HORIZONTAL}
                    spacing={24}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                    halign={Gtk.Align.CENTER}
                >
                    {CONTENT_FIT_MODES.map((item) => (
                        <ContentFitDemo
                            key={item.name}
                            mode={item.mode}
                            name={item.name}
                            description={item.description}
                        />
                    ))}
                </GtkBox>
            </GtkFrame>

            {/* Different Aspect Ratios */}
            <GtkFrame label="Aspect Ratio Handling">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={12}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkLabel
                        label="How CONTAIN mode handles different source aspect ratios in a square container:"
                        wrap
                        halign={Gtk.Align.START}
                        cssClasses={["dim-label"]}
                    />
                    <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={24} halign={Gtk.Align.CENTER}>
                        <AspectRatioDemo sourceWidth={160} sourceHeight={90} label="16:9 Wide" />
                        <AspectRatioDemo sourceWidth={100} sourceHeight={100} label="1:1 Square" />
                        <AspectRatioDemo sourceWidth={90} sourceHeight={160} label="9:16 Tall" />
                        <AspectRatioDemo sourceWidth={200} sourceHeight={50} label="4:1 Ultra-wide" />
                    </GtkBox>
                </GtkBox>
            </GtkFrame>

            {/* GtkPicture Widget */}
            <GtkFrame label="GtkPicture Widget">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={12}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkLabel
                        label="GtkPicture is the recommended widget for displaying images. It supports various image sources and content fit modes."
                        wrap
                        halign={Gtk.Align.START}
                        cssClasses={["dim-label"]}
                    />
                    <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={24} halign={Gtk.Align.CENTER}>
                        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={6} halign={Gtk.Align.CENTER}>
                            <GtkPicture
                                canShrink
                                contentFit={Gtk.ContentFit.CONTAIN}
                                widthRequest={120}
                                heightRequest={80}
                                cssClasses={["card"]}
                            />
                            <GtkLabel label="CONTAIN" cssClasses={["dim-label", "caption"]} />
                        </GtkBox>
                        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={6} halign={Gtk.Align.CENTER}>
                            <GtkPicture
                                canShrink
                                contentFit={Gtk.ContentFit.COVER}
                                widthRequest={120}
                                heightRequest={80}
                                cssClasses={["card"]}
                            />
                            <GtkLabel label="COVER" cssClasses={["dim-label", "caption"]} />
                        </GtkBox>
                        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={6} halign={Gtk.Align.CENTER}>
                            <GtkPicture
                                canShrink
                                contentFit={Gtk.ContentFit.FILL}
                                widthRequest={120}
                                heightRequest={80}
                                cssClasses={["card"]}
                            />
                            <GtkLabel label="FILL" cssClasses={["dim-label", "caption"]} />
                        </GtkBox>
                    </GtkBox>
                    <GtkLabel
                        label="Note: Set the 'file' prop on GtkPicture to load an image file."
                        halign={Gtk.Align.CENTER}
                        cssClasses={["dim-label"]}
                    />
                </GtkBox>
            </GtkFrame>

            {/* Scaling Quality */}
            <GtkFrame label="Scaling Considerations">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={8}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkLabel label="Best Practices:" halign={Gtk.Align.START} cssClasses={["heading"]} />
                    <GtkLabel
                        label="1. Use CONTAIN for galleries and thumbnails where full image visibility matters"
                        wrap
                        halign={Gtk.Align.START}
                        cssClasses={["dim-label"]}
                    />
                    <GtkLabel
                        label="2. Use COVER for hero images and backgrounds where filling the space is priority"
                        wrap
                        halign={Gtk.Align.START}
                        cssClasses={["dim-label"]}
                    />
                    <GtkLabel
                        label="3. Use SCALE_DOWN to prevent upscaling small images (avoids pixelation)"
                        wrap
                        halign={Gtk.Align.START}
                        cssClasses={["dim-label"]}
                    />
                    <GtkLabel
                        label="4. Avoid FILL for photos as it distorts aspect ratio"
                        wrap
                        halign={Gtk.Align.START}
                        cssClasses={["dim-label"]}
                    />
                    <GtkLabel
                        label="5. Set canShrink={true} to allow GtkPicture to be smaller than natural size"
                        wrap
                        halign={Gtk.Align.START}
                        cssClasses={["dim-label"]}
                    />
                </GtkBox>
            </GtkFrame>

            {/* GtkPicture API */}
            <GtkFrame label="GtkPicture API">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={8}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkLabel label="Key Properties:" halign={Gtk.Align.START} cssClasses={["heading"]} />
                    <GtkLabel
                        label={`file="path/to/image.png"  - Load image from file
contentFit={Gtk.ContentFit.CONTAIN} - Scaling mode
canShrink={true}  - Allow shrinking below natural size
keepAspectRatio={true}  - Maintain aspect ratio (deprecated, use contentFit)
alternativeText="..."  - Accessibility description`}
                        halign={Gtk.Align.START}
                        cssClasses={["monospace"]}
                    />
                </GtkBox>
            </GtkFrame>
        </GtkBox>
    );
};

export const imageScalingDemo: Demo = {
    id: "image-scaling",
    title: "Image Scaling",
    description: "Image content-fit modes and scaling quality with GtkPicture",
    keywords: ["image", "scaling", "GtkPicture", "content-fit", "contain", "cover", "fill", "aspect-ratio", "resize"],
    component: ImageScalingDemo,
    sourceCode,
};
