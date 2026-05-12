import { beforeAll } from "vitest";
import "../src/generated/gtk/application.js";
import { initRuntime } from "../src/index.js";

beforeAll(() => {
    initRuntime();
});
