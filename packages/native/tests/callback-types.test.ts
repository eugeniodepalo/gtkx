import { describe, expect, it } from "vitest";
import { call } from "../index.js";
import { GLIB_LIB, GOBJECT_LIB, GTK_LIB, setup } from "./test-setup.js";

setup();

describe("Callback Types", () => {
    it("should handle signal connection with callback", () => {
        const button = call(GTK_LIB, "gtk_button_new", [], { type: "gobject", borrowed: true });

        const handlerId = call(
            GOBJECT_LIB,
            "g_signal_connect_closure",
            [
                { type: { type: "gobject", borrowed: true }, value: button },
                { type: { type: "string" }, value: "clicked" },
                {
                    type: { type: "callback", argTypes: [{ type: "gobject", borrowed: true }] },
                    value: () => {},
                },
                { type: { type: "boolean" }, value: false },
            ],
            { type: "int", size: 64, unsigned: true },
        );
        expect(handlerId).toBeGreaterThan(0);
    });

    it("should handle callbacks that receive arguments", () => {
        const factory = call(GTK_LIB, "gtk_signal_list_item_factory_new", [], { type: "gobject", borrowed: true });

        const handlerId = call(
            GOBJECT_LIB,
            "g_signal_connect_closure",
            [
                { type: { type: "gobject", borrowed: true }, value: factory },
                { type: { type: "string" }, value: "setup" },
                {
                    type: {
                        type: "callback",
                        argTypes: [
                            { type: "gobject", borrowed: true },
                            { type: "gobject", borrowed: true },
                        ],
                    },
                    value: (_self: unknown, _listItem: unknown) => {},
                },
                { type: { type: "boolean" }, value: false },
            ],
            { type: "int", size: 64, unsigned: true },
        );
        expect(handlerId).toBeGreaterThan(0);
    });

    it("should handle callbacks with integer and float arguments", () => {
        const widget = call(GTK_LIB, "gtk_button_new", [], { type: "gobject", borrowed: true });
        const gestureClick = call(GTK_LIB, "gtk_gesture_click_new", [], { type: "gobject", borrowed: true });

        call(
            GTK_LIB,
            "gtk_widget_add_controller",
            [
                { type: { type: "gobject", borrowed: true }, value: widget },
                { type: { type: "gobject", borrowed: true }, value: gestureClick },
            ],
            { type: "undefined" },
        );

        const handlerId = call(
            GOBJECT_LIB,
            "g_signal_connect_closure",
            [
                { type: { type: "gobject", borrowed: true }, value: gestureClick },
                { type: { type: "string" }, value: "pressed" },
                {
                    type: {
                        type: "callback",
                        argTypes: [
                            { type: "gobject", borrowed: true },
                            { type: "int", size: 32 },
                            { type: "float", size: 64 },
                            { type: "float", size: 64 },
                        ],
                    },
                    value: () => {},
                },
                { type: { type: "boolean" }, value: false },
            ],
            { type: "int", size: 64, unsigned: true },
        );
        expect(handlerId).toBeGreaterThan(0);
    });

    it("should handle multiple callbacks on same object", () => {
        const button = call(GTK_LIB, "gtk_button_new", [], { type: "gobject", borrowed: true });

        const handlers: number[] = [];
        for (let i = 0; i < 5; i++) {
            const handlerId = call(
                GOBJECT_LIB,
                "g_signal_connect_closure",
                [
                    { type: { type: "gobject", borrowed: true }, value: button },
                    { type: { type: "string" }, value: "clicked" },
                    {
                        type: { type: "callback", argTypes: [{ type: "gobject", borrowed: true }] },
                        value: () => {},
                    },
                    { type: { type: "boolean" }, value: false },
                ],
                { type: "int", size: 64, unsigned: true },
            ) as number;
            handlers.push(handlerId);
        }

        expect(handlers.length).toBe(5);
        expect(new Set(handlers).size).toBe(5);
    });
});

describe("Callback Trampoline Types", () => {
    it("should handle destroy callback for cleanup", () => {
        const button = call(GTK_LIB, "gtk_button_new", [], { type: "gobject", borrowed: true });
        call(GOBJECT_LIB, "g_object_ref_sink", [{ type: { type: "gobject", borrowed: true }, value: button }], {
            type: "gobject",
            borrowed: true,
        });

        call(
            GOBJECT_LIB,
            "g_object_set_data_full",
            [
                { type: { type: "gobject", borrowed: true }, value: button },
                { type: { type: "string" }, value: "test-key" },
                { type: { type: "gobject", borrowed: true }, value: button },
                {
                    type: { type: "callback", trampoline: "destroy" },
                    value: () => {},
                },
            ],
            { type: "undefined" },
        );

        const data = call(
            GOBJECT_LIB,
            "g_object_get_data",
            [
                { type: { type: "gobject", borrowed: true }, value: button },
                { type: { type: "string" }, value: "test-key" },
            ],
            { type: "gobject", borrowed: true },
        );
        expect(data).not.toBeNull();
    });

    it("should handle sourceFunc callback with idle_add", () => {
        const sourceId = call(
            GLIB_LIB,
            "g_idle_add",
            [
                {
                    type: { type: "callback", trampoline: "sourceFunc" },
                    value: () => false,
                },
            ],
            { type: "int", size: 32, unsigned: true },
        ) as number;

        expect(sourceId).toBeGreaterThan(0);

        call(GLIB_LIB, "g_source_remove", [{ type: { type: "int", size: 32, unsigned: true }, value: sourceId }], {
            type: "boolean",
        });
    });

    it("should handle sourceFunc callback with timeout_add", () => {
        const sourceId = call(
            GLIB_LIB,
            "g_timeout_add",
            [
                { type: { type: "int", size: 32, unsigned: true }, value: 60000 },
                {
                    type: { type: "callback", trampoline: "sourceFunc" },
                    value: () => false,
                },
            ],
            { type: "int", size: 32, unsigned: true },
        ) as number;

        expect(sourceId).toBeGreaterThan(0);

        call(GLIB_LIB, "g_source_remove", [{ type: { type: "int", size: 32, unsigned: true }, value: sourceId }], {
            type: "boolean",
        });
    });

    it("should handle drawFunc callback for drawing area", () => {
        const drawingArea = call(GTK_LIB, "gtk_drawing_area_new", [], { type: "gobject", borrowed: true });
        expect(drawingArea).not.toBeNull();

        call(
            GTK_LIB,
            "gtk_drawing_area_set_draw_func",
            [
                { type: { type: "gobject", borrowed: true }, value: drawingArea },
                {
                    type: {
                        type: "callback",
                        trampoline: "drawFunc",
                        argTypes: [
                            { type: "gobject", borrowed: true },
                            { type: "boxed", innerType: "cairo_t", lib: "libcairo.so.2", borrowed: true },
                            { type: "int", size: 32 },
                            { type: "int", size: 32 },
                        ],
                    },
                    value: (_area: unknown, _cr: unknown, _width: unknown, _height: unknown) => {},
                },
            ],
            { type: "undefined" },
        );

        const visible = call(
            GTK_LIB,
            "gtk_widget_get_visible",
            [{ type: { type: "gobject", borrowed: true }, value: drawingArea }],
            {
                type: "boolean",
            },
        );
        expect(typeof visible).toBe("boolean");
    });
});

describe("Callbacks with Various Argument Types", () => {
    it("should handle callbacks receiving string value from widget", () => {
        const button = call(
            GTK_LIB,
            "gtk_button_new_with_label",
            [{ type: { type: "string" }, value: "Test Button" }],
            {
                type: "gobject",
                borrowed: true,
            },
        );

        const label = call(
            GTK_LIB,
            "gtk_button_get_label",
            [{ type: { type: "gobject", borrowed: true }, value: button }],
            {
                type: "string",
                borrowed: true,
            },
        );
        expect(label).toBe("Test Button");

        const handlerId = call(
            GOBJECT_LIB,
            "g_signal_connect_closure",
            [
                { type: { type: "gobject", borrowed: true }, value: button },
                { type: { type: "string" }, value: "clicked" },
                {
                    type: {
                        type: "callback",
                        argTypes: [{ type: "gobject", borrowed: true }],
                    },
                    value: (btn: unknown) => {
                        const btnLabel = call(
                            GTK_LIB,
                            "gtk_button_get_label",
                            [{ type: { type: "gobject", borrowed: true }, value: btn }],
                            { type: "string", borrowed: true },
                        );
                        expect(btnLabel).toBe("Test Button");
                    },
                },
                { type: { type: "boolean" }, value: false },
            ],
            { type: "int", size: 64, unsigned: true },
        );
        expect(handlerId).toBeGreaterThan(0);
    });

    it("should handle callbacks with u8 arguments", () => {
        const button = call(GTK_LIB, "gtk_button_new", [], { type: "gobject", borrowed: true });
        const gestureClick = call(GTK_LIB, "gtk_gesture_click_new", [], { type: "gobject", borrowed: true });

        call(
            GTK_LIB,
            "gtk_widget_add_controller",
            [
                { type: { type: "gobject", borrowed: true }, value: button },
                { type: { type: "gobject", borrowed: true }, value: gestureClick },
            ],
            { type: "undefined" },
        );

        const handlerId = call(
            GOBJECT_LIB,
            "g_signal_connect_closure",
            [
                { type: { type: "gobject", borrowed: true }, value: gestureClick },
                { type: { type: "string" }, value: "pressed" },
                {
                    type: {
                        type: "callback",
                        argTypes: [
                            { type: "gobject", borrowed: true },
                            { type: "int", size: 32 },
                            { type: "float", size: 64 },
                            { type: "float", size: 64 },
                        ],
                    },
                    value: (_gesture: unknown, nPress: unknown, _x: unknown, _y: unknown) => {
                        expect(typeof nPress).toBe("number");
                    },
                },
                { type: { type: "boolean" }, value: false },
            ],
            { type: "int", size: 64, unsigned: true },
        );
        expect(handlerId).toBeGreaterThan(0);
    });

    it("should handle callbacks with u64 arguments (GType)", () => {
        const factory = call(GTK_LIB, "gtk_signal_list_item_factory_new", [], { type: "gobject", borrowed: true });

        const handlerId = call(
            GOBJECT_LIB,
            "g_signal_connect_closure",
            [
                { type: { type: "gobject", borrowed: true }, value: factory },
                { type: { type: "string" }, value: "setup" },
                {
                    type: {
                        type: "callback",
                        argTypes: [
                            { type: "gobject", borrowed: true },
                            { type: "gobject", borrowed: true },
                        ],
                    },
                    value: (_factory: unknown, listItem: unknown) => {
                        const gtype = call(
                            GOBJECT_LIB,
                            "g_type_from_instance",
                            [{ type: { type: "gobject", borrowed: true }, value: listItem }],
                            { type: "int", size: 64, unsigned: true },
                        );
                        expect(gtype).toBeGreaterThan(0);
                    },
                },
                { type: { type: "boolean" }, value: false },
            ],
            { type: "int", size: 64, unsigned: true },
        );
        expect(handlerId).toBeGreaterThan(0);
    });

    it("should handle callbacks that read boolean values from widgets", () => {
        const checkButton = call(GTK_LIB, "gtk_check_button_new", [], { type: "gobject", borrowed: true });

        call(
            GTK_LIB,
            "gtk_check_button_set_active",
            [
                { type: { type: "gobject", borrowed: true }, value: checkButton },
                { type: { type: "boolean" }, value: true },
            ],
            { type: "undefined" },
        );

        const isActive = call(
            GTK_LIB,
            "gtk_check_button_get_active",
            [{ type: { type: "gobject", borrowed: true }, value: checkButton }],
            {
                type: "boolean",
            },
        );
        expect(isActive).toBe(true);

        const handlerId = call(
            GOBJECT_LIB,
            "g_signal_connect_closure",
            [
                { type: { type: "gobject", borrowed: true }, value: checkButton },
                { type: { type: "string" }, value: "toggled" },
                {
                    type: {
                        type: "callback",
                        argTypes: [{ type: "gobject", borrowed: true }],
                    },
                    value: () => {},
                },
                { type: { type: "boolean" }, value: false },
            ],
            { type: "int", size: 64, unsigned: true },
        );
        expect(handlerId).toBeGreaterThan(0);
    });
});

describe("Callbacks with Return Values", () => {
    it("should handle sourceFunc returning true to continue", () => {
        let callCount = 0;
        const sourceId = call(
            GLIB_LIB,
            "g_idle_add",
            [
                {
                    type: { type: "callback", trampoline: "sourceFunc" },
                    value: () => {
                        callCount++;
                        return callCount < 3;
                    },
                },
            ],
            { type: "int", size: 32, unsigned: true },
        ) as number;

        expect(sourceId).toBeGreaterThan(0);

        call(GLIB_LIB, "g_source_remove", [{ type: { type: "int", size: 32, unsigned: true }, value: sourceId }], {
            type: "boolean",
        });
    });

    it("should handle sourceFunc returning false to stop", () => {
        const sourceId = call(
            GLIB_LIB,
            "g_idle_add",
            [
                {
                    type: { type: "callback", trampoline: "sourceFunc" },
                    value: () => false,
                },
            ],
            { type: "int", size: 32, unsigned: true },
        ) as number;

        expect(sourceId).toBeGreaterThan(0);

        call(GLIB_LIB, "g_source_remove", [{ type: { type: "int", size: 32, unsigned: true }, value: sourceId }], {
            type: "boolean",
        });
    });
});

describe("Closure Callbacks with Return Types", () => {
    it("should register closure callback with boolean return type", () => {
        const window = call(GTK_LIB, "gtk_window_new", [], { type: "gobject", borrowed: true });

        const handlerId = call(
            GOBJECT_LIB,
            "g_signal_connect_closure",
            [
                { type: { type: "gobject", borrowed: true }, value: window },
                { type: { type: "string" }, value: "close-request" },
                {
                    type: {
                        type: "callback",
                        argTypes: [{ type: "gobject", borrowed: true }],
                        returnType: { type: "boolean" },
                    },
                    value: () => true,
                },
                { type: { type: "boolean" }, value: false },
            ],
            { type: "int", size: 64, unsigned: true },
        );
        expect(handlerId).toBeGreaterThan(0);
    });

    it("should register closure callback with integer return type", () => {
        const adjustment = call(
            GTK_LIB,
            "gtk_adjustment_new",
            [
                { type: { type: "float", size: 64 }, value: 0 },
                { type: { type: "float", size: 64 }, value: 0 },
                { type: { type: "float", size: 64 }, value: 100 },
                { type: { type: "float", size: 64 }, value: 1 },
                { type: { type: "float", size: 64 }, value: 10 },
                { type: { type: "float", size: 64 }, value: 0 },
            ],
            { type: "gobject", borrowed: true },
        );

        const handlerId = call(
            GOBJECT_LIB,
            "g_signal_connect_closure",
            [
                { type: { type: "gobject", borrowed: true }, value: adjustment },
                { type: { type: "string" }, value: "value-changed" },
                {
                    type: {
                        type: "callback",
                        argTypes: [{ type: "gobject", borrowed: true }],
                        returnType: { type: "int", size: 32 },
                    },
                    value: () => 42,
                },
                { type: { type: "boolean" }, value: false },
            ],
            { type: "int", size: 64, unsigned: true },
        );
        expect(handlerId).toBeGreaterThan(0);
    });

    it("should register multiple callbacks with return types on same signal", () => {
        const window = call(GTK_LIB, "gtk_window_new", [], { type: "gobject", borrowed: true });

        const handlerId1 = call(
            GOBJECT_LIB,
            "g_signal_connect_closure",
            [
                { type: { type: "gobject", borrowed: true }, value: window },
                { type: { type: "string" }, value: "close-request" },
                {
                    type: {
                        type: "callback",
                        argTypes: [{ type: "gobject", borrowed: true }],
                        returnType: { type: "boolean" },
                    },
                    value: () => false,
                },
                { type: { type: "boolean" }, value: false },
            ],
            { type: "int", size: 64, unsigned: true },
        );

        const handlerId2 = call(
            GOBJECT_LIB,
            "g_signal_connect_closure",
            [
                { type: { type: "gobject", borrowed: true }, value: window },
                { type: { type: "string" }, value: "close-request" },
                {
                    type: {
                        type: "callback",
                        argTypes: [{ type: "gobject", borrowed: true }],
                        returnType: { type: "boolean" },
                    },
                    value: () => true,
                },
                { type: { type: "boolean" }, value: false },
            ],
            { type: "int", size: 64, unsigned: true },
        );

        expect(handlerId1).toBeGreaterThan(0);
        expect(handlerId2).toBeGreaterThan(0);
        expect(handlerId2).not.toBe(handlerId1);
    });

    it("should invoke callback with return type via idle_add pattern", async () => {
        let callbackResult: boolean | null = null;

        const sourceId = call(
            GLIB_LIB,
            "g_idle_add",
            [
                {
                    type: { type: "callback", trampoline: "sourceFunc" },
                    value: () => {
                        callbackResult = true;
                        return false;
                    },
                },
            ],
            { type: "int", size: 32, unsigned: true },
        ) as number;

        expect(sourceId).toBeGreaterThan(0);

        const startTime = Date.now();
        while (callbackResult === null && Date.now() - startTime < 1000) {
            call(
                GLIB_LIB,
                "g_main_context_iteration",
                [
                    { type: { type: "null" }, value: null },
                    { type: { type: "boolean" }, value: false },
                ],
                { type: "boolean" },
            );
            await new Promise((resolve) => setTimeout(resolve, 10));
        }

        expect(callbackResult).toBe(true);
    });

    it("should handle callback return value affecting continuation", async () => {
        let callCount = 0;

        call(
            GLIB_LIB,
            "g_idle_add",
            [
                {
                    type: { type: "callback", trampoline: "sourceFunc" },
                    value: () => {
                        callCount++;
                        return callCount < 3;
                    },
                },
            ],
            { type: "int", size: 32, unsigned: true },
        );

        const startTime = Date.now();
        while (callCount < 3 && Date.now() - startTime < 1000) {
            call(
                GLIB_LIB,
                "g_main_context_iteration",
                [
                    { type: { type: "null" }, value: null },
                    { type: { type: "boolean" }, value: false },
                ],
                { type: "boolean" },
            );
            await new Promise((resolve) => setTimeout(resolve, 10));
        }

        expect(callCount).toBe(3);
    });
});
