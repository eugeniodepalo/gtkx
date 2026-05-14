import * as Gtk from "@gtkx/ffi/gtk";
import { GtkBox, GtkButton } from "@gtkx/react";
import { type RefObject, useEffect, useRef } from "react";
import type { Demo } from "../types.js";
import sourceCode from "./constraints-interactive.tsx?raw";

function ConstraintsInteractive() {
    const containerRef = useRef<Gtk.Box>(null) as RefObject<Gtk.Box>;
    const button1Ref = useRef<Gtk.Button>(null) as RefObject<Gtk.Button>;
    const button2Ref = useRef<Gtk.Button>(null) as RefObject<Gtk.Button>;
    const button3Ref = useRef<Gtk.Button>(null) as RefObject<Gtk.Button>;
    const layoutRef = useRef<Gtk.ConstraintLayout>(null) as RefObject<Gtk.ConstraintLayout>;
    const guideRef = useRef<Gtk.ConstraintGuide>(null) as RefObject<Gtk.ConstraintGuide>;
    const constraintRef = useRef<Gtk.Constraint>(null) as RefObject<Gtk.Constraint | null>;

    useEffect(() => {
        if (!containerRef.current || !button1Ref.current || !button2Ref.current || !button3Ref.current) {
            return;
        }

        const layout = new Gtk.ConstraintLayout();
        layoutRef.current = layout;
        containerRef.current.setLayoutManager(layout);

        const guide = new Gtk.ConstraintGuide();
        guideRef.current = guide;
        layout.addGuide(guide);

        layout.addConstraint(
            Gtk.Constraint.newConstant(
                guide,
                Gtk.ConstraintAttribute.WIDTH,
                Gtk.ConstraintRelation.EQ,
                0,
                Gtk.ConstraintStrength.REQUIRED,
            ),
        );

        layout.addConstraint(
            Gtk.Constraint.new(
                button1Ref.current,
                Gtk.ConstraintAttribute.START,
                Gtk.ConstraintRelation.EQ,
                null,
                Gtk.ConstraintAttribute.START,
                1,
                8,
                Gtk.ConstraintStrength.REQUIRED,
            ),
        );

        layout.addConstraint(
            Gtk.Constraint.new(
                button1Ref.current,
                Gtk.ConstraintAttribute.END,
                Gtk.ConstraintRelation.EQ,
                guide,
                Gtk.ConstraintAttribute.START,
                1,
                0,
                Gtk.ConstraintStrength.REQUIRED,
            ),
        );

        layout.addConstraint(
            Gtk.Constraint.new(
                button2Ref.current,
                Gtk.ConstraintAttribute.START,
                Gtk.ConstraintRelation.EQ,
                guide,
                Gtk.ConstraintAttribute.END,
                1,
                0,
                Gtk.ConstraintStrength.REQUIRED,
            ),
        );

        layout.addConstraint(
            Gtk.Constraint.new(
                button2Ref.current,
                Gtk.ConstraintAttribute.END,
                Gtk.ConstraintRelation.EQ,
                null,
                Gtk.ConstraintAttribute.END,
                1,
                -8,
                Gtk.ConstraintStrength.REQUIRED,
            ),
        );

        layout.addConstraint(
            Gtk.Constraint.new(
                button3Ref.current,
                Gtk.ConstraintAttribute.START,
                Gtk.ConstraintRelation.EQ,
                null,
                Gtk.ConstraintAttribute.START,
                1,
                8,
                Gtk.ConstraintStrength.REQUIRED,
            ),
        );

        layout.addConstraint(
            Gtk.Constraint.new(
                button3Ref.current,
                Gtk.ConstraintAttribute.END,
                Gtk.ConstraintRelation.EQ,
                guide,
                Gtk.ConstraintAttribute.START,
                1,
                0,
                Gtk.ConstraintStrength.REQUIRED,
            ),
        );

        layout.addConstraint(
            Gtk.Constraint.new(
                button1Ref.current,
                Gtk.ConstraintAttribute.TOP,
                Gtk.ConstraintRelation.EQ,
                null,
                Gtk.ConstraintAttribute.TOP,
                1,
                8,
                Gtk.ConstraintStrength.REQUIRED,
            ),
        );

        layout.addConstraint(
            Gtk.Constraint.new(
                button2Ref.current,
                Gtk.ConstraintAttribute.TOP,
                Gtk.ConstraintRelation.EQ,
                button1Ref.current,
                Gtk.ConstraintAttribute.BOTTOM,
                1,
                0,
                Gtk.ConstraintStrength.REQUIRED,
            ),
        );

        layout.addConstraint(
            Gtk.Constraint.new(
                button3Ref.current,
                Gtk.ConstraintAttribute.TOP,
                Gtk.ConstraintRelation.EQ,
                button2Ref.current,
                Gtk.ConstraintAttribute.BOTTOM,
                1,
                0,
                Gtk.ConstraintStrength.REQUIRED,
            ),
        );

        layout.addConstraint(
            Gtk.Constraint.new(
                button3Ref.current,
                Gtk.ConstraintAttribute.BOTTOM,
                Gtk.ConstraintRelation.EQ,
                null,
                Gtk.ConstraintAttribute.BOTTOM,
                1,
                -8,
                Gtk.ConstraintStrength.REQUIRED,
            ),
        );

        const drag = new Gtk.GestureDrag();
        drag.connect("drag-update", (_gesture: Gtk.GestureDrag, offsetX: number, _offsetY: number) => {
            if (!layoutRef.current || !guideRef.current) return;

            const [success, startX] = drag.getStartPoint();
            if (!success) return;

            if (constraintRef.current) {
                layoutRef.current.removeConstraint(constraintRef.current);
            }

            constraintRef.current = Gtk.Constraint.newConstant(
                guideRef.current,
                Gtk.ConstraintAttribute.LEFT,
                Gtk.ConstraintRelation.EQ,
                startX + offsetX,
                Gtk.ConstraintStrength.REQUIRED,
            );
            layoutRef.current.addConstraint(constraintRef.current);
            containerRef.current?.queueAllocate();
        });
        containerRef.current.addController(drag);
    }, []);

    return (
        <GtkBox ref={containerRef} hexpand vexpand>
            <GtkButton ref={button1Ref} label="Child 1" />
            <GtkButton ref={button2Ref} label="Child 2" />
            <GtkButton ref={button3Ref} label="Child 3" />
        </GtkBox>
    );
}

export const constraintsInteractiveDemo: Demo = {
    id: "constraints-interactive",
    title: "Constraints/Interactive Constraints",
    description:
        "Interactively reposition a guide to see GtkConstraintLayout react to constraint changes in real time.",
    keywords: ["constraint", "layout", "GtkConstraintLayout", "GtkConstraint", "guide", "GtkLayoutManager"],
    component: ConstraintsInteractive,
    sourceCode,
    defaultWidth: 360,
};
