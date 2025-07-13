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

export const getDebugInfoWithRef = () => {
  // Example using g_get_prgname which returns const char*; as a ref example we can use g_get_application_name? Many return values, but here we demo a boolean out via g_application_get_is_busy? Not stable.
  // Keep this as placeholder to show pattern.
  return null;
};
