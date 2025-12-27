import * as Gtk from "@gtkx/ffi/gtk";
import { GtkBox, GtkButton, GtkCenterBox, GtkLabel, Slot } from "@gtkx/react";
import { useState } from "react";
import type { Demo } from "../types.js";

const sourceCode = `import * as Gtk from "@gtkx/ffi/gtk";
import { GtkBox, GtkButton, GtkCenterBox, GtkLabel, Slot } from "@gtkx/react";

const CenterBoxDemo = () => {
    return (
        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={20}>
            {/* Horizontal CenterBox */}
            <GtkCenterBox orientation={Gtk.Orientation.HORIZONTAL}>
                <Slot for={GtkCenterBox} id="startWidget">
                    <GtkButton label="Start" />
                </Slot>
                <Slot for={GtkCenterBox} id="centerWidget">
                    <GtkLabel label="Center" />
                </Slot>
                <Slot for={GtkCenterBox} id="endWidget">
                    <GtkButton label="End" />
                </Slot>
            </GtkCenterBox>

            {/* Vertical CenterBox */}
            <GtkCenterBox orientation={Gtk.Orientation.VERTICAL}>
                <Slot for={GtkCenterBox} id="startWidget">
                    <GtkButton label="Top" />
                </Slot>
                <Slot for={GtkCenterBox} id="centerWidget">
                    <GtkLabel label="Middle" />
                </Slot>
                <Slot for={GtkCenterBox} id="endWidget">
                    <GtkButton label="Bottom" />
                </Slot>
            </GtkCenterBox>
        </GtkBox>
    );
};`;

const CenterBoxDemo = () => {
    const [showStart, setShowStart] = useState(true);
    const [showEnd, setShowEnd] = useState(true);

    return (
        <GtkBox
            orientation={Gtk.Orientation.VERTICAL}
            spacing={20}
            marginStart={20}
            marginEnd={20}
            marginTop={20}
            marginBottom={20}
        >
            <GtkLabel label="CenterBox" cssClasses={["title-2"]} halign={Gtk.Align.START} />

            {/* About CenterBox */}
            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                <GtkLabel label="About CenterBox" cssClasses={["heading"]} halign={Gtk.Align.START} />
                <GtkLabel
                    label="GtkCenterBox arranges three children in a line: start, center, and end. The center widget is always centered regardless of the size of the start and end widgets."
                    wrap
                    cssClasses={["dim-label"]}
                    halign={Gtk.Align.START}
                />
            </GtkBox>

            {/* Horizontal CenterBox */}
            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                <GtkLabel label="Horizontal CenterBox" cssClasses={["heading"]} halign={Gtk.Align.START} />
                <GtkLabel
                    label="The center widget stays centered even with different-sized start/end widgets."
                    wrap
                    cssClasses={["dim-label"]}
                    halign={Gtk.Align.START}
                />
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={0}
                    cssClasses={["card"]}
                    marginTop={8}
                    marginBottom={8}
                >
                    <GtkCenterBox
                        orientation={Gtk.Orientation.HORIZONTAL}
                        marginTop={12}
                        marginBottom={12}
                        marginStart={12}
                        marginEnd={12}
                    >
                        <Slot for={GtkCenterBox} id="startWidget">
                            <GtkButton label="Start" />
                        </Slot>
                        <Slot for={GtkCenterBox} id="centerWidget">
                            <GtkLabel label="Centered Content" cssClasses={["heading"]} />
                        </Slot>
                        <Slot for={GtkCenterBox} id="endWidget">
                            <GtkButton label="End" />
                        </Slot>
                    </GtkCenterBox>
                </GtkBox>
            </GtkBox>

            {/* Asymmetric Widgets */}
            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                <GtkLabel label="Asymmetric Widgets" cssClasses={["heading"]} halign={Gtk.Align.START} />
                <GtkLabel
                    label="Even with widgets of different sizes, the center remains centered."
                    wrap
                    cssClasses={["dim-label"]}
                    halign={Gtk.Align.START}
                />
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={0}
                    cssClasses={["card"]}
                    marginTop={8}
                    marginBottom={8}
                >
                    <GtkCenterBox
                        orientation={Gtk.Orientation.HORIZONTAL}
                        marginTop={12}
                        marginBottom={12}
                        marginStart={12}
                        marginEnd={12}
                    >
                        <Slot for={GtkCenterBox} id="startWidget">
                            <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={4}>
                                <GtkButton iconName="go-previous-symbolic" cssClasses={["flat"]} />
                                <GtkButton iconName="go-next-symbolic" cssClasses={["flat"]} />
                            </GtkBox>
                        </Slot>
                        <Slot for={GtkCenterBox} id="centerWidget">
                            <GtkLabel label="Title" cssClasses={["title"]} />
                        </Slot>
                        <Slot for={GtkCenterBox} id="endWidget">
                            <GtkButton iconName="open-menu-symbolic" cssClasses={["flat"]} />
                        </Slot>
                    </GtkCenterBox>
                </GtkBox>
            </GtkBox>

            {/* Vertical CenterBox */}
            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                <GtkLabel label="Vertical CenterBox" cssClasses={["heading"]} halign={Gtk.Align.START} />
                <GtkLabel
                    label="CenterBox can also be oriented vertically."
                    wrap
                    cssClasses={["dim-label"]}
                    halign={Gtk.Align.START}
                />
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={0}
                    cssClasses={["card"]}
                    marginTop={8}
                    marginBottom={8}
                    heightRequest={180}
                >
                    <GtkCenterBox
                        orientation={Gtk.Orientation.VERTICAL}
                        vexpand
                        marginTop={12}
                        marginBottom={12}
                        marginStart={12}
                        marginEnd={12}
                    >
                        <Slot for={GtkCenterBox} id="startWidget">
                            <GtkLabel label="Top" cssClasses={["dim-label"]} />
                        </Slot>
                        <Slot for={GtkCenterBox} id="centerWidget">
                            <GtkLabel label="Center" cssClasses={["heading"]} />
                        </Slot>
                        <Slot for={GtkCenterBox} id="endWidget">
                            <GtkLabel label="Bottom" cssClasses={["dim-label"]} />
                        </Slot>
                    </GtkCenterBox>
                </GtkBox>
            </GtkBox>

            {/* Optional Widgets */}
            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                <GtkLabel label="Optional Widgets" cssClasses={["heading"]} halign={Gtk.Align.START} />
                <GtkLabel
                    label="Start and end widgets are optional. The center remains centered."
                    wrap
                    cssClasses={["dim-label"]}
                    halign={Gtk.Align.START}
                />
                <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={8}>
                    <GtkButton
                        label={showStart ? "Hide Start" : "Show Start"}
                        onClicked={() => setShowStart(!showStart)}
                    />
                    <GtkButton label={showEnd ? "Hide End" : "Show End"} onClicked={() => setShowEnd(!showEnd)} />
                </GtkBox>
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={0}
                    cssClasses={["card"]}
                    marginTop={8}
                    marginBottom={8}
                >
                    <GtkCenterBox
                        orientation={Gtk.Orientation.HORIZONTAL}
                        marginTop={12}
                        marginBottom={12}
                        marginStart={12}
                        marginEnd={12}
                    >
                        {showStart && (
                            <Slot for={GtkCenterBox} id="startWidget">
                                <GtkButton label="Start Widget" />
                            </Slot>
                        )}
                        <Slot for={GtkCenterBox} id="centerWidget">
                            <GtkLabel label="Always Centered" cssClasses={["heading"]} />
                        </Slot>
                        {showEnd && (
                            <Slot for={GtkCenterBox} id="endWidget">
                                <GtkButton label="End Widget" />
                            </Slot>
                        )}
                    </GtkCenterBox>
                </GtkBox>
            </GtkBox>

            {/* Toolbar Example */}
            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                <GtkLabel label="Toolbar Example" cssClasses={["heading"]} halign={Gtk.Align.START} />
                <GtkLabel
                    label="CenterBox is useful for toolbars with centered controls."
                    wrap
                    cssClasses={["dim-label"]}
                    halign={Gtk.Align.START}
                />
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={0}
                    cssClasses={["card"]}
                    marginTop={8}
                    marginBottom={8}
                >
                    <GtkCenterBox
                        orientation={Gtk.Orientation.HORIZONTAL}
                        marginTop={8}
                        marginBottom={8}
                        marginStart={12}
                        marginEnd={12}
                    >
                        <Slot for={GtkCenterBox} id="startWidget">
                            <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={4}>
                                <GtkButton iconName="document-new-symbolic" cssClasses={["flat"]} />
                                <GtkButton iconName="document-open-symbolic" cssClasses={["flat"]} />
                                <GtkButton iconName="document-save-symbolic" cssClasses={["flat"]} />
                            </GtkBox>
                        </Slot>
                        <Slot for={GtkCenterBox} id="centerWidget">
                            <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={4}>
                                <GtkButton iconName="media-skip-backward-symbolic" cssClasses={["flat"]} />
                                <GtkButton
                                    iconName="media-playback-start-symbolic"
                                    cssClasses={["circular", "suggested-action"]}
                                />
                                <GtkButton iconName="media-skip-forward-symbolic" cssClasses={["flat"]} />
                            </GtkBox>
                        </Slot>
                        <Slot for={GtkCenterBox} id="endWidget">
                            <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={4}>
                                <GtkButton iconName="view-fullscreen-symbolic" cssClasses={["flat"]} />
                                <GtkButton iconName="open-menu-symbolic" cssClasses={["flat"]} />
                            </GtkBox>
                        </Slot>
                    </GtkCenterBox>
                </GtkBox>
            </GtkBox>
        </GtkBox>
    );
};

export const centerboxDemo: Demo = {
    id: "centerbox",
    title: "CenterBox",
    description: "Container with start, center, and end widgets where center is always centered.",
    keywords: ["centerbox", "center", "layout", "toolbar", "navigation", "GtkCenterBox"],
    component: CenterBoxDemo,
    sourceCode,
};
