import * as Gdk from "@gtkx/ffi/gdk";
import * as Gtk from "@gtkx/ffi/gtk";
import { GtkBox, GtkButton, GtkFrame, GtkImage, GtkLabel, GtkOverlay, GtkSpinButton } from "@gtkx/react";
import { useEffect, useMemo, useState } from "react";
import type { Demo } from "../types.js";
import sourceCode from "./overlay-decorative.tsx?raw";

const STYLE_PROVIDER_PRIORITY_APPLICATION = 600;

const OverlayDecorativeDemo = () => {
    const [badgeCount, setBadgeCount] = useState(5);
    const [showRibbon, setShowRibbon] = useState(true);
    const [showWatermark, setShowWatermark] = useState(true);
    const [cssProvider] = useState(() => new Gtk.CssProvider());

    const badgeAdjustment = useMemo(() => new Gtk.Adjustment(5, 0, 99, 1, 5, 0), []);

    useEffect(() => {
        const display = Gdk.DisplayManager.get().getDefaultDisplay();
        if (display) {
            Gtk.StyleContext.addProviderForDisplay(display, cssProvider, STYLE_PROVIDER_PRIORITY_APPLICATION);
        }

        const css = `
.badge {
    background-color: @error_bg_color;
    color: @error_fg_color;
    border-radius: 999px;
    min-width: 24px;
    min-height: 24px;
    padding: 2px 8px;
    font-size: 12px;
    font-weight: bold;
}

.badge-large {
    min-width: 32px;
    min-height: 32px;
    font-size: 14px;
}

.ribbon {
    background: linear-gradient(135deg, @accent_bg_color, shade(@accent_bg_color, 0.8));
    color: @accent_fg_color;
    padding: 4px 24px;
    font-size: 11px;
    font-weight: bold;
    text-transform: uppercase;
}

.watermark {
    opacity: 0.15;
    font-size: 48px;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 4px;
}

.overlay-card {
    background-color: @card_bg_color;
    border-radius: 12px;
    min-height: 150px;
    min-width: 200px;
}

.status-dot {
    background-color: @success_color;
    border-radius: 999px;
    min-width: 12px;
    min-height: 12px;
    border: 2px solid @card_bg_color;
}

.status-dot.offline {
    background-color: @warning_color;
}

.corner-tag {
    background-color: @warning_bg_color;
    color: @warning_fg_color;
    padding: 4px 12px;
    border-radius: 0 0 0 8px;
    font-size: 11px;
    font-weight: bold;
}
`;
        try {
            cssProvider.loadFromString(css);
        } catch {
            // Ignore CSS errors
        }

        return () => {
            if (display) {
                Gtk.StyleContext.removeProviderForDisplay(display, cssProvider);
            }
        };
    }, [cssProvider]);

    return (
        <GtkBox
            orientation={Gtk.Orientation.VERTICAL}
            spacing={20}
            marginStart={20}
            marginEnd={20}
            marginTop={20}
            marginBottom={20}
        >
            <GtkLabel label="Decorative Overlays" cssClasses={["title-2"]} halign={Gtk.Align.START} />

            <GtkLabel
                label="GtkOverlay allows placing widgets on top of each other. This is useful for badges, ribbons, watermarks, and other decorative elements that overlay content."
                wrap
                halign={Gtk.Align.START}
                cssClasses={["dim-label"]}
            />

            <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={20}>
                <GtkFrame label="Notification Badge" hexpand>
                    <GtkBox
                        orientation={Gtk.Orientation.VERTICAL}
                        spacing={16}
                        marginStart={16}
                        marginEnd={16}
                        marginTop={16}
                        marginBottom={16}
                        halign={Gtk.Align.CENTER}
                    >
                        <GtkOverlay>
                            <GtkButton
                                iconName="mail-unread-symbolic"
                                cssClasses={["circular"]}
                                widthRequest={64}
                                heightRequest={64}
                            />
                            {badgeCount > 0 && (
                                <GtkLabel
                                    label={badgeCount > 99 ? "99+" : String(badgeCount)}
                                    cssClasses={["badge"]}
                                    halign={Gtk.Align.END}
                                    valign={Gtk.Align.START}
                                    marginEnd={-4}
                                    marginTop={-4}
                                />
                            )}
                        </GtkOverlay>

                        <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={8}>
                            <GtkLabel label="Count:" />
                            <GtkSpinButton
                                climbRate={1}
                                digits={0}
                                adjustment={badgeAdjustment}
                                onValueChanged={(sb) => setBadgeCount(sb.getValue())}
                            />
                        </GtkBox>
                    </GtkBox>
                </GtkFrame>

                <GtkFrame label="Status Indicator" hexpand>
                    <GtkBox
                        orientation={Gtk.Orientation.HORIZONTAL}
                        spacing={24}
                        marginStart={16}
                        marginEnd={16}
                        marginTop={16}
                        marginBottom={16}
                        halign={Gtk.Align.CENTER}
                    >
                        <GtkOverlay>
                            <GtkImage iconName="avatar-default-symbolic" pixelSize={48} />
                            <GtkBox
                                orientation={Gtk.Orientation.HORIZONTAL}
                                spacing={0}
                                cssClasses={["status-dot"]}
                                halign={Gtk.Align.END}
                                valign={Gtk.Align.END}
                                marginEnd={2}
                                marginBottom={2}
                            />
                        </GtkOverlay>

                        <GtkOverlay>
                            <GtkImage iconName="avatar-default-symbolic" pixelSize={48} />
                            <GtkBox
                                orientation={Gtk.Orientation.HORIZONTAL}
                                spacing={0}
                                cssClasses={["status-dot", "offline"]}
                                halign={Gtk.Align.END}
                                valign={Gtk.Align.END}
                                marginEnd={2}
                                marginBottom={2}
                            />
                        </GtkOverlay>
                    </GtkBox>
                </GtkFrame>
            </GtkBox>

            <GtkFrame label="Card with Ribbon & Watermark">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={16}
                    marginStart={16}
                    marginEnd={16}
                    marginTop={16}
                    marginBottom={16}
                >
                    <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={16} halign={Gtk.Align.CENTER}>
                        <GtkButton
                            label={showRibbon ? "Hide Ribbon" : "Show Ribbon"}
                            cssClasses={showRibbon ? ["suggested-action"] : []}
                            onClicked={() => setShowRibbon(!showRibbon)}
                        />
                        <GtkButton
                            label={showWatermark ? "Hide Watermark" : "Show Watermark"}
                            cssClasses={showWatermark ? ["suggested-action"] : []}
                            onClicked={() => setShowWatermark(!showWatermark)}
                        />
                    </GtkBox>

                    <GtkOverlay halign={Gtk.Align.CENTER}>
                        <GtkBox
                            cssClasses={["overlay-card", "card"]}
                            orientation={Gtk.Orientation.VERTICAL}
                            spacing={8}
                            marginStart={24}
                            marginEnd={24}
                            marginTop={24}
                            marginBottom={24}
                        >
                            <GtkLabel label="Premium Content" cssClasses={["title-3"]} />
                            <GtkLabel label="This card has decorative overlays" cssClasses={["dim-label"]} />
                        </GtkBox>

                        {showWatermark && (
                            <GtkLabel
                                label="DRAFT"
                                cssClasses={["watermark"]}
                                halign={Gtk.Align.CENTER}
                                valign={Gtk.Align.CENTER}
                            />
                        )}

                        {showRibbon && (
                            <GtkLabel
                                label="Featured"
                                cssClasses={["ribbon"]}
                                halign={Gtk.Align.START}
                                valign={Gtk.Align.START}
                            />
                        )}

                        <GtkLabel
                            label="NEW"
                            cssClasses={["corner-tag"]}
                            halign={Gtk.Align.END}
                            valign={Gtk.Align.START}
                        />
                    </GtkOverlay>
                </GtkBox>
            </GtkFrame>

            <GtkFrame label="Icon Grid with Badges">
                <GtkBox
                    orientation={Gtk.Orientation.HORIZONTAL}
                    spacing={16}
                    marginStart={16}
                    marginEnd={16}
                    marginTop={16}
                    marginBottom={16}
                    halign={Gtk.Align.CENTER}
                >
                    {[
                        { icon: "folder-documents-symbolic", badge: 12 },
                        { icon: "folder-download-symbolic", badge: 3 },
                        { icon: "folder-music-symbolic", badge: 0 },
                        { icon: "folder-pictures-symbolic", badge: 47 },
                    ].map((item) => (
                        <GtkOverlay key={item.icon}>
                            <GtkButton
                                iconName={item.icon}
                                cssClasses={["flat"]}
                                widthRequest={48}
                                heightRequest={48}
                            />
                            {item.badge > 0 && (
                                <GtkLabel
                                    label={String(item.badge)}
                                    cssClasses={["badge"]}
                                    halign={Gtk.Align.END}
                                    valign={Gtk.Align.START}
                                    marginEnd={-2}
                                    marginTop={-2}
                                />
                            )}
                        </GtkOverlay>
                    ))}
                </GtkBox>
            </GtkFrame>

            <GtkLabel
                label="Use halign and valign props on overlay children to position them at corners or edges. Negative margins can extend elements beyond the overlay bounds."
                wrap
                cssClasses={["dim-label", "caption"]}
                halign={Gtk.Align.START}
            />
        </GtkBox>
    );
};

export const overlayDecorativeDemo: Demo = {
    id: "overlay-decorative",
    title: "Decorative Overlays",
    description: "Badges, ribbons, watermarks using GtkOverlay",
    keywords: ["overlay", "badge", "ribbon", "watermark", "notification", "decorative", "layer"],
    component: OverlayDecorativeDemo,
    sourceCode,
};
