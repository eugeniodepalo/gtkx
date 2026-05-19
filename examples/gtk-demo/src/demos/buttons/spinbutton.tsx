import * as Gtk from "@gtkx/ffi/gtk";
import { GtkGrid, GtkLabel, GtkSpinButton } from "@gtkx/react";
import { type Ref, useCallback, useRef, useState } from "react";
import type { Demo } from "../types.js";
import sourceCode from "./spinbutton.tsx?raw";

const MONTHS = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
];

const GTK_INPUT_ERROR = -1;

const handleHexInput = (newValue: Ref<number>, spin: Gtk.SpinButton) => {
    const text = spin.getText();
    if (!newValue || typeof newValue !== "object" || !("value" in newValue)) return GTK_INPUT_ERROR;
    newValue.value = 0;
    const parsed = Number.parseInt(text, 16);
    if (Number.isNaN(parsed)) return GTK_INPUT_ERROR;
    newValue.value = parsed;
    return 1;
};

const handleHexOutput = (spin: Gtk.SpinButton) => {
    const value = spin.getValue();
    const text = Math.abs(value) < 1e-5 ? "0x00" : `0x${Math.round(value).toString(16).toUpperCase().padStart(2, "0")}`;
    spin.setText(text);
    return true;
};

const handleTimeInput = (newValue: Ref<number>, spin: Gtk.SpinButton) => {
    const text = spin.getText();
    if (!newValue || typeof newValue !== "object" || !("value" in newValue)) return GTK_INPUT_ERROR;
    newValue.value = 0;
    const parts = text.split(":");
    if (parts.length !== 2) return GTK_INPUT_ERROR;
    const hours = Number.parseInt(parts[0] ?? "", 10);
    const minutes = Number.parseInt(parts[1] ?? "", 10);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return GTK_INPUT_ERROR;
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return GTK_INPUT_ERROR;
    newValue.value = hours * 60 + minutes;
    return 1;
};

const handleTimeOutput = (spin: Gtk.SpinButton) => {
    const value = spin.getValue();
    const hours = Math.floor(value / 60);
    const minutes = Math.round((value / 60 - hours) * 60);
    spin.setText(`${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`);
    return true;
};

function useMonthSpinHandlers(monthSpinRef: React.RefObject<Gtk.SpinButton | null>) {
    const handleMonthInput = useCallback(
        (newValue: Ref<number>) => {
            const spin = monthSpinRef.current;
            if (!spin || !newValue || typeof newValue !== "object" || !("value" in newValue)) return GTK_INPUT_ERROR;
            newValue.value = 0;
            const text = spin.getText().toLowerCase();
            for (let i = 0; i < MONTHS.length; i++) {
                if (MONTHS[i]?.toLowerCase().startsWith(text)) {
                    newValue.value = i + 1;
                    return 1;
                }
            }
            return GTK_INPUT_ERROR;
        },
        [monthSpinRef],
    );

    const handleMonthOutput = useCallback((spin: Gtk.SpinButton) => {
        const value = spin.getValue();
        const index = Math.round(value) - 1;
        spin.setText(MONTHS[index] ?? "January");
        return true;
    }, []);

    return { handleMonthInput, handleMonthOutput };
}

interface SpinRowProps {
    value: number;
    setValue: (v: number) => void;
    spinRef: React.RefObject<Gtk.SpinButton | null>;
}

const NumericSpinRow = ({ value, setValue, spinRef }: SpinRowProps) => (
    <>
        <GtkGrid.Child column={0} row={0}>
            <GtkLabel label="_Numeric" useUnderline xalign={1} mnemonicWidget={spinRef.current} />
        </GtkGrid.Child>
        <GtkGrid.Child column={1} row={0}>
            <GtkSpinButton
                ref={spinRef}
                halign={Gtk.Align.START}
                widthChars={5}
                digits={2}
                climbRate={1}
                numeric
                value={value}
                lower={-10000}
                upper={10000}
                stepIncrement={0.5}
                pageIncrement={100}
                onValueChanged={setValue}
            />
        </GtkGrid.Child>
        <GtkGrid.Child column={2} row={0}>
            <GtkLabel label={String(value)} widthChars={10} xalign={1} />
        </GtkGrid.Child>
    </>
);

const HexSpinRow = ({ value, setValue, spinRef }: SpinRowProps) => (
    <>
        <GtkGrid.Child column={0} row={1}>
            <GtkLabel label="_Hexadecimal" useUnderline xalign={1} mnemonicWidget={spinRef.current} />
        </GtkGrid.Child>
        <GtkGrid.Child column={1} row={1}>
            <GtkSpinButton
                ref={spinRef}
                halign={Gtk.Align.START}
                widthChars={4}
                wrap
                value={value}
                lower={0}
                upper={255}
                stepIncrement={1}
                pageIncrement={16}
                onValueChanged={setValue}
                onInput={handleHexInput}
                onOutput={handleHexOutput}
            />
        </GtkGrid.Child>
        <GtkGrid.Child column={2} row={1}>
            <GtkLabel label={String(value)} widthChars={10} xalign={1} />
        </GtkGrid.Child>
    </>
);

const TimeSpinRow = ({ value, setValue, spinRef }: SpinRowProps) => (
    <>
        <GtkGrid.Child column={0} row={2}>
            <GtkLabel label="_Time" useUnderline xalign={1} mnemonicWidget={spinRef.current} />
        </GtkGrid.Child>
        <GtkGrid.Child column={1} row={2}>
            <GtkSpinButton
                ref={spinRef}
                halign={Gtk.Align.START}
                widthChars={5}
                wrap
                value={value}
                lower={0}
                upper={1410}
                stepIncrement={30}
                pageIncrement={60}
                onValueChanged={setValue}
                onInput={handleTimeInput}
                onOutput={handleTimeOutput}
            />
        </GtkGrid.Child>
        <GtkGrid.Child column={2} row={2}>
            <GtkLabel label={String(value)} widthChars={10} xalign={1} />
        </GtkGrid.Child>
    </>
);

interface MonthSpinRowProps extends SpinRowProps {
    onInput: (newValue: Ref<number>) => number;
    onOutput: (spin: Gtk.SpinButton) => boolean;
}

const MonthSpinRow = ({ value, setValue, spinRef, onInput, onOutput }: MonthSpinRowProps) => (
    <>
        <GtkGrid.Child column={0} row={3}>
            <GtkLabel label="_Month" useUnderline xalign={1} mnemonicWidget={spinRef.current} />
        </GtkGrid.Child>
        <GtkGrid.Child column={1} row={3}>
            <GtkSpinButton
                ref={spinRef}
                halign={Gtk.Align.START}
                widthChars={9}
                wrap
                updatePolicy={Gtk.SpinButtonUpdatePolicy.IF_VALID}
                value={value}
                lower={1}
                upper={12}
                stepIncrement={1}
                pageIncrement={5}
                onValueChanged={setValue}
                onInput={onInput}
                onOutput={onOutput}
            />
        </GtkGrid.Child>
        <GtkGrid.Child column={2} row={3}>
            <GtkLabel label={String(value)} widthChars={10} xalign={1} />
        </GtkGrid.Child>
    </>
);

const SpinButtonDemo = () => {
    const [numericValue, setNumericValue] = useState(0);
    const [hexValue, setHexValue] = useState(0);
    const [timeValue, setTimeValue] = useState(0);
    const [monthValue, setMonthValue] = useState(1);

    const numericSpinRef = useRef<Gtk.SpinButton | null>(null);
    const hexSpinRef = useRef<Gtk.SpinButton | null>(null);
    const timeSpinRef = useRef<Gtk.SpinButton | null>(null);
    const monthSpinRef = useRef<Gtk.SpinButton | null>(null);

    const monthHandlers = useMonthSpinHandlers(monthSpinRef);

    return (
        <GtkGrid rowSpacing={10} columnSpacing={10} marginStart={20} marginEnd={20} marginTop={20} marginBottom={20}>
            <NumericSpinRow value={numericValue} setValue={setNumericValue} spinRef={numericSpinRef} />
            <HexSpinRow value={hexValue} setValue={setHexValue} spinRef={hexSpinRef} />
            <TimeSpinRow value={timeValue} setValue={setTimeValue} spinRef={timeSpinRef} />
            <MonthSpinRow
                value={monthValue}
                setValue={setMonthValue}
                spinRef={monthSpinRef}
                onInput={monthHandlers.handleMonthInput}
                onOutput={monthHandlers.handleMonthOutput}
            />
        </GtkGrid>
    );
};

export const spinbuttonDemo: Demo = {
    id: "spinbutton",
    title: "Spin Buttons",
    description:
        "GtkSpinButton provides convenient ways to input data that can be seen as a value in a range. The examples here show that this does not necessarily mean numeric values, and it can include custom formatting.",
    keywords: ["spin", "number", "input", "numeric", "GtkSpinButton", "integer", "float", "time", "month", "hex"],
    component: SpinButtonDemo,
    sourceCode,
};
