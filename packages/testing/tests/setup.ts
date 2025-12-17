import { teardown } from "../src/render.js";

export default async function globalSetup() {
    return async () => {
        await teardown();
    };
}
