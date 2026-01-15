import { css } from "@gtkx/css";
import * as Gdk from "@gtkx/ffi/gdk";
import * as Graphene from "@gtkx/ffi/graphene";
import * as Gsk from "@gtkx/ffi/gsk";
import * as Gtk from "@gtkx/ffi/gtk";
import { GtkBox, GtkFixed, GtkFrame, GtkImage, GtkLabel, x } from "@gtkx/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Demo } from "../types.js";
import sourceCode from "./layoutmanager2.tsx?raw";

const THETA_STEPS = 18;
const PHI_STEPS = 36;
const ICON_COUNT = THETA_STEPS * PHI_STEPS;
const RADIUS = 300;
const ICON_SIZE = 32;
const CONTAINER_SIZE = 600;

const DEG_TO_RAD = Math.PI / 180;
const STEP_ANGLE = 10;

const containerStyle = css`
    background: linear-gradient(135deg, alpha(@window_bg_color, 0.95), alpha(@window_bg_color, 0.85));
    border-radius: 12px;
`;

const ICON_NAMES = [
    "folder-symbolic",
    "document-symbolic",
    "image-x-generic-symbolic",
    "audio-x-generic-symbolic",
    "video-x-generic-symbolic",
    "application-x-executable-symbolic",
    "text-x-generic-symbolic",
    "mail-unread-symbolic",
    "user-home-symbolic",
    "emblem-favorite-symbolic",
    "starred-symbolic",
    "emblem-system-symbolic",
];

function sphereX(r: number, theta: number, phi: number): number {
    return r * Math.sin(theta) * Math.cos(phi);
}

function sphereY(r: number, theta: number, _phi: number): number {
    return r * Math.cos(theta);
}

function sphereZ(r: number, theta: number, phi: number): number {
    return r * Math.sin(theta) * Math.sin(phi);
}

function mapOffset(offset: number, value: number): number {
    let result = value - offset;
    while (result < 0) result += 360;
    while (result >= 360) result -= 360;
    if (result >= 180) result = 360 - result;
    return result;
}

interface SphereIcon {
    id: number;
    thetaIndex: number;
    phiIndex: number;
    iconName: string;
}

const LayoutManager2Demo = () => {
    const [thetaOffset, setThetaOffset] = useState(70);
    const [phiOffset, setPhiOffset] = useState(0);

    const fixedRef = useRef<Gtk.Fixed | null>(null);
    const tickIdRef = useRef<number | null>(null);
    const lastFrameTimeRef = useRef<number | null>(null);
    const [isAnimating, setIsAnimating] = useState(false);

    const centerX = CONTAINER_SIZE / 2;
    const centerY = CONTAINER_SIZE / 2;

    const icons = useMemo<SphereIcon[]>(() => {
        return Array.from({ length: ICON_COUNT }, (_, i) => ({
            id: i,
            thetaIndex: Math.floor(i / PHI_STEPS),
            phiIndex: i % PHI_STEPS,
            iconName: ICON_NAMES[i % ICON_NAMES.length] ?? "folder-symbolic",
        }));
    }, []);

    const getIconTransform = useCallback(
        (thetaIdx: number, phiIdx: number) => {
            const theta1 = mapOffset(thetaOffset, thetaIdx * STEP_ANGLE) * DEG_TO_RAD;
            const theta2 = mapOffset(thetaOffset, (thetaIdx + 1) * STEP_ANGLE) * DEG_TO_RAD;
            const phi1 = mapOffset(phiOffset, phiIdx * STEP_ANGLE) * DEG_TO_RAD;
            const phi2 = mapOffset(phiOffset, (phiIdx + 1) * STEP_ANGLE) * DEG_TO_RAD;

            const z1 = sphereZ(RADIUS, theta1, phi1);
            const z2 = sphereZ(RADIUS, theta2, phi1);
            const z3 = sphereZ(RADIUS, theta1, phi2);
            const z4 = sphereZ(RADIUS, theta2, phi2);

            if (z1 > 0 && z2 > 0 && z3 > 0 && z4 > 0) {
                return null;
            }

            const avgTheta = (theta1 + theta2) / 2;
            const avgPhi = (phi1 + phi2) / 2;

            const sx = sphereX(RADIUS, avgTheta, avgPhi);
            const sy = sphereY(RADIUS, avgTheta, avgPhi);
            const sz = sphereZ(RADIUS, avgTheta, avgPhi);

            const screenX = centerX + sx - ICON_SIZE / 2;
            const screenY = centerY - sy - ICON_SIZE / 2;

            const scale = Math.max(0.3, (RADIUS - sz) / (2 * RADIUS));
            const opacity = Math.max(0.2, Math.min(1, (RADIUS - sz) / RADIUS));

            const scalePoint = new Graphene.Point();
            scalePoint.init(ICON_SIZE / 2, ICON_SIZE / 2);

            let t = new Gsk.Transform();
            t = t.scale(scale, scale) ?? t;

            return { x: screenX, y: screenY, transform: t, opacity, zIndex: Math.round(RADIUS - sz) };
        },
        [centerX, centerY, thetaOffset, phiOffset],
    );

    const visibleIcons = useMemo(() => {
        return icons
            .map((icon) => {
                const result = getIconTransform(icon.thetaIndex, icon.phiIndex);
                if (!result) return null;
                return { ...icon, ...result };
            })
            .filter((icon): icon is NonNullable<typeof icon> => icon !== null)
            .sort((a, b) => a.zIndex - b.zIndex);
    }, [icons, getIconTransform]);

    const tickCallback = useCallback((_widget: Gtk.Widget, frameClock: Gdk.FrameClock): boolean => {
        const frameTime = frameClock.getFrameTime();
        if (lastFrameTimeRef.current !== null) {
            const delta = (frameTime - lastFrameTimeRef.current) / 1_000_000;
            setPhiOffset((prev) => (prev + delta * 20) % 360);
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

    const handleFixedRef = useCallback((fixed: Gtk.Fixed | null) => {
        if (fixedRef.current && tickIdRef.current !== null) {
            fixedRef.current.removeTickCallback(tickIdRef.current);
            tickIdRef.current = null;
            setIsAnimating(false);
        }
        fixedRef.current = fixed;
    }, []);

    const handleKeyPressed = useCallback(
        (keyval: number, _keycode: number, _state: Gdk.ModifierType) => {
            const step = 5;
            switch (keyval) {
                case Gdk.KEY_Up:
                    setThetaOffset((prev) => Math.max(0, prev - step));
                    return true;
                case Gdk.KEY_Down:
                    setThetaOffset((prev) => Math.min(180, prev + step));
                    return true;
                case Gdk.KEY_Left:
                    setPhiOffset((prev) => (prev - step + 360) % 360);
                    return true;
                case Gdk.KEY_Right:
                    setPhiOffset((prev) => (prev + step) % 360);
                    return true;
                case Gdk.KEY_space:
                    toggleAnimation();
                    return true;
                default:
                    return false;
            }
        },
        [toggleAnimation],
    );

    return (
        <GtkBox
            orientation={Gtk.Orientation.VERTICAL}
            spacing={20}
            marginStart={20}
            marginEnd={20}
            marginTop={20}
            marginBottom={20}
        >
            <GtkFrame label="3D Icon Sphere">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={12}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkLabel
                        label="Use arrow keys to rotate the sphere, Space to toggle auto-rotation"
                        wrap
                        cssClasses={["dim-label"]}
                    />

                    <GtkFixed
                        ref={handleFixedRef}
                        widthRequest={CONTAINER_SIZE}
                        heightRequest={CONTAINER_SIZE}
                        cssClasses={[containerStyle]}
                        halign={Gtk.Align.CENTER}
                        focusable
                        canFocus
                        onKeyPressed={handleKeyPressed}
                    >
                        {visibleIcons.map((icon) => (
                            <x.FixedChild
                                key={icon.id}
                                x={icon.x}
                                y={icon.y}
                                transform={icon.transform}
                            >
                                <GtkImage
                                    iconName={icon.iconName}
                                    iconSize={Gtk.IconSize.LARGE}
                                    opacity={icon.opacity}
                                />
                            </x.FixedChild>
                        ))}
                    </GtkFixed>

                    <GtkBox spacing={12} halign={Gtk.Align.CENTER}>
                        <GtkLabel
                            label={`θ: ${Math.round(thetaOffset)}° | φ: ${Math.round(phiOffset)}° | Visible: ${visibleIcons.length}/${ICON_COUNT}`}
                            cssClasses={["dim-label", "monospace"]}
                        />
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
                        <GtkLabel label="Grid" widthChars={16} xalign={0} cssClasses={["monospace"]} />
                        <GtkLabel label={`${THETA_STEPS} × ${PHI_STEPS} = ${ICON_COUNT} icons`} cssClasses={["dim-label"]} />
                    </GtkBox>
                    <GtkBox spacing={12}>
                        <GtkLabel label="Sphere coords" widthChars={16} xalign={0} cssClasses={["monospace"]} />
                        <GtkLabel label="x=r·sin(θ)·cos(φ), y=r·cos(θ), z=r·sin(θ)·sin(φ)" cssClasses={["dim-label"]} />
                    </GtkBox>
                    <GtkBox spacing={12}>
                        <GtkLabel label="Back-face cull" widthChars={16} xalign={0} cssClasses={["monospace"]} />
                        <GtkLabel label="Hide icons where z > 0 (facing away)" cssClasses={["dim-label"]} />
                    </GtkBox>
                    <GtkBox spacing={12}>
                        <GtkLabel label="Depth scale" widthChars={16} xalign={0} cssClasses={["monospace"]} />
                        <GtkLabel label="Scale and opacity based on z-depth" cssClasses={["dim-label"]} />
                    </GtkBox>
                </GtkBox>
            </GtkFrame>
        </GtkBox>
    );
};

export const layoutManager2Demo: Demo = {
    id: "layoutmanager2",
    title: "Layout Manager/3D Sphere",
    description: "648 icons arranged on a 3D sphere with rotation",
    keywords: ["layout", "3D", "sphere", "transform", "rotation", "icons", "perspective"],
    component: LayoutManager2Demo,
    sourceCode,
};
