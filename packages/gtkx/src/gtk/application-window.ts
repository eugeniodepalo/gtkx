import { call } from "@gtkx/native";

export class ApplicationWindow {
  private ptr: unknown;

  constructor(app: unknown) {
    this.ptr = call(
      "gtk_application_window_new",
      [
        {
          type: "gobject",
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
          type: "gobject",
          value: this.ptr,
        },
        {
          type: "string",
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
          type: "gobject",
          value: this.ptr,
        },
        {
          type: "int",
          size: 32,
          value: width,
          unsigned: true,
        },
        {
          type: "int",
          size: 32,
          value: height,
          unsigned: true,
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
          type: "gobject",
          value: this.ptr,
        },
      ],
      { type: "void" }
    );
  }

  connectClose(handler: (object: unknown, signal: string) => string) {
    call(
      "g_signal_connect",
      [
        {
          type: "gobject",
          value: this.ptr,
        },
        {
          type: "string",
          value: "close-request",
        },
        {
          type: "callback",
          argTypes: [
            {
              type: "gobject",
            },
            {
              type: "string",
            },
          ] as const,
          returnType: { type: "string" },
          value: handler,
        },
      ],
      { type: "void" }
    );
  }
}
