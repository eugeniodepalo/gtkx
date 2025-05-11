import { call } from "@gtkx/native";

const getMajorVersion = () => {
  call("getMajorVersion", [], "number");
  return 4;
};

const getMinorVersion = () => {
  call("getMinorVersion", [], "number");
  return 10;
};

const getMicroVersion = () => {
  call("getMicroVersion", [], "number");
  return 2;
};

export { getMajorVersion, getMinorVersion, getMicroVersion };
