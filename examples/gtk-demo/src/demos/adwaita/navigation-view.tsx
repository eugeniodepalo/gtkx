import type * as Adw from "@gtkx/ffi/adw";
import * as Gtk from "@gtkx/ffi/gtk";
import type { AdwNavigationPageProps } from "@gtkx/react";
import {
    AdwHeaderBar,
    AdwNavigationPage,
    AdwNavigationView,
    AdwToolbarView,
    GtkBox,
    GtkButton,
    GtkLabel,
    GtkListBox,
    GtkListBoxRow,
    Slot,
    Toolbar,
} from "@gtkx/react";
import { useRef, useState } from "react";
import type { Demo } from "../types.js";

// AdwNavigationPage requires child prop in TypeScript types, but Slot handles it at runtime
const NavigationPage = AdwNavigationPage as unknown as React.FC<
    Omit<AdwNavigationPageProps, "child"> & { children?: React.ReactNode }
>;

const pages = [
    {
        tag: "page1",
        title: "Documents",
        icon: "folder-documents-symbolic",
        description: "Access your documents and files",
    },
    { tag: "page2", title: "Pictures", icon: "folder-pictures-symbolic", description: "Browse your photo gallery" },
    { tag: "page3", title: "Music", icon: "folder-music-symbolic", description: "Listen to your music collection" },
    { tag: "page4", title: "Videos", icon: "folder-videos-symbolic", description: "Watch your video library" },
];

const NavigationViewDemo = () => {
    const navigationViewRef = useRef<Adw.NavigationView | null>(null);
    const [currentPageTag, setCurrentPageTag] = useState<string | null>(null);

    const navigateTo = (tag: string) => {
        if (navigationViewRef.current) {
            navigationViewRef.current.pushByTag(tag);
        }
    };

    const goBack = () => {
        if (navigationViewRef.current) {
            navigationViewRef.current.pop();
        }
    };

    return (
        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={24}>
            <GtkLabel label="Navigation View" cssClasses={["title-2"]} halign={Gtk.Align.START} />

            <GtkLabel
                label="AdwNavigationView provides a stack-based navigation with automatic back button handling, swipe gestures, and animated transitions. It's ideal for drill-down navigation patterns."
                wrap
                halign={Gtk.Align.START}
                cssClasses={["dim-label"]}
            />

            {/* Navigation View */}
            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={0} cssClasses={["card"]} vexpand>
                <AdwNavigationView
                    ref={navigationViewRef}
                    onPopped={(self: Adw.NavigationView) => {
                        const page = self.getVisiblePage();
                        setCurrentPageTag(page?.getTag() ?? null);
                    }}
                    onPushed={(self: Adw.NavigationView) => {
                        const page = self.getVisiblePage();
                        setCurrentPageTag(page?.getTag() ?? null);
                    }}
                >
                    {/* Home Page */}
                    <NavigationPage tag="home" title="Home">
                        <Slot for={AdwNavigationPage} id="child">
                            <AdwToolbarView>
                                <Toolbar.Top>
                                    <AdwHeaderBar />
                                </Toolbar.Top>

                                <GtkBox
                                    orientation={Gtk.Orientation.VERTICAL}
                                    spacing={12}
                                    marginStart={12}
                                    marginEnd={12}
                                    marginTop={12}
                                    marginBottom={12}
                                >
                                    <GtkLabel
                                        label="Choose a folder to explore"
                                        cssClasses={["dim-label"]}
                                        halign={Gtk.Align.START}
                                    />
                                    <GtkListBox cssClasses={["boxed-list"]}>
                                        {pages.map((page) => (
                                            <GtkListBoxRow key={page.tag} onActivate={() => navigateTo(page.tag)}>
                                                <GtkBox
                                                    orientation={Gtk.Orientation.HORIZONTAL}
                                                    spacing={12}
                                                    marginStart={12}
                                                    marginEnd={12}
                                                    marginTop={12}
                                                    marginBottom={12}
                                                >
                                                    <GtkLabel label={page.icon} useMarkup={false} />
                                                    <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={4} hexpand>
                                                        <GtkLabel label={page.title} halign={Gtk.Align.START} />
                                                        <GtkLabel
                                                            label={page.description}
                                                            cssClasses={["dim-label", "caption"]}
                                                            halign={Gtk.Align.START}
                                                        />
                                                    </GtkBox>
                                                    <GtkLabel
                                                        label="go-next-symbolic"
                                                        cssClasses={["dim-label"]}
                                                        valign={Gtk.Align.CENTER}
                                                        useMarkup={false}
                                                    />
                                                </GtkBox>
                                            </GtkListBoxRow>
                                        ))}
                                    </GtkListBox>
                                </GtkBox>
                            </AdwToolbarView>
                        </Slot>
                    </NavigationPage>

                    {/* Detail Pages */}
                    {pages.map((page) => (
                        <NavigationPage key={page.tag} tag={page.tag} title={page.title}>
                            <Slot for={AdwNavigationPage} id="child">
                                <AdwToolbarView>
                                    <Toolbar.Top>
                                        <AdwHeaderBar />
                                    </Toolbar.Top>

                                    <GtkBox
                                        orientation={Gtk.Orientation.VERTICAL}
                                        spacing={24}
                                        marginStart={24}
                                        marginEnd={24}
                                        marginTop={48}
                                        marginBottom={48}
                                        valign={Gtk.Align.CENTER}
                                    >
                                        <GtkLabel label={page.icon} cssClasses={["title-1"]} useMarkup={false} />
                                        <GtkLabel label={page.title} cssClasses={["title-1"]} />
                                        <GtkLabel
                                            label={page.description}
                                            cssClasses={["dim-label"]}
                                            wrap
                                            halign={Gtk.Align.CENTER}
                                        />
                                        <GtkButton
                                            label="Go Back"
                                            cssClasses={["pill"]}
                                            onClicked={goBack}
                                            halign={Gtk.Align.CENTER}
                                        />
                                    </GtkBox>
                                </AdwToolbarView>
                            </Slot>
                        </NavigationPage>
                    ))}
                </AdwNavigationView>
            </GtkBox>

            {/* Current State */}
            <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={12}>
                <GtkLabel label={`Current page: ${currentPageTag ?? "home"}`} cssClasses={["dim-label"]} />
            </GtkBox>

            {/* Key Properties */}
            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                <GtkLabel label="Key Features" cssClasses={["heading"]} halign={Gtk.Align.START} />
                <GtkLabel
                    label="tag: Unique identifier for each page. pushByTag()/pop(): Programmatic navigation. Automatic back button in AdwHeaderBar. Swipe gesture support for going back. Animated page transitions."
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
import {
  AdwHeaderBar,
  AdwNavigationPage,
  AdwNavigationView,
  AdwToolbarView,
  GtkBox,
  GtkButton,
  GtkLabel,
  Slot,
  Toolbar,
} from "@gtkx/react";

const NavigationDemo = () => {
  const navRef = useRef<Adw.NavigationView | null>(null);

  const navigateTo = (tag: string) => {
    navRef.current?.pushByTag(tag);
  };

  const goBack = () => {
    navRef.current?.pop();
  };

  return (
    <AdwNavigationView ref={navRef}>
      {/* Home Page */}
      <AdwNavigationPage tag="home" title="Home">
        <Slot for={AdwNavigationPage} id="child">
          <AdwToolbarView>
            <Toolbar.Top>
              <AdwHeaderBar />
            </Toolbar.Top>
            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={12}>
              <GtkButton label="Go to Details" onClicked={() => navigateTo("details")} />
            </GtkBox>
          </AdwToolbarView>
        </Slot>
      </AdwNavigationPage>

      {/* Detail Page */}
      <AdwNavigationPage tag="details" title="Details">
        <Slot for={AdwNavigationPage} id="child">
          <AdwToolbarView>
            <Toolbar.Top>
              <AdwHeaderBar /> {/* Back button appears automatically */}
            </Toolbar.Top>
            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={12}>
              <GtkLabel label="Detail Page Content" />
              <GtkButton label="Go Back" onClicked={goBack} />
            </GtkBox>
          </AdwToolbarView>
        </Slot>
      </AdwNavigationPage>
    </AdwNavigationView>
  );
};`;

export const navigationViewDemo: Demo = {
    id: "navigation-view",
    title: "Navigation View",
    description: "Stack-based page navigation with gestures and transitions",
    keywords: [
        "navigation",
        "view",
        "stack",
        "page",
        "back",
        "swipe",
        "AdwNavigationView",
        "AdwNavigationPage",
        "libadwaita",
    ],
    component: NavigationViewDemo,
    sourceCode,
};
