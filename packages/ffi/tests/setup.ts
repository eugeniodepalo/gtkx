import { beforeAll } from "vitest";
import "../src/generated/gtk/gtk.js";
import { initRuntime } from "../src/index.js";

beforeAll(() => {
    initRuntime();
});
