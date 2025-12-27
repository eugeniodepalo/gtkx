import * as Adw from "@gtkx/ffi/adw";
import * as Gtk from "@gtkx/ffi/gtk";
import { AdwToastOverlay, GtkBox, GtkButton, GtkEntry, GtkFrame, GtkLabel } from "@gtkx/react";
import { useRef, useState } from "react";
import type { Demo } from "../types.js";

const ToastDemo = () => {
    const toastOverlayRef = useRef<Adw.ToastOverlay | null>(null);
    const [customMessage, setCustomMessage] = useState("Hello from GTKX!");
    const [toastCount, setToastCount] = useState(0);
    const timeout = 3;

    const showToast = (title: string, options?: { buttonLabel?: string; priority?: Adw.ToastPriority }) => {
        if (toastOverlayRef.current) {
            const toast = new Adw.Toast(title);

            if (options?.buttonLabel) {
                toast.setButtonLabel(options.buttonLabel);
                toast.connect("button-clicked", () => {
                    showToast("Button clicked!");
                });
            }

            if (options?.priority !== undefined) {
                toast.setPriority(options.priority);
            }

            toast.setTimeout(timeout);
            toastOverlayRef.current.addToast(toast);
            setToastCount((c) => c + 1);
        }
    };

    const showCustomToast = () => {
        if (customMessage.trim()) {
            showToast(customMessage);
        }
    };

    return (
        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={24}>
            <GtkLabel label="Toast Overlay" cssClasses={["title-2"]} halign={Gtk.Align.START} />

            <GtkLabel
                label="AdwToastOverlay displays transient notifications (toasts) that appear temporarily and can include action buttons. Toasts stack and auto-dismiss after a configurable timeout."
                wrap
                halign={Gtk.Align.START}
                cssClasses={["dim-label"]}
            />

            {/* Toast Display Area */}
            <AdwToastOverlay ref={toastOverlayRef}>
                <GtkFrame>
                    <GtkBox
                        orientation={Gtk.Orientation.VERTICAL}
                        spacing={16}
                        marginTop={48}
                        marginBottom={48}
                        marginStart={24}
                        marginEnd={24}
                        valign={Gtk.Align.CENTER}
                        halign={Gtk.Align.CENTER}
                    >
                        <GtkLabel label="Toast Area" cssClasses={["title-3", "dim-label"]} />
                        <GtkLabel
                            label={`${toastCount} toast${toastCount !== 1 ? "s" : ""} shown`}
                            cssClasses={["dim-label"]}
                        />
                    </GtkBox>
                </GtkFrame>
            </AdwToastOverlay>

            {/* Basic Toasts */}
            <GtkFrame label="Basic Toasts">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={12}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkLabel
                        label="Simple notifications that auto-dismiss"
                        halign={Gtk.Align.START}
                        cssClasses={["dim-label"]}
                    />
                    <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={8}>
                        <GtkButton
                            label="Success"
                            onClicked={() => showToast("Operation completed successfully")}
                            cssClasses={["suggested-action"]}
                        />
                        <GtkButton label="Info" onClicked={() => showToast("Here's some useful information")} />
                        <GtkButton
                            label="Warning"
                            onClicked={() => showToast("Warning: Check your input")}
                            cssClasses={["warning"]}
                        />
                    </GtkBox>
                </GtkBox>
            </GtkFrame>

            {/* Toast with Action */}
            <GtkFrame label="Toast with Action Button">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={12}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkLabel
                        label="Toasts can include an action button for user interaction"
                        halign={Gtk.Align.START}
                        cssClasses={["dim-label"]}
                        wrap
                    />
                    <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={8}>
                        <GtkButton
                            label="Show with Undo"
                            onClicked={() => showToast("Item deleted", { buttonLabel: "Undo" })}
                        />
                        <GtkButton
                            label="Show with View"
                            onClicked={() => showToast("Download complete", { buttonLabel: "View" })}
                        />
                    </GtkBox>
                </GtkBox>
            </GtkFrame>

            {/* Toast Priority */}
            <GtkFrame label="Toast Priority">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={12}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkLabel
                        label="High priority toasts interrupt other toasts and stay longer"
                        halign={Gtk.Align.START}
                        cssClasses={["dim-label"]}
                        wrap
                    />
                    <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={8}>
                        <GtkButton
                            label="Normal Priority"
                            onClicked={() => showToast("Normal priority toast", { priority: Adw.ToastPriority.NORMAL })}
                        />
                        <GtkButton
                            label="High Priority"
                            onClicked={() => showToast("High priority toast!", { priority: Adw.ToastPriority.HIGH })}
                            cssClasses={["destructive-action"]}
                        />
                    </GtkBox>
                </GtkBox>
            </GtkFrame>

            {/* Custom Toast */}
            <GtkFrame label="Custom Message">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={12}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkLabel
                        label="Enter your own message to display"
                        halign={Gtk.Align.START}
                        cssClasses={["dim-label"]}
                    />
                    <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={8}>
                        <GtkEntry
                            text={customMessage}
                            onChanged={(entry) => setCustomMessage(entry.getText())}
                            placeholderText="Enter message..."
                            hexpand
                        />
                        <GtkButton
                            label="Show"
                            onClicked={showCustomToast}
                            sensitive={customMessage.trim().length > 0}
                        />
                    </GtkBox>
                </GtkBox>
            </GtkFrame>

            {/* Key Properties */}
            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                <GtkLabel label="Key Features" cssClasses={["heading"]} halign={Gtk.Align.START} />
                <GtkLabel
                    label="title: The toast message text. buttonLabel: Optional action button. timeout: Auto-dismiss delay in seconds. priority: NORMAL or HIGH for interrupting. Toasts stack when multiple are shown. Use ref to call addToast() imperatively."
                    wrap
                    cssClasses={["dim-label"]}
                    halign={Gtk.Align.START}
                />
            </GtkBox>
        </GtkBox>
    );
};

const sourceCode = `import { useRef } from "react";
import * as Adw from "@gtkx/ffi/adw";
import { AdwToastOverlay, GtkBox, GtkButton, GtkLabel } from "@gtkx/react";

const ToastDemo = () => {
  const toastOverlayRef = useRef<Adw.ToastOverlay | null>(null);

  const showToast = (message: string, buttonLabel?: string) => {
    if (toastOverlayRef.current) {
      const toast = new Adw.Toast(message);

      if (buttonLabel) {
        toast.buttonLabel = buttonLabel;
        toast.connect("button-clicked", () => {
          console.log("Toast button clicked");
        });
      }

      toast.timeout = 3;
      toastOverlayRef.current.addToast(toast);
    }
  };

  return (
    <AdwToastOverlay ref={toastOverlayRef}>
      <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={12}>
        <GtkLabel label="Click a button to show a toast" />

        <GtkButton
          label="Simple Toast"
          onClicked={() => showToast("Operation completed")}
        />

        <GtkButton
          label="Toast with Undo"
          onClicked={() => showToast("Item deleted", "Undo")}
        />
      </GtkBox>
    </AdwToastOverlay>
  );
};`;

export const toastDemo: Demo = {
    id: "toast",
    title: "Toast Overlay",
    description: "Transient notifications with optional action buttons",
    keywords: ["toast", "notification", "overlay", "snackbar", "message", "AdwToastOverlay", "AdwToast", "libadwaita"],
    component: ToastDemo,
    sourceCode,
};
