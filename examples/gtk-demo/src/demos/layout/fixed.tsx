import { css, cx } from "@gtkx/css";
import * as Gdk from "@gtkx/ffi/gdk";
import * as Graphene from "@gtkx/ffi/graphene";
import * as Gsk from "@gtkx/ffi/gsk";
import * as Gtk from "@gtkx/ffi/gtk";
import { GtkBox, GtkButton, GtkFixed, GtkFrame, GtkLabel, GtkScale, x } from "@gtkx/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Demo } from "../types.js";
import sourceCode from "./fixed.tsx?raw";

const canvasStyle = css`
    background: linear-gradient(135deg, alpha(@window_bg_color, 0.95), alpha(@window_bg_color, 0.85));
    border-radius: 12px;
`;

const faceStyle = css`
    min-width: 120px;
    min-height: 120px;
    border-radius: 8px;
    font-size: 24px;
    font-weight: bold;
`;

const faceColors: Record<string, string> = {
    front: css`background-color: alpha(@accent_bg_color, 0.9); color: @accent_fg_color;`,
    back: css`background-color: alpha(@success_bg_color, 0.9); color: @success_fg_color;`,
    left: css`background-color: alpha(@warning_bg_color, 0.9); color: @warning_fg_color;`,
    right: css`background-color: alpha(@error_bg_color, 0.9); color: @error_fg_color;`,
    top: css`background-color: alpha(@purple_3, 0.9); color: white;`,
    bottom: css`background-color: alpha(@blue_3, 0.9); color: white;`,
};

interface CubeFace {
    name: string;
    label: string;
    rotateX: number;
    rotateY: number;
    translateZ: number;
}

const CUBE_FACES: CubeFace[] = [
    { name: "front", label: "Front", rotateX: 0, rotateY: 0, translateZ: 60 },
    { name: "back", label: "Back", rotateX: 0, rotateY: 180, translateZ: 60 },
    { name: "left", label: "Left", rotateX: 0, rotateY: -90, translateZ: 60 },
    { name: "right", label: "Right", rotateX: 0, rotateY: 90, translateZ: 60 },
    { name: "top", label: "Top", rotateX: 90, rotateY: 0, translateZ: 60 },
    { name: "bottom", label: "Bottom", rotateX: -90, rotateY: 0, translateZ: 60 },
];

let AXIS_X: Graphene.Vec3 | null = null;
let AXIS_Y: Graphene.Vec3 | null = null;

function getAxisX(): Graphene.Vec3 {
    if (!AXIS_X) {
        AXIS_X = new Graphene.Vec3();
        AXIS_X.init(1, 0, 0);
    }
    return AXIS_X;
}

function getAxisY(): Graphene.Vec3 {
    if (!AXIS_Y) {
        AXIS_Y = new Graphene.Vec3();
        AXIS_Y.init(0, 1, 0);
    }
    return AXIS_Y;
}

function createCubeTransform(
    rotationX: number,
    rotationY: number,
    face: CubeFace,
    perspective: number,
    centerX: number,
    centerY: number,
): Gsk.Transform {
    const translateToCenter = new Graphene.Point3D();
    translateToCenter.init(centerX, centerY, 0);

    const translateBack = new Graphene.Point3D();
    translateBack.init(-centerX, -centerY, 0);

    const faceTranslate = new Graphene.Point3D();
    faceTranslate.init(0, 0, face.translateZ);

    const identity = new Gsk.Transform();
    const t1 = identity.translate3d(translateToCenter) ?? identity;
    const t2 = t1.perspective(perspective) ?? t1;
    const t3 = t2.rotate3d(rotationX + face.rotateX, getAxisX()) ?? t2;
    const t4 = t3.rotate3d(rotationY + face.rotateY, getAxisY()) ?? t3;
    const t5 = t4.translate3d(faceTranslate) ?? t4;
    const t6 = t5.translate3d(translateBack) ?? t5;

    return t6;
}

const FixedDemo = () => {
    const [rotationX, setRotationX] = useState(15);
    const [rotationY, setRotationY] = useState(25);
    const [perspective, setPerspective] = useState(800);
    const [isAnimating, setIsAnimating] = useState(false);

    const fixedRef = useRef<Gtk.Fixed | null>(null);
    const tickIdRef = useRef<number | null>(null);
    const lastFrameTimeRef = useRef<number | null>(null);
    const rotationYRef = useRef(rotationY);

    rotationYRef.current = rotationY;

    const centerX = 190;
    const centerY = 140;

    const tickCallback = useCallback((_widget: Gtk.Widget, frameClock: Gdk.FrameClock): boolean => {
        const frameTime = frameClock.getFrameTime();
        if (lastFrameTimeRef.current !== null) {
            const delta = (frameTime - lastFrameTimeRef.current) / 1_000_000;
            setRotationY((prev) => (prev + delta * 50) % 360);
            setRotationX(15 + Math.sin(frameTime / 1_000_000) * 10);
        }
        lastFrameTimeRef.current = frameTime;
        return true;
    }, []);

    const startAnimation = useCallback(() => {
        const fixed = fixedRef.current;
        if (!fixed || tickIdRef.current !== null) return;
        lastFrameTimeRef.current = null;
        tickIdRef.current = fixed.addTickCallback(tickCallback);
        setIsAnimating(true);
    }, [tickCallback]);

    const stopAnimation = useCallback(() => {
        const fixed = fixedRef.current;
        if (!fixed || tickIdRef.current === null) return;
        fixed.removeTickCallback(tickIdRef.current);
        tickIdRef.current = null;
        lastFrameTimeRef.current = null;
        setIsAnimating(false);
    }, []);

    const toggleAnimation = useCallback(() => {
        if (isAnimating) {
            stopAnimation();
        } else {
            startAnimation();
        }
    }, [isAnimating, startAnimation, stopAnimation]);

    useEffect(() => {
        return () => {
            if (fixedRef.current && tickIdRef.current !== null) {
                fixedRef.current.removeTickCallback(tickIdRef.current);
            }
        };
    }, []);

    const handleFixedRef = useCallback(
        (fixed: Gtk.Fixed | null) => {
            if (fixedRef.current && tickIdRef.current !== null) {
                fixedRef.current.removeTickCallback(tickIdRef.current);
                tickIdRef.current = null;
                setIsAnimating(false);
            }
            fixedRef.current = fixed;
        },
        [],
    );

    const faceTransforms = useMemo(() => {
        return CUBE_FACES.map((face) => ({
            face,
            transform: createCubeTransform(rotationX, rotationY, face, perspective, centerX, centerY),
        }));
    }, [rotationX, rotationY, perspective, centerX, centerY]);

    const resetRotation = useCallback(() => {
        setRotationX(15);
        setRotationY(25);
    }, []);

    return (
        <GtkBox
            orientation={Gtk.Orientation.VERTICAL}
            spacing={20}
            marginStart={20}
            marginEnd={20}
            marginTop={20}
            marginBottom={20}
        >
            <GtkLabel label="3D Cube Transform" cssClasses={["title-2"]} halign={Gtk.Align.START} />

            <GtkLabel
                label="GtkFixed supports 3D transforms via GskTransform. Each face of this cube is a widget with perspective projection and 3D rotation applied."
                wrap
                halign={Gtk.Align.START}
                cssClasses={["dim-label"]}
            />

            <GtkFrame label="3D Cube">
                <GtkFixed
                    ref={handleFixedRef}
                    widthRequest={380}
                    heightRequest={280}
                    cssClasses={[canvasStyle]}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    {faceTransforms.map(({ face, transform }) => (
                        <x.FixedChild key={face.name} x={centerX - 60} y={centerY - 60} transform={transform}>
                            <GtkLabel
                                label={face.label}
                                cssClasses={[cx(faceStyle, faceColors[face.name])]}
                                halign={Gtk.Align.CENTER}
                                valign={Gtk.Align.CENTER}
                            />
                        </x.FixedChild>
                    ))}
                </GtkFixed>
            </GtkFrame>

            <GtkFrame label="Controls">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={12}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkBox spacing={12}>
                        <GtkButton
                            onClicked={toggleAnimation}
                            cssClasses={isAnimating ? ["destructive-action"] : ["suggested-action"]}
                        >
                            <GtkLabel label={isAnimating ? "Stop Animation" : "Start Animation"} />
                        </GtkButton>
                        <GtkButton label="Reset" onClicked={resetRotation} />
                    </GtkBox>

                    <GtkBox spacing={12}>
                        <GtkLabel label="Rotation X:" widthChars={12} xalign={0} />
                        <GtkScale orientation={Gtk.Orientation.HORIZONTAL} hexpand drawValue={false}>
                            <x.Adjustment
                                value={rotationX}
                                lower={-180}
                                upper={180}
                                stepIncrement={1}
                                pageIncrement={10}
                                onValueChanged={setRotationX}
                            />
                        </GtkScale>
                        <GtkLabel label={`${Math.round(rotationX)}°`} widthChars={5} xalign={1} />
                    </GtkBox>

                    <GtkBox spacing={12}>
                        <GtkLabel label="Rotation Y:" widthChars={12} xalign={0} />
                        <GtkScale orientation={Gtk.Orientation.HORIZONTAL} hexpand drawValue={false}>
                            <x.Adjustment
                                value={rotationY}
                                lower={-180}
                                upper={180}
                                stepIncrement={1}
                                pageIncrement={10}
                                onValueChanged={setRotationY}
                            />
                        </GtkScale>
                        <GtkLabel label={`${Math.round(rotationY)}°`} widthChars={5} xalign={1} />
                    </GtkBox>

                    <GtkBox spacing={12}>
                        <GtkLabel label="Perspective:" widthChars={12} xalign={0} />
                        <GtkScale orientation={Gtk.Orientation.HORIZONTAL} hexpand drawValue={false}>
                            <x.Adjustment
                                value={perspective}
                                lower={200}
                                upper={2000}
                                stepIncrement={50}
                                pageIncrement={100}
                                onValueChanged={setPerspective}
                            />
                        </GtkScale>
                        <GtkLabel label={`${Math.round(perspective)}px`} widthChars={8} xalign={1} />
                    </GtkBox>
                </GtkBox>
            </GtkFrame>

            <GtkFrame label="Implementation">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={6}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkBox spacing={12}>
                        <GtkLabel label="GskTransform" widthChars={16} xalign={0} cssClasses={["monospace"]} />
                        <GtkLabel label="Immutable 3D transformation object" cssClasses={["dim-label"]} />
                    </GtkBox>
                    <GtkBox spacing={12}>
                        <GtkLabel label="perspective()" widthChars={16} xalign={0} cssClasses={["monospace"]} />
                        <GtkLabel label="Apply perspective projection" cssClasses={["dim-label"]} />
                    </GtkBox>
                    <GtkBox spacing={12}>
                        <GtkLabel label="rotate3d()" widthChars={16} xalign={0} cssClasses={["monospace"]} />
                        <GtkLabel label="Rotate around arbitrary axis" cssClasses={["dim-label"]} />
                    </GtkBox>
                    <GtkBox spacing={12}>
                        <GtkLabel label="translate3d()" widthChars={16} xalign={0} cssClasses={["monospace"]} />
                        <GtkLabel label="Translate in 3D space" cssClasses={["dim-label"]} />
                    </GtkBox>
                    <GtkBox spacing={12}>
                        <GtkLabel label="x.FixedChild" widthChars={16} xalign={0} cssClasses={["monospace"]} />
                        <GtkLabel label="Apply transform via transform prop" cssClasses={["dim-label"]} />
                    </GtkBox>
                </GtkBox>
            </GtkFrame>
        </GtkBox>
    );
};

export const fixedDemo: Demo = {
    id: "fixed",
    title: "Fixed Layout / 3D Cube",
    description: "3D cube with GskTransform perspective and rotation",
    keywords: [
        "fixed",
        "3D",
        "cube",
        "transform",
        "perspective",
        "rotation",
        "GskTransform",
        "GtkFixed",
        "FixedChild",
    ],
    component: FixedDemo,
    sourceCode,
};
