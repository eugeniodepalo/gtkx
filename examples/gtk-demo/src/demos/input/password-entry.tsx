import type * as GObject from "@gtkx/ffi/gobject";
import * as Gtk from "@gtkx/ffi/gtk";
import { GtkBox, GtkButton, GtkHeaderBar, GtkPasswordEntry } from "@gtkx/react";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { Demo, DemoProps } from "../types.js";
import sourceCode from "./password-entry.tsx?raw";

const Slot = "Slot" as const;

interface PasswordEntryHeaderProps {
    buttonRef: React.RefObject<Gtk.Button | null>;
    passwordsMatch: boolean;
    onClose?: () => void;
}

const PasswordEntryHeader = ({ buttonRef, passwordsMatch, onClose }: PasswordEntryHeaderProps) => (
    <Slot id="titlebar">
        <GtkHeaderBar showTitleButtons={false}>
            <GtkHeaderBar.PackEnd>
                <GtkButton
                    ref={buttonRef}
                    label="_Done"
                    useUnderline
                    cssClasses={["suggested-action"]}
                    sensitive={passwordsMatch}
                    onClicked={onClose}
                />
            </GtkHeaderBar.PackEnd>
        </GtkHeaderBar>
    </Slot>
);

interface PasswordEntryBodyProps {
    passwordRef: React.RefObject<Gtk.PasswordEntry | null>;
    confirmRef: React.RefObject<Gtk.PasswordEntry | null>;
    onPasswordNotify: (pspec: GObject.ParamSpec) => void;
    onConfirmNotify: (pspec: GObject.ParamSpec) => void;
}

const PasswordEntryBody = ({ passwordRef, confirmRef, onPasswordNotify, onConfirmNotify }: PasswordEntryBodyProps) => (
    <GtkBox
        orientation={Gtk.Orientation.VERTICAL}
        spacing={6}
        marginStart={18}
        marginEnd={18}
        marginTop={18}
        marginBottom={18}
    >
        <GtkPasswordEntry
            ref={passwordRef}
            showPeekIcon
            placeholderText="Password"
            accessibleLabel="Password"
            activatesDefault
            onNotify={onPasswordNotify}
        />
        <GtkPasswordEntry
            ref={confirmRef}
            showPeekIcon
            placeholderText="Confirm"
            accessibleLabel="Confirm"
            activatesDefault
            onNotify={onConfirmNotify}
        />
    </GtkBox>
);

const PasswordEntryDemo = ({ onClose, window }: DemoProps) => {
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");

    const buttonRef = useRef<Gtk.Button | null>(null);
    const passwordRef = useRef<Gtk.PasswordEntry | null>(null);
    const confirmRef = useRef<Gtk.PasswordEntry | null>(null);

    const passwordsMatch = password.length > 0 && password === confirm;

    const handlePasswordNotify = useCallback((pspec: GObject.ParamSpec) => {
        if (pspec.getName() === "text") setPassword(passwordRef.current?.getText() ?? "");
    }, []);

    const handleConfirmNotify = useCallback((pspec: GObject.ParamSpec) => {
        if (pspec.getName() === "text") setConfirm(confirmRef.current?.getText() ?? "");
    }, []);

    useLayoutEffect(() => {
        const btn = buttonRef.current;
        const win = window.current;
        if (btn && win) {
            win.setDefaultWidget(btn);
            win.setDeletable(false);
        }
    }, [window]);

    return (
        <>
            <PasswordEntryHeader buttonRef={buttonRef} passwordsMatch={passwordsMatch} onClose={onClose} />
            <PasswordEntryBody
                passwordRef={passwordRef}
                confirmRef={confirmRef}
                onPasswordNotify={handlePasswordNotify}
                onConfirmNotify={handleConfirmNotify}
            />
        </>
    );
};

export const passwordEntryDemo: Demo = {
    id: "password-entry",
    title: "Entry/Password Entry",
    description:
        "GtkPasswordEntry provides common functionality of entries that are used to enter passwords and other secrets. It will display a warning if CapsLock is on, and it can optionally provide a way to see the text.",
    keywords: ["password", "entry", "secure", "GtkPasswordEntry", "peek"],
    component: PasswordEntryDemo,
    sourceCode,
};
