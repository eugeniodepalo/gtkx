import * as Gtk from "@gtkx/ffi/gtk";
import { GtkBox, GtkButton, GtkEntry, GtkFrame, GtkInfoBar, GtkLabel } from "@gtkx/react";
import { useState } from "react";
import type { Demo } from "../types.js";

const InfoBarDemo = () => {
    const [showInfo, setShowInfo] = useState(true);
    const [showWarning, setShowWarning] = useState(true);
    const [showError, setShowError] = useState(true);
    const [showQuestion, setShowQuestion] = useState(true);
    const [customMessage, setCustomMessage] = useState("");
    const [showCustom, setShowCustom] = useState(false);
    const [questionResult, setQuestionResult] = useState<string | null>(null);

    const handleQuestionResponse = (responseId: number) => {
        if (responseId === Gtk.ResponseType.YES) {
            setQuestionResult("You clicked Yes");
        } else if (responseId === Gtk.ResponseType.NO) {
            setQuestionResult("You clicked No");
        }
        setShowQuestion(false);
    };

    const handleShowCustom = () => {
        if (customMessage.trim()) {
            setShowCustom(true);
        }
    };

    return (
        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={24}>
            <GtkLabel label="Info Bars" cssClasses={["title-2"]} halign={Gtk.Align.START} />

            <GtkLabel
                label="GtkInfoBar displays messages inline within the application, without interrupting the user's workflow. Different message types have distinct styling."
                wrap
                halign={Gtk.Align.START}
                cssClasses={["dim-label"]}
            />

            {/* Information InfoBar */}
            <GtkFrame label="Information">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={12}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkLabel
                        label="MessageType.INFO - For general information messages."
                        halign={Gtk.Align.START}
                        cssClasses={["dim-label"]}
                    />
                    {showInfo ? (
                        <GtkInfoBar
                            messageType={Gtk.MessageType.INFO}
                            showCloseButton
                            revealed={showInfo}
                            onClose={() => setShowInfo(false)}
                        >
                            <GtkLabel label="This is an informational message. It provides helpful context." />
                        </GtkInfoBar>
                    ) : (
                        <GtkButton label="Show Info" onClicked={() => setShowInfo(true)} />
                    )}
                </GtkBox>
            </GtkFrame>

            {/* Warning InfoBar */}
            <GtkFrame label="Warning">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={12}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkLabel
                        label="MessageType.WARNING - For warning users about potential issues."
                        halign={Gtk.Align.START}
                        cssClasses={["dim-label"]}
                    />
                    {showWarning ? (
                        <GtkInfoBar
                            messageType={Gtk.MessageType.WARNING}
                            showCloseButton
                            revealed={showWarning}
                            onClose={() => setShowWarning(false)}
                        >
                            <GtkLabel label="Warning: Your session will expire in 5 minutes." />
                        </GtkInfoBar>
                    ) : (
                        <GtkButton label="Show Warning" onClicked={() => setShowWarning(true)} />
                    )}
                </GtkBox>
            </GtkFrame>

            {/* Error InfoBar */}
            <GtkFrame label="Error">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={12}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkLabel
                        label="MessageType.ERROR - For displaying error messages."
                        halign={Gtk.Align.START}
                        cssClasses={["dim-label"]}
                    />
                    {showError ? (
                        <GtkInfoBar
                            messageType={Gtk.MessageType.ERROR}
                            showCloseButton
                            revealed={showError}
                            onClose={() => setShowError(false)}
                        >
                            <GtkLabel label="Error: Failed to save the document. Please try again." />
                        </GtkInfoBar>
                    ) : (
                        <GtkButton label="Show Error" onClicked={() => setShowError(true)} />
                    )}
                </GtkBox>
            </GtkFrame>

            {/* Question InfoBar */}
            <GtkFrame label="Question with Actions">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={12}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkLabel
                        label="MessageType.QUESTION - For asking the user a question. InfoBars can include action buttons."
                        halign={Gtk.Align.START}
                        cssClasses={["dim-label"]}
                        wrap
                    />
                    {showQuestion ? (
                        <GtkInfoBar
                            messageType={Gtk.MessageType.QUESTION}
                            revealed={showQuestion}
                            onResponse={(_self, responseId) => handleQuestionResponse(responseId)}
                        >
                            <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={12}>
                                <GtkLabel label="Do you want to save your changes?" hexpand />
                                <GtkButton label="No" />
                                <GtkButton label="Yes" cssClasses={["suggested-action"]} />
                            </GtkBox>
                        </GtkInfoBar>
                    ) : (
                        <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={12}>
                            <GtkButton
                                label="Ask Question"
                                onClicked={() => {
                                    setShowQuestion(true);
                                    setQuestionResult(null);
                                }}
                            />
                            {questionResult && <GtkLabel label={questionResult} cssClasses={["dim-label"]} />}
                        </GtkBox>
                    )}
                </GtkBox>
            </GtkFrame>

            {/* Custom Message */}
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
                        label="Enter a custom message to display in an info bar."
                        halign={Gtk.Align.START}
                        cssClasses={["dim-label"]}
                    />
                    <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={8}>
                        <GtkEntry
                            text={customMessage}
                            onChanged={(entry: Gtk.Entry) => setCustomMessage(entry.getText())}
                            placeholderText="Enter your message..."
                            hexpand
                        />
                        <GtkButton
                            label="Show"
                            onClicked={handleShowCustom}
                            sensitive={customMessage.trim().length > 0}
                        />
                    </GtkBox>
                    {showCustom && customMessage && (
                        <GtkInfoBar
                            messageType={Gtk.MessageType.INFO}
                            showCloseButton
                            revealed={showCustom}
                            onClose={() => setShowCustom(false)}
                        >
                            <GtkLabel label={customMessage} />
                        </GtkInfoBar>
                    )}
                </GtkBox>
            </GtkFrame>
        </GtkBox>
    );
};

const sourceCode = `import { useState } from "react";
import * as Gtk from "@gtkx/ffi/gtk";
import { GtkBox, GtkButton, GtkLabel, GtkInfoBar } from "@gtkx/react";

const InfoBarDemo = () => {
  const [showInfo, setShowInfo] = useState(true);
  const [showWarning, setShowWarning] = useState(true);
  const [showError, setShowError] = useState(true);

  return (
    <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={12}>
      {/* Information message */}
      {showInfo && (
        <GtkInfoBar
          messageType={Gtk.MessageType.INFO}
          showCloseButton
          onClose={() => setShowInfo(false)}
        >
          <GtkLabel label="This is an informational message." />
        </GtkInfoBar>
      )}

      {/* Warning message */}
      {showWarning && (
        <GtkInfoBar
          messageType={Gtk.MessageType.WARNING}
          showCloseButton
          onClose={() => setShowWarning(false)}
        >
          <GtkLabel label="Warning: Your session will expire soon." />
        </GtkInfoBar>
      )}

      {/* Error message */}
      {showError && (
        <GtkInfoBar
          messageType={Gtk.MessageType.ERROR}
          showCloseButton
          onClose={() => setShowError(false)}
        >
          <GtkLabel label="Error: Failed to save the document." />
        </GtkInfoBar>
      )}

      {/* Question with actions */}
      <GtkInfoBar
        messageType={Gtk.MessageType.QUESTION}
        onResponse={(self, responseId) => {
          console.log("Response:", responseId);
        }}
      >
        <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={12}>
          <GtkLabel label="Save changes?" />
          <GtkButton label="No" />
          <GtkButton label="Yes" cssClasses={["suggested-action"]} />
        </GtkBox>
      </GtkInfoBar>

      {/* Reset buttons */}
      <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={8}>
        <GtkButton label="Show Info" onClicked={() => setShowInfo(true)} />
        <GtkButton label="Show Warning" onClicked={() => setShowWarning(true)} />
        <GtkButton label="Show Error" onClicked={() => setShowError(true)} />
      </GtkBox>
    </GtkBox>
  );
};`;

export const infobarDemo: Demo = {
    id: "infobar",
    title: "Info Bar",
    description: "In-app notification bars with message types",
    keywords: ["infobar", "notification", "message", "alert", "warning", "error", "info", "GtkInfoBar", "inline"],
    component: InfoBarDemo,
    sourceCode,
};
