import * as Gtk from "@gtkx/ffi/gtk";
import { GtkEntry, GtkGrid, GtkLabel, GtkScale, GtkShortcutController, GtkSwitch } from "@gtkx/react";
import { useCallback, useState } from "react";
import type { Demo } from "../types.js";
import sourceCode from "./errorstates.tsx?raw";

const ErrorstatesDemo = () => {
    const [showError, setShowError] = useState(false);
    const [moreDetailsError, setMoreDetailsError] = useState(false);
    const [errorLabel, setErrorLabel] = useState<Gtk.Label | null>(null);

    const [detailsEntry, setDetailsEntry] = useState<Gtk.Entry | null>(null);
    const [moreDetailsEntry, setMoreDetailsEntry] = useState<Gtk.Entry | null>(null);
    const [levelScale, setLevelScale] = useState<Gtk.Scale | null>(null);
    const [modeSwitch, setModeSwitch] = useState<Gtk.Switch | null>(null);

    const validateMoreDetails = useCallback(() => {
        const detailsText = detailsEntry?.getText() ?? "";
        const moreDetailsText = moreDetailsEntry?.getText() ?? "";
        setMoreDetailsError(moreDetailsText.length > 0 && detailsText.length === 0);
    }, [detailsEntry, moreDetailsEntry]);

    const handleDetailsChange = useCallback(() => {
        validateMoreDetails();
    }, [validateMoreDetails]);

    const handleMoreDetailsChange = useCallback(() => {
        validateMoreDetails();
    }, [validateMoreDetails]);

    const handleLevelChange = useCallback(
        (_value: number, _self: Gtk.Range) => {
            if (!modeSwitch || !levelScale) return;

            const active = modeSwitch.getActive();
            const state = modeSwitch.getState();
            const value = levelScale.getValue();

            if (active && !state && value > 50) {
                setShowError(false);
                modeSwitch.setState(true);
            } else if (state && value <= 50) {
                modeSwitch.setState(false);
            }
        },
        [modeSwitch, levelScale],
    );

    const handleModeStateSet = useCallback(
        (state: boolean, sw: Gtk.Switch) => {
            if (!state || (levelScale && levelScale.getValue() > 50)) {
                setShowError(false);
                sw.setState(state);
            } else {
                setShowError(true);
            }
            return true;
        },
        [levelScale],
    );

    return (
        <GtkGrid rowSpacing={10} columnSpacing={10} marginStart={20} marginEnd={20} marginTop={20} marginBottom={20}>
            <GtkGrid.Child column={0} row={0}>
                <GtkLabel
                    label="_Details"
                    useUnderline
                    halign={Gtk.Align.END}
                    valign={Gtk.Align.BASELINE}
                    cssClasses={["dim-label"]}
                    mnemonicWidget={detailsEntry}
                />
            </GtkGrid.Child>
            <GtkGrid.Child column={1} row={0} columnSpan={2}>
                <GtkEntry ref={setDetailsEntry} valign={Gtk.Align.BASELINE} onChanged={handleDetailsChange} />
            </GtkGrid.Child>

            <GtkGrid.Child column={0} row={1}>
                <GtkLabel
                    label="More D_etails"
                    useUnderline
                    halign={Gtk.Align.END}
                    valign={Gtk.Align.BASELINE}
                    cssClasses={["dim-label"]}
                    mnemonicWidget={moreDetailsEntry}
                />
            </GtkGrid.Child>
            <GtkGrid.Child column={1} row={1} columnSpan={2}>
                <GtkEntry
                    ref={setMoreDetailsEntry}
                    valign={Gtk.Align.BASELINE}
                    cssClasses={moreDetailsError ? ["error"] : []}
                    tooltipText={moreDetailsError ? "Must have details first" : ""}
                    accessibleInvalid={
                        moreDetailsError ? Gtk.AccessibleInvalidState.TRUE : Gtk.AccessibleInvalidState.FALSE
                    }
                    onChanged={handleMoreDetailsChange}
                />
            </GtkGrid.Child>

            <GtkGrid.Child column={0} row={2}>
                <GtkLabel
                    label="_Level"
                    useUnderline
                    halign={Gtk.Align.END}
                    valign={Gtk.Align.BASELINE}
                    cssClasses={["dim-label"]}
                    mnemonicWidget={levelScale}
                />
            </GtkGrid.Child>
            <GtkGrid.Child column={1} row={2} columnSpan={2}>
                <GtkScale
                    ref={setLevelScale}
                    orientation={Gtk.Orientation.HORIZONTAL}
                    valign={Gtk.Align.BASELINE}
                    drawValue={false}
                    value={50}
                    lower={0}
                    upper={100}
                    stepIncrement={1}
                    pageIncrement={10}
                    onValueChanged={handleLevelChange}
                />
            </GtkGrid.Child>

            <GtkGrid.Child column={0} row={3}>
                <GtkLabel
                    label="_Mode"
                    useUnderline
                    halign={Gtk.Align.END}
                    valign={Gtk.Align.BASELINE}
                    cssClasses={["dim-label"]}
                    mnemonicWidget={modeSwitch}
                />
            </GtkGrid.Child>
            <GtkGrid.Child column={1} row={3}>
                <GtkSwitch
                    ref={setModeSwitch}
                    halign={Gtk.Align.START}
                    valign={Gtk.Align.BASELINE}
                    accessibleKeyShortcuts="Control+M"
                    accessibleInvalid={showError ? Gtk.AccessibleInvalidState.TRUE : Gtk.AccessibleInvalidState.FALSE}
                    accessibleErrorMessage={showError && errorLabel ? [errorLabel] : undefined}
                    onStateSet={handleModeStateSet}
                >
                    <GtkShortcutController scope={Gtk.ShortcutScope.MANAGED}>
                        <GtkShortcutController.Shortcut
                            trigger="<Control>m"
                            onActivate={() => modeSwitch?.activate()}
                        />
                    </GtkShortcutController>
                </GtkSwitch>
            </GtkGrid.Child>
            <GtkGrid.Child column={2} row={3}>
                {showError && (
                    <GtkLabel
                        ref={setErrorLabel}
                        label="Level too low"
                        halign={Gtk.Align.START}
                        valign={Gtk.Align.BASELINE}
                        cssClasses={["error"]}
                    />
                )}
            </GtkGrid.Child>
        </GtkGrid>
    );
};

export const errorstatesDemo: Demo = {
    id: "errorstates",
    title: "Error States",
    description:
        "GtkLabel and GtkEntry can indicate errors if you set the .error style class on them. This example shows how this can be used in a dialog for input validation.",
    keywords: ["css", "error", "validation", "state", "entry", "switch", "scale"],
    component: ErrorstatesDemo,
    sourceCode,
};
