import { call } from "@gtkx/native";

export class ApplicationWindow {
  private ptr: unknown;

  constructor(app: unknown) {
    this.ptr = call(
      "gtk_application_window_new",
      [
        {
          type: "object",
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
          type: "object",
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
          type: "object",
          value: this.ptr,
        },
        {
          type: "uint",
          size: 32,
          value: width,
        },
        {
          type: "uint",
          size: 32,
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
          type: "object",
          value: this.ptr,
        },
      ],
      { type: "void" }
    );
  }
}
