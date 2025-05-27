import { call } from "@gtkx/native";

export class ApplicationWindow {
  private ptr: unknown;

  constructor() {
    this.ptr = call("gtk_application_window_new", [], "gobject");
  }

  setTitle(title: string) {
    call(
      "gtk_window_set_title",
      [
        {
          type: "pointer",
          value: this.ptr,
        },
        {
          type: "string",
          value: title,
        },
      ],
      "void"
    );
  }

  setDefaultSize(width: number, height: number) {
    call(
      "gtk_window_set_default_size",
      [
        {
          type: "pointer",
          value: this.ptr,
        },
        {
          type: "u32",
          value: width,
        },
        {
          type: "u32",
          value: height,
        },
      ],
      "void"
    );
  }

  present() {
    call(
      "gtk_window_present",
      [
        {
          type: "pointer",
          value: this.ptr,
        },
      ],
      "void"
    );
  }
}
