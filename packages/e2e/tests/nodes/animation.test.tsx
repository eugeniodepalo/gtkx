import { CallbackAnimationTarget, TimedAnimation } from "@gtkx/ffi/adw";
import type * as Gtk from "@gtkx/ffi/gtk";
import { GtkBox, GtkLabel, x } from "@gtkx/react";
import { render, tick, waitFor } from "@gtkx/testing";
import { createRef, useEffect, useRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

describe("render - Animation", () => {
    describe("Direct animation API", () => {
        it("creates and runs a simple timed animation", async () => {
            const _labelRef = createRef<Gtk.Label>();
            const values: number[] = [];

            function App() {
                const ref = useRef<Gtk.Label>(null);

                useEffect(() => {
                    const label = ref.current;
                    if (!label) return;

                    const target = new CallbackAnimationTarget((value) => {
                        values.push(value);
                        label.setOpacity(value);
                    });

                    const animation = new TimedAnimation(label, 0, 1, 100, target);
                    animation.play();

                    return () => {
                        animation.reset();
                    };
                }, []);

                return (
                    <GtkBox>
                        <GtkLabel ref={ref} label="Test" />
                    </GtkBox>
                );
            }

            await render(<App />);

            await waitFor(
                () => {
                    expect(values.length).toBeGreaterThan(0);
                },
                { timeout: 500 },
            );
        });
    });

    describe("AnimationNode - Opacity", () => {
        it("applies initial opacity immediately", async () => {
            const labelRef = createRef<Gtk.Label>();

            await render(
                <GtkBox>
                    <x.Animation initial={{ opacity: 0.5 }}>
                        <GtkLabel ref={labelRef} label="Animated" />
                    </x.Animation>
                </GtkBox>,
            );

            await tick();
            expect(labelRef.current?.getOpacity()).toBeCloseTo(0.5, 1);
        });

        it("animates opacity with timed transition", async () => {
            const labelRef = createRef<Gtk.Label>();
            let completed = false;

            await render(
                <GtkBox>
                    <x.Animation
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 100 }}
                        onAnimationComplete={() => {
                            completed = true;
                        }}
                    >
                        <GtkLabel ref={labelRef} label="Animated" />
                    </x.Animation>
                </GtkBox>,
            );

            await waitFor(() => expect(completed).toBe(true), { timeout: 500 });
            expect(labelRef.current?.getOpacity()).toBeCloseTo(1, 1);
        });

        it("animates opacity with spring transition", async () => {
            const labelRef = createRef<Gtk.Label>();
            let completed = false;

            await render(
                <GtkBox>
                    <x.Animation
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ type: "spring", stiffness: 100, damping: 10 }}
                        onAnimationComplete={() => {
                            completed = true;
                        }}
                    >
                        <GtkLabel ref={labelRef} label="Animated" />
                    </x.Animation>
                </GtkBox>,
            );

            await waitFor(() => expect(completed).toBe(true), { timeout: 2000 });
            expect(labelRef.current?.getOpacity()).toBeCloseTo(1, 1);
        });

        it("uses timed transition by default for opacity", async () => {
            const labelRef = createRef<Gtk.Label>();
            let completed = false;

            await render(
                <GtkBox>
                    <x.Animation
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        onAnimationComplete={() => {
                            completed = true;
                        }}
                    >
                        <GtkLabel ref={labelRef} label="Animated" />
                    </x.Animation>
                </GtkBox>,
            );

            await waitFor(() => expect(completed).toBe(true), { timeout: 1000 });
        });
    });

    describe("AnimationNode - Transform Properties", () => {
        it("applies initial x/y transform via CSS", async () => {
            const labelRef = createRef<Gtk.Label>();

            await render(
                <GtkBox>
                    <x.Animation initial={{ x: 10, y: 20 }}>
                        <GtkLabel ref={labelRef} label="Animated" />
                    </x.Animation>
                </GtkBox>,
            );

            await tick();
            const name = labelRef.current?.getName();
            expect(name).toMatch(/^gtkx-anim-/);
        });

        it("animates x property", async () => {
            let completed = false;

            await render(
                <GtkBox>
                    <x.Animation
                        initial={{ x: -50 }}
                        animate={{ x: 0 }}
                        transition={{ duration: 100 }}
                        onAnimationComplete={() => {
                            completed = true;
                        }}
                    >
                        <GtkLabel label="Animated" />
                    </x.Animation>
                </GtkBox>,
            );

            await waitFor(() => expect(completed).toBe(true), { timeout: 500 });
        });

        it("animates y property", async () => {
            let completed = false;

            await render(
                <GtkBox>
                    <x.Animation
                        initial={{ y: -50 }}
                        animate={{ y: 0 }}
                        transition={{ duration: 100 }}
                        onAnimationComplete={() => {
                            completed = true;
                        }}
                    >
                        <GtkLabel label="Animated" />
                    </x.Animation>
                </GtkBox>,
            );

            await waitFor(() => expect(completed).toBe(true), { timeout: 500 });
        });

        it("animates scale property", async () => {
            let completed = false;

            await render(
                <GtkBox>
                    <x.Animation
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 100 }}
                        onAnimationComplete={() => {
                            completed = true;
                        }}
                    >
                        <GtkLabel label="Animated" />
                    </x.Animation>
                </GtkBox>,
            );

            await waitFor(() => expect(completed).toBe(true), { timeout: 500 });
        });

        it("animates scaleX and scaleY independently", async () => {
            let completed = false;

            await render(
                <GtkBox>
                    <x.Animation
                        initial={{ scaleX: 0.5, scaleY: 2 }}
                        animate={{ scaleX: 1, scaleY: 1 }}
                        transition={{ duration: 100 }}
                        onAnimationComplete={() => {
                            completed = true;
                        }}
                    >
                        <GtkLabel label="Animated" />
                    </x.Animation>
                </GtkBox>,
            );

            await waitFor(() => expect(completed).toBe(true), { timeout: 500 });
        });

        it("animates rotate property", async () => {
            let completed = false;

            await render(
                <GtkBox>
                    <x.Animation
                        initial={{ rotate: -180 }}
                        animate={{ rotate: 0 }}
                        transition={{ duration: 100 }}
                        onAnimationComplete={() => {
                            completed = true;
                        }}
                    >
                        <GtkLabel label="Animated" />
                    </x.Animation>
                </GtkBox>,
            );

            await waitFor(() => expect(completed).toBe(true), { timeout: 500 });
        });

        it("uses spring transition by default for transform properties", async () => {
            let completed = false;

            await render(
                <GtkBox>
                    <x.Animation
                        initial={{ x: -50 }}
                        animate={{ x: 0 }}
                        onAnimationComplete={() => {
                            completed = true;
                        }}
                    >
                        <GtkLabel label="Animated" />
                    </x.Animation>
                </GtkBox>,
            );

            await waitFor(() => expect(completed).toBe(true), { timeout: 2000 });
        });
    });

    describe("AnimationNode - Multiple Properties", () => {
        it("animates opacity and x simultaneously", async () => {
            const labelRef = createRef<Gtk.Label>();
            let completed = false;

            await render(
                <GtkBox>
                    <x.Animation
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 100 }}
                        onAnimationComplete={() => {
                            completed = true;
                        }}
                    >
                        <GtkLabel ref={labelRef} label="Animated" />
                    </x.Animation>
                </GtkBox>,
            );

            await waitFor(
                () => {
                    expect(completed).toBe(true);
                    expect(labelRef.current?.getOpacity()).toBeCloseTo(1, 1);
                },
                { timeout: 500 },
            );
        });

        it("animates all transform properties together", async () => {
            let completed = false;

            await render(
                <GtkBox>
                    <x.Animation
                        initial={{ x: -50, y: -50, scale: 0, rotate: -90 }}
                        animate={{ x: 0, y: 0, scale: 1, rotate: 0 }}
                        transition={{ duration: 100 }}
                        onAnimationComplete={() => {
                            completed = true;
                        }}
                    >
                        <GtkLabel label="Animated" />
                    </x.Animation>
                </GtkBox>,
            );

            await waitFor(() => expect(completed).toBe(true), { timeout: 500 });
        });
    });

    describe("AnimationNode - Callbacks", () => {
        it("calls onAnimationComplete when animation finishes", async () => {
            const onComplete = vi.fn();

            await render(
                <GtkBox>
                    <x.Animation
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 50 }}
                        onAnimationComplete={onComplete}
                    >
                        <GtkLabel label="Animated" />
                    </x.Animation>
                </GtkBox>,
            );

            await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1), { timeout: 500 });
        });

        it("calls onAnimationComplete after all properties complete", async () => {
            const onComplete = vi.fn();

            await render(
                <GtkBox>
                    <x.Animation
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 50 }}
                        onAnimationComplete={onComplete}
                    >
                        <GtkLabel label="Animated" />
                    </x.Animation>
                </GtkBox>,
            );

            await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1), { timeout: 500 });
        });

        it("calls onAnimationComplete immediately when no animation needed", async () => {
            const onComplete = vi.fn();

            await render(
                <GtkBox>
                    <x.Animation
                        initial={{ opacity: 1 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 50 }}
                        onAnimationComplete={onComplete}
                    >
                        <GtkLabel label="Animated" />
                    </x.Animation>
                </GtkBox>,
            );

            await tick();
            await tick();
            expect(onComplete).toHaveBeenCalledTimes(1);
        });
    });

    describe("AnimationNode - Lifecycle", () => {
        it("removes animation wrapper without affecting child", async () => {
            const boxRef = createRef<Gtk.Box>();

            function App({ showAnimation }: { showAnimation: boolean }) {
                return (
                    <GtkBox ref={boxRef}>
                        {showAnimation ? (
                            <x.Animation initial={{ opacity: 1 }}>
                                <GtkLabel label="Animated" />
                            </x.Animation>
                        ) : (
                            <GtkLabel label="Static" />
                        )}
                    </GtkBox>
                );
            }

            await render(<App showAnimation={true} />);
            await tick();

            await render(<App showAnimation={false} />);
            await tick();

            let childCount = 0;
            let child = boxRef.current?.getFirstChild();
            while (child) {
                childCount++;
                child = child.getNextSibling();
            }
            expect(childCount).toBe(1);
        });

        it("restarts animation when animate prop changes", async () => {
            const labelRef = createRef<Gtk.Label>();

            function App({ targetOpacity }: { targetOpacity: number }) {
                return (
                    <GtkBox>
                        <x.Animation
                            initial={{ opacity: 0 }}
                            animate={{ opacity: targetOpacity }}
                            transition={{ duration: 50 }}
                        >
                            <GtkLabel ref={labelRef} label="Animated" />
                        </x.Animation>
                    </GtkBox>
                );
            }

            await render(<App targetOpacity={1} />);
            await waitFor(() => expect(labelRef.current?.getOpacity()).toBeCloseTo(1, 1), { timeout: 500 });

            await render(<App targetOpacity={0.5} />);
            await waitFor(() => expect(labelRef.current?.getOpacity()).toBeCloseTo(0.5, 1), { timeout: 500 });
        });

        it("cleans up CSS when widget unmounts", async () => {
            const labelRef = createRef<Gtk.Label>();

            function App({ show }: { show: boolean }) {
                return (
                    <GtkBox>
                        {show && (
                            <x.Animation initial={{ x: 10 }}>
                                <GtkLabel ref={labelRef} label="Animated" />
                            </x.Animation>
                        )}
                    </GtkBox>
                );
            }

            await render(<App show={true} />);
            await tick();
            const name = labelRef.current?.getName();
            expect(name).toMatch(/^gtkx-anim-/);

            await render(<App show={false} />);
            await tick();
        });

        it("handles rapid remounting with key changes", async () => {
            function App() {
                const [key, setKey] = useState(0);

                useEffect(() => {
                    const interval = setInterval(() => {
                        setKey((k) => k + 1);
                    }, 50);
                    return () => clearInterval(interval);
                }, []);

                return (
                    <GtkBox>
                        <x.Animation
                            key={key}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 100 }}
                        >
                            <GtkLabel label={`Key: ${key}`} />
                        </x.Animation>
                    </GtkBox>
                );
            }

            await render(<App />);
            await new Promise((resolve) => setTimeout(resolve, 300));
        });
    });

    describe("AnimationNode - Edge Cases", () => {
        it("handles animation with same from and to values", async () => {
            const onComplete = vi.fn();

            await render(
                <GtkBox>
                    <x.Animation
                        initial={{ opacity: 0.5 }}
                        animate={{ opacity: 0.5 }}
                        transition={{ duration: 50 }}
                        onAnimationComplete={onComplete}
                    >
                        <GtkLabel label="Animated" />
                    </x.Animation>
                </GtkBox>,
            );

            await tick();
            await tick();
            expect(onComplete).toHaveBeenCalled();
        });

        it("handles animation without initial prop", async () => {
            const labelRef = createRef<Gtk.Label>();
            let completed = false;

            await render(
                <GtkBox>
                    <x.Animation
                        animate={{ opacity: 0.5 }}
                        transition={{ duration: 50 }}
                        onAnimationComplete={() => {
                            completed = true;
                        }}
                    >
                        <GtkLabel ref={labelRef} label="Animated" />
                    </x.Animation>
                </GtkBox>,
            );

            await waitFor(() => expect(completed).toBe(true), { timeout: 500 });
            expect(labelRef.current?.getOpacity()).toBeCloseTo(0.5, 1);
        });

        it("handles negative transform values", async () => {
            let completed = false;

            await render(
                <GtkBox>
                    <x.Animation
                        initial={{ x: 0, y: 0, rotate: 0 }}
                        animate={{ x: -100, y: -100, rotate: -360 }}
                        transition={{ duration: 100 }}
                        onAnimationComplete={() => {
                            completed = true;
                        }}
                    >
                        <GtkLabel label="Animated" />
                    </x.Animation>
                </GtkBox>,
            );

            await waitFor(() => expect(completed).toBe(true), { timeout: 500 });
        });

        it("handles scale values less than 1", async () => {
            let completed = false;

            await render(
                <GtkBox>
                    <x.Animation
                        initial={{ scale: 1 }}
                        animate={{ scale: 0.5 }}
                        transition={{ duration: 100 }}
                        onAnimationComplete={() => {
                            completed = true;
                        }}
                    >
                        <GtkLabel label="Animated" />
                    </x.Animation>
                </GtkBox>,
            );

            await waitFor(() => expect(completed).toBe(true), { timeout: 500 });
        });

        it("handles scale values greater than 1", async () => {
            let completed = false;

            await render(
                <GtkBox>
                    <x.Animation
                        initial={{ scale: 1 }}
                        animate={{ scale: 2 }}
                        transition={{ duration: 100 }}
                        onAnimationComplete={() => {
                            completed = true;
                        }}
                    >
                        <GtkLabel label="Animated" />
                    </x.Animation>
                </GtkBox>,
            );

            await waitFor(() => expect(completed).toBe(true), { timeout: 500 });
        });
    });
});
