import { start, stop } from "@gtkx/ffi";
import { beforeAll } from "vitest";

const APP_ID = "com.gtkx.test.css";

let isInitialized = false;

export const setup = () => {
    beforeAll(() => {
        if (!isInitialized) {
            start(APP_ID);
            isInitialized = true;
        }
    });
};

export const teardown = () => {
    if (isInitialized) {
        stop();
        isInitialized = false;
    }
};
