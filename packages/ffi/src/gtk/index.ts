import { call } from "@gtkx/native";

export const getMajorVersion = () => {
  return call("libgtk-4.so.1", "gtk_get_major_version", [], {
    type: "int",
    size: 32,
  });
};

export const getMinorVersion = () => {
  return call("libgtk-4.so.1", "gtk_get_minor_version", [], {
    type: "int",
    size: 32,
  });
};

export const getMicroVersion = () => {
  return call("libgtk-4.so.1", "gtk_get_micro_version", [], {
    type: "int",
    size: 32,
  });
};

export * from "./application-window.js";
