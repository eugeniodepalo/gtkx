import * as Adw from "@gtkx/ffi/adw";
import * as Gtk from "@gtkx/ffi/gtk";
import { GtkApplicationWindow, GtkBox, GtkButton, GtkFrame, GtkLabel } from "@gtkx/react";
import { useRef, useState } from "react";
import type { Demo } from "../types.js";

const AboutDialogDemo = () => {
    const windowRef = useRef<Gtk.ApplicationWindow | null>(null);
    const [dialogShown, setDialogShown] = useState(false);

    const showBasicAbout = () => {
        const dialog = new Adw.AboutDialog();
        dialog.setApplicationName("My Application");
        dialog.setApplicationIcon("application-x-executable");
        dialog.setVersion("1.0.0");
        dialog.setDeveloperName("Example Developer");
        dialog.setCopyright("Copyright 2024 Example Developer");

        dialog.present(windowRef.current ?? undefined);
        setDialogShown(true);
    };

    const showFullAbout = () => {
        const dialog = new Adw.AboutDialog();

        // Basic info
        dialog.setApplicationName("GTKX Demo");
        dialog.setApplicationIcon("applications-system");
        dialog.setVersion("2.0.0");
        dialog.setDeveloperName("The GTKX Team");

        // Description
        dialog.setComments(
            "A comprehensive demonstration of GTK4 widgets and features built with GTKX - the React framework for native GTK applications.",
        );

        // Links
        dialog.setWebsite("https://github.com/example/gtkx");
        dialog.setSupportUrl("https://github.com/example/gtkx/discussions");
        dialog.setIssueUrl("https://github.com/example/gtkx/issues");

        // Credits
        dialog.setDevelopers([
            "Alice Developer <alice@example.com>",
            "Bob Programmer https://example.com/bob",
            "Charlie Coder",
        ]);

        dialog.setDesigners(["Diana Designer", "Edward Artist"]);

        dialog.setDocumenters(["Fiona Writer"]);

        dialog.setTranslatorCredits("translator-credits");

        // Legal
        dialog.setCopyright("Copyright 2024 The GTKX Team");
        dialog.setLicenseType(Gtk.License.MIT_X11);

        // Release notes
        dialog.setReleaseNotesVersion("2.0.0");
        dialog.setReleaseNotes(`
			<p>This release includes major improvements:</p>
			<ul>
				<li>New dialog demos with comprehensive examples</li>
				<li>Improved documentation and source code viewer</li>
				<li>Better keyboard navigation support</li>
			</ul>
			<p>Bug fixes and performance improvements.</p>
		`);

        // Debug info
        dialog.setDebugInfo(
            `GTKX Version: 2.0.0
GTK Version: ${Gtk.getMajorVersion()}.${Gtk.getMinorVersion()}.${Gtk.getMicroVersion()}
Platform: Linux
Node.js: ${process.version}`,
        );
        dialog.setDebugInfoFilename("gtkx-debug-info.txt");

        dialog.present(windowRef.current ?? undefined);
        setDialogShown(true);
    };

    const showMinimalAbout = () => {
        const dialog = new Adw.AboutDialog();
        dialog.setApplicationName("Minimal App");
        dialog.setVersion("0.1.0");
        dialog.present(windowRef.current ?? undefined);
        setDialogShown(true);
    };

    const showGtkAboutDialog = () => {
        // The classic GTK About Dialog (deprecated in favor of AdwAboutDialog)
        const window = new Gtk.AboutDialog();
        window.setProgramName("GTK About Dialog");
        window.setVersion("1.0.0");
        window.setComments("The classic GTK About Dialog widget.");
        window.setAuthors(["Author One", "Author Two"]);
        window.setCopyright("Copyright 2024");
        window.setLicenseType(Gtk.License.GPL_3_0);
        window.setLogoIconName("help-about");
        window.setWebsite("https://gtk.org");
        window.setWebsiteLabel("GTK Website");

        window.present();
        setDialogShown(true);
    };

    return (
        <GtkApplicationWindow ref={windowRef} visible={false}>
            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={24}>
                <GtkLabel label="About Dialog" cssClasses={["title-2"]} halign={Gtk.Align.START} />

                <GtkLabel
                    label="AdwAboutDialog displays information about the application including version, credits, license, and release notes. It's the modern replacement for GtkAboutDialog."
                    wrap
                    halign={Gtk.Align.START}
                    cssClasses={["dim-label"]}
                />

                {/* Basic About Dialog */}
                <GtkFrame label="Basic About Dialog">
                    <GtkBox
                        orientation={Gtk.Orientation.VERTICAL}
                        spacing={12}
                        marginTop={12}
                        marginBottom={12}
                        marginStart={12}
                        marginEnd={12}
                    >
                        <GtkLabel
                            label="A simple about dialog with just the essential information: app name, version, developer, and copyright."
                            halign={Gtk.Align.START}
                            cssClasses={["dim-label"]}
                            wrap
                        />
                        <GtkButton label="Show Basic About" onClicked={showBasicAbout} halign={Gtk.Align.START} />
                    </GtkBox>
                </GtkFrame>

                {/* Full Featured About Dialog */}
                <GtkFrame label="Full Featured About Dialog">
                    <GtkBox
                        orientation={Gtk.Orientation.VERTICAL}
                        spacing={12}
                        marginTop={12}
                        marginBottom={12}
                        marginStart={12}
                        marginEnd={12}
                    >
                        <GtkLabel
                            label="A complete about dialog with all features: credits (developers, designers, documenters, translators), license, release notes, links, and debug information."
                            halign={Gtk.Align.START}
                            cssClasses={["dim-label"]}
                            wrap
                        />
                        <GtkButton
                            label="Show Full About"
                            onClicked={showFullAbout}
                            halign={Gtk.Align.START}
                            cssClasses={["suggested-action"]}
                        />
                    </GtkBox>
                </GtkFrame>

                {/* Minimal About Dialog */}
                <GtkFrame label="Minimal About Dialog">
                    <GtkBox
                        orientation={Gtk.Orientation.VERTICAL}
                        spacing={12}
                        marginTop={12}
                        marginBottom={12}
                        marginStart={12}
                        marginEnd={12}
                    >
                        <GtkLabel
                            label="The absolute minimum: just an app name and version. Useful for quick prototypes."
                            halign={Gtk.Align.START}
                            cssClasses={["dim-label"]}
                            wrap
                        />
                        <GtkButton label="Show Minimal About" onClicked={showMinimalAbout} halign={Gtk.Align.START} />
                    </GtkBox>
                </GtkFrame>

                {/* Classic GTK About Dialog */}
                <GtkFrame label="Classic GTK About Dialog">
                    <GtkBox
                        orientation={Gtk.Orientation.VERTICAL}
                        spacing={12}
                        marginTop={12}
                        marginBottom={12}
                        marginStart={12}
                        marginEnd={12}
                    >
                        <GtkLabel
                            label="The classic GtkAboutDialog widget. While still available, AdwAboutDialog is recommended for modern applications."
                            halign={Gtk.Align.START}
                            cssClasses={["dim-label"]}
                            wrap
                        />
                        <GtkButton
                            label="Show GTK About Dialog"
                            onClicked={showGtkAboutDialog}
                            halign={Gtk.Align.START}
                        />
                    </GtkBox>
                </GtkFrame>

                {dialogShown && (
                    <GtkLabel
                        label="Dialog shown! Close it to continue."
                        halign={Gtk.Align.START}
                        cssClasses={["dim-label"]}
                    />
                )}
            </GtkBox>
        </GtkApplicationWindow>
    );
};

const sourceCode = `import { useRef } from "react";
import * as Gtk from "@gtkx/ffi/gtk";
import * as Adw from "@gtkx/ffi/adw";
import { GtkBox, GtkButton, GtkApplicationWindow } from "@gtkx/react";

const AboutDialogDemo = () => {
  const windowRef = useRef<Gtk.ApplicationWindow | null>(null);

  const showAbout = () => {
    const dialog = new Adw.AboutDialog();

    // Basic info
    dialog.setApplicationName("My App");
    dialog.setApplicationIcon("application-x-executable");
    dialog.setVersion("1.0.0");
    dialog.setDeveloperName("Developer Name");

    // Description and links
    dialog.setComments("A description of what the app does.");
    dialog.setWebsite("https://example.com");
    dialog.setIssueUrl("https://github.com/example/issues");

    // Credits
    dialog.setDevelopers([
      "Alice Developer <alice@example.com>",
      "Bob Programmer https://example.com/bob"
    ]);
    dialog.setDesigners(["Diana Designer"]);

    // Legal
    dialog.setCopyright("Copyright 2024");
    dialog.setLicenseType(Gtk.License.MIT_X11);

    // Release notes (supports limited HTML)
    dialog.setReleaseNotesVersion("1.0.0");
    dialog.setReleaseNotes(\`
      <p>Initial release:</p>
      <ul>
        <li>Feature one</li>
        <li>Feature two</li>
      </ul>
    \`);

    // Debug info for troubleshooting
    dialog.setDebugInfo("App Version: 1.0.0\\nGTK Version: ...");
    dialog.setDebugInfoFilename("debug-info.txt");

    // Present the dialog
    dialog.present(windowRef.current ?? undefined);
  };

  return (
    <GtkApplicationWindow ref={windowRef} visible={false}>
      <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={12}>
        <GtkButton label="About" onClicked={showAbout} />
      </GtkBox>
    </GtkApplicationWindow>
  );
};`;

export const aboutDialogDemo: Demo = {
    id: "about-dialog",
    title: "About Dialog",
    description: "Application information and credits dialog",
    keywords: [
        "about",
        "dialog",
        "credits",
        "license",
        "version",
        "info",
        "AdwAboutDialog",
        "GtkAboutDialog",
        "release notes",
    ],
    component: AboutDialogDemo,
    sourceCode,
};
