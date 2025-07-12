import { call } from "@gtkx/native";

const getMajorVersion = () => {
  return call("libgtk-4.so.1", "gtk_get_major_version", [], {
    type: "int",
    size: 32,
  });
};

const getMinorVersion = () => {
  return call("libgtk-4.so.1", "gtk_get_minor_version", [], {
    type: "int",
    size: 32,
  });
};

const getMicroVersion = () => {
  return call("libgtk-4.so.1", "gtk_get_micro_version", [], {
    type: "int",
    size: 32,
  });
};

export { getMajorVersion, getMinorVersion, getMicroVersion };

export * from "./gtk/application-window.js";
