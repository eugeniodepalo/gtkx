import { call } from "@gtkx/native";

export class ApplicationWindow {
  private ptr: unknown;

  constructor(app: unknown) {
    this.ptr = call(
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
      "gtk_window_set_default_size",
      [
        {
          type: { type: "gobject" },
          value: this.ptr,
        },
        {
          type: { type: "int", size: 32, unsigned: true },
          value: width,
        },
        {
          type: { type: "int", size: 32, unsigned: true },
          value: height,
        },
      ],
      { type: "void" }
    );
  }

  present() {
    call(
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
        { type: { type: "boolean" }, value: false },
      ],
      { type: "int", size: 32 }
    );
  }
}
