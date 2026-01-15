import { css } from "@gtkx/css";
import * as Gdk from "@gtkx/ffi/gdk";
import * as Graphene from "@gtkx/ffi/graphene";
import * as Gsk from "@gtkx/ffi/gsk";
import * as Gtk from "@gtkx/ffi/gtk";
import { GtkBox, GtkButton, GtkFixed, GtkFrame, GtkLabel, GtkScale, x } from "@gtkx/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Demo } from "../types.js";
import sourceCode from "./fixed.tsx?raw";

const faceStyles: Record<string, string> = {
    front: css`frame& { border: 2px solid white; background-color: rgba(228, 0, 0, 0.8); }`,
    back: css`frame& { border: 2px solid white; background-color: rgba(228, 0, 0, 0.8); }`,
    left: css`frame& { border: 2px solid white; background-color: rgba(127, 231, 25, 0.8); }`,
    right: css`frame& { border: 2px solid white; background-color: rgba(127, 231, 25, 0.8); }`,
    top: css`frame& { border: 2px solid white; background-color: rgba(114, 159, 207, 0.8); }`,
    bottom: css`frame& { border: 2px solid white; background-color: rgba(114, 159, 207, 0.8); }`,
};

const canvasStyle = css`
    background: linear-gradient(135deg, alpha(@window_bg_color, 0.95), alpha(@window_bg_color, 0.85));
    border-radius: 12px;
`;

const FACE_SIZE = 200;
const HALF_FACE = FACE_SIZE / 2;

interface CubeFace {
    name: string;
    label: string;
    rotateX: number;
    rotateY: number;
}

const CUBE_FACES: CubeFace[] = [
    { name: "front", label: "Front", rotateX: 0, rotateY: 0 },
    { name: "back", label: "Back", rotateX: 0, rotateY: 180 },
    { name: "left", label: "Left", rotateX: 0, rotateY: -90 },
    { name: "right", label: "Right", rotateX: 0, rotateY: 90 },
    { name: "top", label: "Top", rotateX: 90, rotateY: 0 },
    { name: "bottom", label: "Bottom", rotateX: -90, rotateY: 0 },
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
    centerX: number,
    centerY: number,
    globalRotationX: number,
    globalRotationY: number,
    face: CubeFace,
    perspectiveDepth: number,
): Gsk.Transform {
    const w = HALF_FACE;
    const h = HALF_FACE;
    const d = HALF_FACE;

    const centerPoint = new Graphene.Point();
    centerPoint.init(centerX, centerY);

    const depthAdjust = new Graphene.Point3D();
    depthAdjust.init(0, 0, -FACE_SIZE / 6);

    const forwardOffset = new Graphene.Point3D();
    forwardOffset.init(0, 0, d);

    const centeringOffset = new Graphene.Point3D();
    centeringOffset.init(-w, -h, 0);

    let t = new Gsk.Transform();
    t = t.translate(centerPoint) ?? t;
    t = t.perspective(perspectiveDepth) ?? t;
    t = t.rotate3d(globalRotationX, getAxisX()) ?? t;
    t = t.rotate3d(globalRotationY, getAxisY()) ?? t;
    t = t.translate3d(depthAdjust) ?? t;
    t = t.rotate3d(face.rotateX, getAxisX()) ?? t;
    t = t.rotate3d(face.rotateY, getAxisY()) ?? t;
    t = t.translate3d(forwardOffset) ?? t;
    t = t.translate3d(centeringOffset) ?? t;

    return t;
}

const FixedDemo = () => {
    const [rotationX, setRotationX] = useState(-30);
    const [rotationY, setRotationY] = useState(135);
    const [perspective, setPerspective] = useState(FACE_SIZE * 3);
    const [isAnimating, setIsAnimating] = useState(false);

    const fixedRef = useRef<Gtk.Fixed | null>(null);
    const tickIdRef = useRef<number | null>(null);
    const lastFrameTimeRef = useRef<number | null>(null);
    const rotationYRef = useRef(rotationY);

    rotationYRef.current = rotationY;

    const centerX = 250;
    const centerY = 200;

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
            transform: createCubeTransform(centerX, centerY, rotationX, rotationY, face, perspective),
        }));
    }, [centerX, centerY, rotationX, rotationY, perspective]);

    const resetRotation = useCallback(() => {
        setRotationX(-30);
        setRotationY(135);
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
            <GtkFrame label="3D Cube">
                <GtkFixed
                    ref={handleFixedRef}
                    widthRequest={500}
                    heightRequest={400}
                    cssClasses={[canvasStyle]}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    {faceTransforms.map(({ face, transform }) => (
                        <x.FixedChild
                            key={face.name}
                            x={0}
                            y={0}
                            transform={transform}
                        >
                            <GtkFrame
                                widthRequest={FACE_SIZE}
                                heightRequest={FACE_SIZE}
                                cssClasses={[faceStyles[face.name] ?? ""]}
                            >
                                <GtkLabel
                                    label={face.label}
                                    halign={Gtk.Align.CENTER}
                                    valign={Gtk.Align.CENTER}
                                    hexpand
                                    vexpand
                                />
                            </GtkFrame>
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
                        <GtkLabel label={`${Math.round(rotationX)}°`} widthChars={6} xalign={1} />
                    </GtkBox>

                    <GtkBox spacing={12}>
                        <GtkLabel label="Rotation Y:" widthChars={12} xalign={0} />
                        <GtkScale orientation={Gtk.Orientation.HORIZONTAL} hexpand drawValue={false}>
                            <x.Adjustment
                                value={rotationY}
                                lower={0}
                                upper={360}
                                stepIncrement={1}
                                pageIncrement={10}
                                onValueChanged={setRotationY}
                            />
                        </GtkScale>
                        <GtkLabel label={`${Math.round(rotationY)}°`} widthChars={6} xalign={1} />
                    </GtkBox>

                    <GtkBox spacing={12}>
                        <GtkLabel label="Perspective:" widthChars={12} xalign={0} />
                        <GtkScale orientation={Gtk.Orientation.HORIZONTAL} hexpand drawValue={false}>
                            <x.Adjustment
                                value={perspective}
                                lower={300}
                                upper={1500}
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
