import * as Gtk from "@gtkx/ffi/gtk";
import { GtkBox, GtkButton } from "@gtkx/react";
import { useLayoutEffect, useRef } from "react";
import type { Demo } from "../types.js";
import sourceCode from "./constraints.tsx?raw";

type ConstraintTarget = Gtk.Widget | Gtk.ConstraintGuide | null;

const createSpaceGuide = (layout: Gtk.ConstraintLayout) => {
    const guide = new Gtk.ConstraintGuide();
    guide.setName("space");
    guide.setMinSize(10, 10);
    guide.setNatSize(100, 10);
    guide.setMaxSize(200, 20);
    guide.setStrength(Gtk.ConstraintStrength.STRONG);
    layout.addGuide(guide);
    return guide;
};

interface ConstraintArgs {
    target: ConstraintTarget;
    targetAttribute: Gtk.ConstraintAttribute;
    relation?: Gtk.ConstraintRelation;
    source: ConstraintTarget;
    sourceAttribute: Gtk.ConstraintAttribute;
    multiplier?: number;
    constant: number;
}

const addConstraint = (layout: Gtk.ConstraintLayout, args: ConstraintArgs) => {
    layout.addConstraint(
        Gtk.Constraint.new(
            args.target,
            args.targetAttribute,
            args.relation ?? Gtk.ConstraintRelation.EQ,
            args.source,
            args.sourceAttribute,
            args.multiplier ?? 1,
            args.constant,
            Gtk.ConstraintStrength.REQUIRED,
        ),
    );
};

interface ConstraintRefs {
    button1: Gtk.Button;
    button2: Gtk.Button;
    button3: Gtk.Button;
    guide: Gtk.ConstraintGuide;
}

const addAllConstraints = (layout: Gtk.ConstraintLayout, refs: ConstraintRefs) => {
    const { button1, button2, button3, guide } = refs;
    const A = Gtk.ConstraintAttribute;

    layout.addConstraint(
        Gtk.Constraint.newConstant(button1, A.WIDTH, Gtk.ConstraintRelation.LE, 200, Gtk.ConstraintStrength.REQUIRED),
    );

    const constraints: ConstraintArgs[] = [
        { target: button1, targetAttribute: A.START, source: null, sourceAttribute: A.START, constant: 8 },
        { target: button1, targetAttribute: A.WIDTH, source: button2, sourceAttribute: A.WIDTH, constant: 0 },
        { target: button1, targetAttribute: A.END, source: guide, sourceAttribute: A.START, constant: 0 },
        { target: guide, targetAttribute: A.END, source: button2, sourceAttribute: A.START, constant: 0 },
        { target: button2, targetAttribute: A.END, source: null, sourceAttribute: A.END, constant: -8 },
        { target: button3, targetAttribute: A.START, source: null, sourceAttribute: A.START, constant: 8 },
        { target: button3, targetAttribute: A.END, source: null, sourceAttribute: A.END, constant: -8 },
        { target: button1, targetAttribute: A.TOP, source: null, sourceAttribute: A.TOP, constant: 8 },
        { target: button2, targetAttribute: A.TOP, source: null, sourceAttribute: A.TOP, constant: 8 },
        { target: button1, targetAttribute: A.BOTTOM, source: button3, sourceAttribute: A.TOP, constant: -12 },
        { target: button2, targetAttribute: A.BOTTOM, source: button3, sourceAttribute: A.TOP, constant: -12 },
        { target: button3, targetAttribute: A.HEIGHT, source: button1, sourceAttribute: A.HEIGHT, constant: 0 },
        { target: button3, targetAttribute: A.HEIGHT, source: button2, sourceAttribute: A.HEIGHT, constant: 0 },
        { target: button3, targetAttribute: A.BOTTOM, source: null, sourceAttribute: A.BOTTOM, constant: -8 },
    ];
    for (const c of constraints) addConstraint(layout, c);
};

const ConstraintsDemo = () => {
    const containerRef = useRef<Gtk.Box | null>(null);
    const button1Ref = useRef<Gtk.Button | null>(null);
    const button2Ref = useRef<Gtk.Button | null>(null);
    const button3Ref = useRef<Gtk.Button | null>(null);

    useLayoutEffect(() => {
        const container = containerRef.current;
        const button1 = button1Ref.current;
        const button2 = button2Ref.current;
        const button3 = button3Ref.current;
        if (!container || !button1 || !button2 || !button3) return;

        const layout = new Gtk.ConstraintLayout();
        container.setLayoutManager(layout);
        const guide = createSpaceGuide(layout);
        addAllConstraints(layout, { button1, button2, button3, guide });
    }, []);

    return (
        <GtkBox ref={containerRef} hexpand vexpand>
            <GtkButton ref={button1Ref} label="Child 1" />
            <GtkButton ref={button2Ref} label="Child 2" />
            <GtkButton ref={button3Ref} label="Child 3" />
        </GtkBox>
    );
};

export const constraintsDemo: Demo = {
    id: "constraints",
    title: "Constraints/Simple Constraints",
    description:
        'GtkConstraintLayout provides a layout manager that uses relations between widgets (also known as "constraints") to compute the position and size of each child. In addition to child widgets, the constraints can involve spacer objects (also known as "guides"). This example has a guide between the two buttons in the top row. Try resizing the window to see how the constraints react to update the layout.',
    keywords: ["constraint", "layout", "GtkConstraintLayout", "GtkConstraint", "guide", "GtkLayoutManager"],
    component: ConstraintsDemo,
    sourceCode,
    defaultWidth: 260,
};
