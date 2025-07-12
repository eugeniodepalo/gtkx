import { call } from "@gtkx/native";

export class ApplicationWindow {
  private ptr: unknown;

  constructor(app: unknown) {
    this.ptr = call(
      "libgtk-4.so.1",
      "gtk_application_window_new",
      [
        {
          type: { type: "gobject" },
          value: app,
        },
      ],
      { type: "gobject" }
    );
  }

  setTitle(title: string) {
    call(
      "libgtk-4.so.1",
      "gtk_window_set_title",
      [
        {
          type: { type: "gobject" },
          value: this.ptr,
        },
        {
          type: { type: "string" },
          value: title,
        },
      ],
      { type: "void" }
    );
  }

  setDefaultSize(width: number, height: number) {
    call(
      "libgtk-4.so.1",
      "gtk_window_set_default_size",
      [
        {
          type: { type: "gobject" },
          value: this.ptr,
        },
        {
          type: { type: "int", size: 32, unsigned: false },
          value: width,
        },
        {
          type: { type: "int", size: 32, unsigned: false },
          value: height,
        },
      ],
      { type: "void" }
    );
  }

  present() {
    call(
      "libgtk-4.so.1",
      "gtk_window_present",
      [
        {
          type: { type: "gobject" },
          value: this.ptr,
        },
      ],
      { type: "void" }
    );
  }

  connectClose(handler: (object: unknown, signal: string) => void) {
    call(
      "libgobject-2.0.so.0",
      "g_signal_connect_closure",
      [
        {
          type: { type: "gobject" },
          value: this.ptr,
        },
        {
          type: { type: "string" },
          value: "close-request",
        },
        {
          type: { type: "callback" },
          value: handler,
        },
        {
          type: { type: "boolean" },
          value: false,
        },
      ],
      { type: "void" }
    );
  }
}
