import { advancedDemos } from "./advanced/index.js";
import { adwaitaDemos } from "./adwaita/index.js";
import { buttonsDemos } from "./buttons/index.js";
import { cssDemos } from "./css/index.js";
import { dialogsDemos } from "./dialogs/index.js";
import { drawingDemos } from "./drawing/index.js";
import { gamesDemos } from "./games/index.js";
import { gesturesDemos } from "./gestures/index.js";
import { gettingStartedDemos } from "./getting-started/index.js";
import { inputDemos } from "./input/index.js";
import { layoutDemos } from "./layout/index.js";
import { listsDemos } from "./lists/index.js";
import { mediaDemos } from "./media/index.js";
import { navigationDemos } from "./navigation/index.js";
import type { Category } from "./types.js";

export const categories: Category[] = [
    {
        id: "getting-started",
        title: "Getting Started",
        icon: "starred-symbolic",
        demos: gettingStartedDemos,
    },
    {
        id: "buttons",
        title: "Buttons & Sliders",
        icon: "input-dialpad-symbolic",
        demos: buttonsDemos,
    },
    {
        id: "input",
        title: "Text Input",
        icon: "input-keyboard-symbolic",
        demos: inputDemos,
    },
    {
        id: "layout",
        title: "Layout",
        icon: "view-grid-symbolic",
        demos: layoutDemos,
    },
    {
        id: "navigation",
        title: "Navigation",
        icon: "view-paged-symbolic",
        demos: navigationDemos,
    },
    {
        id: "lists",
        title: "Lists & Selections",
        icon: "view-list-symbolic",
        demos: listsDemos,
    },
    {
        id: "dialogs",
        title: "Dialogs",
        icon: "dialog-information-symbolic",
        demos: dialogsDemos,
    },
    {
        id: "drawing",
        title: "Drawing & Images",
        icon: "applications-graphics-symbolic",
        demos: drawingDemos,
    },
    {
        id: "css",
        title: "CSS & Styling",
        icon: "preferences-desktop-appearance-symbolic",
        demos: cssDemos,
    },
    {
        id: "media",
        title: "Media & Calendar",
        icon: "applications-multimedia-symbolic",
        demos: mediaDemos,
    },
    {
        id: "advanced",
        title: "Advanced",
        icon: "applications-science-symbolic",
        demos: advancedDemos,
    },
    {
        id: "games",
        title: "Games",
        icon: "applications-games-symbolic",
        demos: gamesDemos,
    },
    {
        id: "gestures",
        title: "Gestures & Input",
        icon: "input-touchpad-symbolic",
        demos: gesturesDemos,
    },
    {
        id: "adwaita",
        title: "Adwaita",
        icon: "org.gnome.Adwaita1.Demo-symbolic",
        demos: adwaitaDemos,
    },
];
