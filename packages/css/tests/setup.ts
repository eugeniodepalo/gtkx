import { teardown } from "./test-setup.js";

export default async function globalSetup() {
    return async () => {
        teardown();
    };
}
