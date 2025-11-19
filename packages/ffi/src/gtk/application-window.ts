import { call, Ref } from "@gtkx/native";

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
      { type: "gobject", borrowed: true }
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
      { type: "undefined" }
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
      { type: "undefined" }
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
      { type: "undefined" }
    );
  }

  connect(
    signal: string,
    handler: (...args: unknown[]) => unknown,
    after = false
  ) {
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
          value: signal,
        },
        {
          type: { type: "callback" },
          value: handler,
        },
        {
          type: { type: "boolean" },
          value: after,
        },
      ],
      { type: "undefined" }
    );
  }

  getDefaultSize(widthRef: Ref<number>, heightRef: Ref<number>) {
    call(
      "libgtk-4.so.1",
      "gtk_window_get_default_size",
      [
        {
          type: { type: "gobject" },
          value: this.ptr,
        },
        {
          type: {
            type: "ref",
            innerType: { type: "int", size: 32, unsigned: false },
          },
          value: widthRef,
        },
        {
          type: {
            type: "ref",
            innerType: { type: "int", size: 32, unsigned: false },
          },
          value: heightRef,
        },
      ],
      { type: "undefined" }
    );
  }
}
