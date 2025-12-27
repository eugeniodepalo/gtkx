import * as Gtk from "@gtkx/ffi/gtk";
import {
    GtkBox,
    GtkButton,
    GtkCheckButton,
    GtkEntry,
    GtkFrame,
    GtkLabel,
    GtkProgressBar,
    GtkStack,
    StackPage,
} from "@gtkx/react";
import { useState } from "react";
import type { Demo } from "../types.js";

interface WizardData {
    name: string;
    email: string;
    newsletter: boolean;
    theme: "light" | "dark";
}

const AssistantDemo = () => {
    const [currentStep, setCurrentStep] = useState(0);
    const [wizardData, setWizardData] = useState<WizardData>({
        name: "",
        email: "",
        newsletter: false,
        theme: "light",
    });
    const [isComplete, setIsComplete] = useState(false);

    const steps = [
        { name: "welcome", title: "Welcome" },
        { name: "personal", title: "Personal Info" },
        { name: "preferences", title: "Preferences" },
        { name: "confirm", title: "Confirm" },
        { name: "complete", title: "Complete" },
    ];

    const canGoNext = () => {
        switch (currentStep) {
            case 0:
                return true;
            case 1:
                return wizardData.name.trim().length > 0 && wizardData.email.includes("@");
            case 2:
                return true;
            case 3:
                return true;
            default:
                return false;
        }
    };

    const handleNext = () => {
        if (currentStep === 3) {
            setIsComplete(true);
            setCurrentStep(4);
        } else if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleReset = () => {
        setCurrentStep(0);
        setWizardData({
            name: "",
            email: "",
            newsletter: false,
            theme: "light",
        });
        setIsComplete(false);
    };

    const progress = currentStep / (steps.length - 1);

    return (
        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={24}>
            <GtkLabel label="Multi-Step Wizard" cssClasses={["title-2"]} halign={Gtk.Align.START} />

            <GtkLabel
                label="A wizard (or assistant) guides users through a multi-step process. This example uses GtkStack to switch between pages and tracks progress with state."
                wrap
                halign={Gtk.Align.START}
                cssClasses={["dim-label"]}
            />

            <GtkFrame>
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={16}
                    marginTop={16}
                    marginBottom={16}
                    marginStart={16}
                    marginEnd={16}
                >
                    {/* Progress indicator */}
                    <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                        <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={4}>
                            <GtkLabel
                                label={`Step ${currentStep + 1} of ${steps.length}`}
                                halign={Gtk.Align.START}
                                hexpand
                                cssClasses={["dim-label"]}
                            />
                            <GtkLabel
                                label={steps[currentStep]?.title ?? ""}
                                halign={Gtk.Align.END}
                                cssClasses={["heading"]}
                            />
                        </GtkBox>
                        <GtkProgressBar fraction={progress} />
                    </GtkBox>

                    {/* Step content */}
                    <GtkStack
                        visibleChildName={steps[currentStep]?.name ?? "welcome"}
                        transitionType={Gtk.StackTransitionType.SLIDE_LEFT_RIGHT}
                    >
                        {/* Welcome Step */}
                        <StackPage name="welcome" title="Welcome">
                            <GtkBox
                                orientation={Gtk.Orientation.VERTICAL}
                                spacing={12}
                                valign={Gtk.Align.CENTER}
                                marginTop={24}
                                marginBottom={24}
                            >
                                <GtkLabel label="Welcome to the Setup Wizard" cssClasses={["title-1"]} />
                                <GtkLabel
                                    label="This wizard will guide you through the initial setup process. Click Next to begin."
                                    wrap
                                    halign={Gtk.Align.CENTER}
                                    cssClasses={["dim-label"]}
                                />
                            </GtkBox>
                        </StackPage>

                        {/* Personal Info Step */}
                        <StackPage name="personal" title="Personal Info">
                            <GtkBox
                                orientation={Gtk.Orientation.VERTICAL}
                                spacing={16}
                                marginTop={16}
                                marginBottom={16}
                            >
                                <GtkLabel
                                    label="Enter your information"
                                    cssClasses={["title-3"]}
                                    halign={Gtk.Align.START}
                                />

                                <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                                    <GtkLabel label="Name" halign={Gtk.Align.START} />
                                    <GtkEntry
                                        text={wizardData.name}
                                        onChanged={(entry: Gtk.Entry) =>
                                            setWizardData({ ...wizardData, name: entry.getText() })
                                        }
                                        placeholderText="Enter your name"
                                    />
                                </GtkBox>

                                <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                                    <GtkLabel label="Email" halign={Gtk.Align.START} />
                                    <GtkEntry
                                        text={wizardData.email}
                                        onChanged={(entry: Gtk.Entry) =>
                                            setWizardData({ ...wizardData, email: entry.getText() })
                                        }
                                        placeholderText="Enter your email"
                                        inputPurpose={Gtk.InputPurpose.EMAIL}
                                    />
                                </GtkBox>

                                {!canGoNext() && (
                                    <GtkLabel
                                        label="Please fill in all fields with valid information"
                                        halign={Gtk.Align.START}
                                        cssClasses={["dim-label", "warning"]}
                                    />
                                )}
                            </GtkBox>
                        </StackPage>

                        {/* Preferences Step */}
                        <StackPage name="preferences" title="Preferences">
                            <GtkBox
                                orientation={Gtk.Orientation.VERTICAL}
                                spacing={16}
                                marginTop={16}
                                marginBottom={16}
                            >
                                <GtkLabel
                                    label="Configure your preferences"
                                    cssClasses={["title-3"]}
                                    halign={Gtk.Align.START}
                                />

                                <GtkCheckButton
                                    label="Subscribe to newsletter"
                                    active={wizardData.newsletter}
                                    onToggled={(cb: Gtk.CheckButton) =>
                                        setWizardData({ ...wizardData, newsletter: cb.getActive() })
                                    }
                                />

                                <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                                    <GtkLabel label="Theme" halign={Gtk.Align.START} />
                                    <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={12}>
                                        <GtkCheckButton
                                            label="Light"
                                            active={wizardData.theme === "light"}
                                            onToggled={(cb: Gtk.CheckButton) => {
                                                if (cb.getActive()) setWizardData({ ...wizardData, theme: "light" });
                                            }}
                                        />
                                        <GtkCheckButton
                                            label="Dark"
                                            active={wizardData.theme === "dark"}
                                            onToggled={(cb: Gtk.CheckButton) => {
                                                if (cb.getActive()) setWizardData({ ...wizardData, theme: "dark" });
                                            }}
                                        />
                                    </GtkBox>
                                </GtkBox>
                            </GtkBox>
                        </StackPage>

                        {/* Confirm Step */}
                        <StackPage name="confirm" title="Confirm">
                            <GtkBox
                                orientation={Gtk.Orientation.VERTICAL}
                                spacing={16}
                                marginTop={16}
                                marginBottom={16}
                            >
                                <GtkLabel
                                    label="Review your settings"
                                    cssClasses={["title-3"]}
                                    halign={Gtk.Align.START}
                                />

                                <GtkFrame>
                                    <GtkBox
                                        orientation={Gtk.Orientation.VERTICAL}
                                        spacing={8}
                                        marginTop={12}
                                        marginBottom={12}
                                        marginStart={12}
                                        marginEnd={12}
                                    >
                                        <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={8}>
                                            <GtkLabel label="Name:" cssClasses={["dim-label"]} />
                                            <GtkLabel label={wizardData.name || "(not set)"} />
                                        </GtkBox>
                                        <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={8}>
                                            <GtkLabel label="Email:" cssClasses={["dim-label"]} />
                                            <GtkLabel label={wizardData.email || "(not set)"} />
                                        </GtkBox>
                                        <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={8}>
                                            <GtkLabel label="Newsletter:" cssClasses={["dim-label"]} />
                                            <GtkLabel label={wizardData.newsletter ? "Yes" : "No"} />
                                        </GtkBox>
                                        <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={8}>
                                            <GtkLabel label="Theme:" cssClasses={["dim-label"]} />
                                            <GtkLabel label={wizardData.theme === "light" ? "Light" : "Dark"} />
                                        </GtkBox>
                                    </GtkBox>
                                </GtkFrame>

                                <GtkLabel
                                    label="Click Finish to complete the setup."
                                    halign={Gtk.Align.START}
                                    cssClasses={["dim-label"]}
                                />
                            </GtkBox>
                        </StackPage>

                        {/* Complete Step */}
                        <StackPage name="complete" title="Complete">
                            <GtkBox
                                orientation={Gtk.Orientation.VERTICAL}
                                spacing={12}
                                valign={Gtk.Align.CENTER}
                                marginTop={24}
                                marginBottom={24}
                            >
                                <GtkLabel label="Setup Complete!" cssClasses={["title-1"]} />
                                <GtkLabel
                                    label="Your settings have been saved. You can now start using the application."
                                    wrap
                                    halign={Gtk.Align.CENTER}
                                    cssClasses={["dim-label"]}
                                />
                            </GtkBox>
                        </StackPage>
                    </GtkStack>

                    {/* Navigation buttons */}
                    <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={8}>
                        {isComplete ? (
                            <GtkButton
                                label="Start Over"
                                onClicked={handleReset}
                                hexpand
                                cssClasses={["suggested-action"]}
                            />
                        ) : (
                            <>
                                <GtkButton label="Back" onClicked={handleBack} sensitive={currentStep > 0} />
                                <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={0} hexpand />
                                <GtkButton
                                    label={currentStep === 3 ? "Finish" : "Next"}
                                    onClicked={handleNext}
                                    sensitive={canGoNext()}
                                    cssClasses={["suggested-action"]}
                                />
                            </>
                        )}
                    </GtkBox>
                </GtkBox>
            </GtkFrame>
        </GtkBox>
    );
};

const sourceCode = `import { useState } from "react";
import * as Gtk from "@gtkx/ffi/gtk";
import { GtkBox, GtkButton, GtkLabel, GtkStack, StackPage, GtkEntry } from "@gtkx/react";

interface WizardData {
  name: string;
  email: string;
}

const AssistantDemo = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<WizardData>({ name: "", email: "" });

  const steps = ["welcome", "info", "confirm", "complete"];

  const canGoNext = () => {
    if (currentStep === 1) {
      return data.name.length > 0 && data.email.includes("@");
    }
    return true;
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={16}>
      <GtkLabel label={\`Step \${currentStep + 1} of \${steps.length}\`} />

      <GtkStack visibleChildName={steps[currentStep]}>
        <StackPage name="welcome" title="Welcome">
          <GtkLabel label="Welcome to the wizard!" />
        </StackPage>

        <StackPage name="info" title="Info">
          <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8}>
            <GtkEntry
              text={data.name}
              onChanged={(entry: Gtk.Entry) => setData({ ...data, name: entry.getText() })}
              placeholderText="Name"
            />
            <GtkEntry
              text={data.email}
              onChanged={(entry: Gtk.Entry) => setData({ ...data, email: entry.getText() })}
              placeholderText="Email"
            />
          </GtkBox>
        </StackPage>

        <StackPage name="confirm" title="Confirm">
          <GtkLabel label={\`Name: \${data.name}, Email: \${data.email}\`} />
        </StackPage>

        <StackPage name="complete" title="Complete">
          <GtkLabel label="Setup complete!" />
        </StackPage>
      </GtkStack>

      <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={8}>
        <GtkButton label="Back" onClicked={handleBack} sensitive={currentStep > 0} />
        <GtkButton label="Next" onClicked={handleNext} sensitive={canGoNext()} />
      </GtkBox>
    </GtkBox>
  );
};`;

export const assistantDemo: Demo = {
    id: "assistant",
    title: "Assistant",
    description: "Multi-step wizard with progress tracking",
    keywords: ["assistant", "wizard", "steps", "progress", "multi-step", "form", "GtkStack", "navigation"],
    component: AssistantDemo,
    sourceCode,
};
