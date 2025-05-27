import { call } from "@gtkx/native";

const getMajorVersion = () => {
  return call("gtk_get_major_version", [], "u32");
};

const getMinorVersion = () => {
  return call("gtk_get_minor_version", [], "u32");
};

const getMicroVersion = () => {
  return call("gtk_get_micro_version", [], "u32");
};

export { getMajorVersion, getMinorVersion, getMicroVersion };
export * from "./gtk/application-window.js";
