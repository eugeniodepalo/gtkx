import * as Adw from "@gtkx/ffi/adw";
import * as Gtk from "@gtkx/ffi/gtk";
import { AdwPreferencesGroup, GtkBox, GtkButton, GtkFrame, GtkLabel, x } from "@gtkx/react";
import { useState } from "react";

const FadeInDemo = () => {
    const [key, setKey] = useState(0);

    return (
        <GtkBox spacing={12} valign={Gtk.Align.CENTER}>
            <x.Animation key={key} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 500 }}>
                <GtkLabel label="Fade In" cssClasses={["title-2"]} />
            </x.Animation>
            <GtkButton label="Replay" onClicked={() => setKey((k) => k + 1)} />
        </GtkBox>
    );
};

const SlideInDemo = () => {
    const [key, setKey] = useState(0);

    return (
        <GtkBox spacing={12} valign={Gtk.Align.CENTER}>
            <x.Animation
                key={key}
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 400 }}
            >
                <GtkLabel label="Slide In" cssClasses={["title-2"]} />
            </x.Animation>
            <GtkButton label="Replay" onClicked={() => setKey((k) => k + 1)} />
        </GtkBox>
    );
};

const SpringDemo = () => {
    const [key, setKey] = useState(0);

    return (
        <GtkBox spacing={12} valign={Gtk.Align.CENTER}>
            <x.Animation
                key={key}
                initial={{ opacity: 0, y: -30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
            >
                <GtkLabel label="Spring Animation" cssClasses={["title-2"]} />
            </x.Animation>
            <GtkButton label="Replay" onClicked={() => setKey((k) => k + 1)} />
        </GtkBox>
    );
};

const BouncyDemo = () => {
    const [key, setKey] = useState(0);

    return (
        <GtkBox spacing={12} valign={Gtk.Align.CENTER}>
            <x.Animation
                key={key}
                initial={{ y: -100 }}
                animate={{ y: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 10 }}
            >
                <GtkLabel label="Bouncy!" cssClasses={["title-1"]} />
            </x.Animation>
            <GtkButton label="Replay" onClicked={() => setKey((k) => k + 1)} />
        </GtkBox>
    );
};

const ScaleRotateDemo = () => {
    const [key, setKey] = useState(0);

    return (
        <GtkBox spacing={12} valign={Gtk.Align.CENTER}>
            <x.Animation
                key={key}
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 12 }}
            >
                <GtkLabel label="Pop!" cssClasses={["title-1"]} />
            </x.Animation>
            <GtkButton label="Replay" onClicked={() => setKey((k) => k + 1)} />
        </GtkBox>
    );
};

const EasingDemo = () => {
    const [key, setKey] = useState(0);

    return (
        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={12}>
            <GtkBox spacing={12}>
                <x.Animation
                    key={key}
                    initial={{ x: 0 }}
                    animate={{ x: 150 }}
                    transition={{ duration: 1000, easing: Adw.Easing.EASE_IN_OUT_CUBIC }}
                >
                    <GtkLabel label="Ease In Out" />
                </x.Animation>
            </GtkBox>
            <GtkBox spacing={12}>
                <x.Animation
                    key={key}
                    initial={{ x: 0 }}
                    animate={{ x: 150 }}
                    transition={{ duration: 1000, easing: Adw.Easing.EASE_OUT_BOUNCE }}
                >
                    <GtkLabel label="Ease Out Bounce" />
                </x.Animation>
            </GtkBox>
            <GtkBox spacing={12}>
                <x.Animation
                    key={key}
                    initial={{ x: 0 }}
                    animate={{ x: 150 }}
                    transition={{ duration: 1000, easing: Adw.Easing.EASE_OUT_ELASTIC }}
                >
                    <GtkLabel label="Ease Out Elastic" />
                </x.Animation>
            </GtkBox>
            <GtkButton label="Replay All" onClicked={() => setKey((k) => k + 1)} halign={Gtk.Align.START} />
        </GtkBox>
    );
};

const CallbackDemo = () => {
    const [status, setStatus] = useState("Ready");
    const [key, setKey] = useState(0);

    return (
        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={12} halign={Gtk.Align.CENTER}>
            <x.Animation
                key={key}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 500 }}
                onAnimationComplete={() => setStatus("Complete!")}
            >
                <GtkLabel label={`Status: ${status}`} cssClasses={["title-3"]} />
            </x.Animation>
            <GtkButton
                label="Replay"
                onClicked={() => {
                    setStatus("Animating...");
                    setKey((k) => k + 1);
                }}
            />
        </GtkBox>
    );
};

export const AnimationDemo = () => {
    return (
        <GtkBox
            orientation={Gtk.Orientation.VERTICAL}
            spacing={24}
            marginTop={24}
            marginBottom={24}
            marginStart={24}
            marginEnd={24}
        >
            <GtkLabel label="Animation Components" cssClasses={["title-1"]} halign={Gtk.Align.START} />

            <AdwPreferencesGroup title="x.Animation - Fade In" description="Simple opacity animation">
                <GtkFrame marginTop={12}>
                    <GtkBox marginTop={24} marginBottom={24} marginStart={24} marginEnd={24} halign={Gtk.Align.CENTER}>
                        <FadeInDemo />
                    </GtkBox>
                </GtkFrame>
            </AdwPreferencesGroup>

            <AdwPreferencesGroup title="x.Animation - Slide In" description="Combined opacity and x transform">
                <GtkFrame marginTop={12}>
                    <GtkBox marginTop={24} marginBottom={24} marginStart={24} marginEnd={24} halign={Gtk.Align.CENTER}>
                        <SlideInDemo />
                    </GtkBox>
                </GtkFrame>
            </AdwPreferencesGroup>

            <AdwPreferencesGroup title="x.Animation - Spring Physics" description="Natural spring-based animations">
                <GtkFrame marginTop={12}>
                    <GtkBox marginTop={24} marginBottom={24} marginStart={24} marginEnd={24} halign={Gtk.Align.CENTER}>
                        <SpringDemo />
                    </GtkBox>
                </GtkFrame>
            </AdwPreferencesGroup>

            <AdwPreferencesGroup title="x.Animation - Bouncy Spring" description="Low damping for bouncy effect">
                <GtkFrame marginTop={12}>
                    <GtkBox marginTop={24} marginBottom={24} marginStart={24} marginEnd={24} halign={Gtk.Align.CENTER}>
                        <BouncyDemo />
                    </GtkBox>
                </GtkFrame>
            </AdwPreferencesGroup>

            <AdwPreferencesGroup
                title="x.Animation - Scale &amp;amp; Rotate"
                description="Transform animations with spring"
            >
                <GtkFrame marginTop={12}>
                    <GtkBox marginTop={24} marginBottom={24} marginStart={24} marginEnd={24} halign={Gtk.Align.CENTER}>
                        <ScaleRotateDemo />
                    </GtkBox>
                </GtkFrame>
            </AdwPreferencesGroup>

            <AdwPreferencesGroup title="x.Animation - Easing Functions" description="Different Adw.Easing curves">
                <GtkFrame marginTop={12}>
                    <GtkBox marginTop={24} marginBottom={24} marginStart={24} marginEnd={24}>
                        <EasingDemo />
                    </GtkBox>
                </GtkFrame>
            </AdwPreferencesGroup>

            <AdwPreferencesGroup title="x.Animation - Callbacks" description="onAnimationComplete callback">
                <GtkFrame marginTop={12}>
                    <GtkBox marginTop={24} marginBottom={24} marginStart={24} marginEnd={24} halign={Gtk.Align.CENTER}>
                        <CallbackDemo />
                    </GtkBox>
                </GtkFrame>
            </AdwPreferencesGroup>
        </GtkBox>
    );
};
