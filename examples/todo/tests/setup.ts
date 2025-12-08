import { teardown } from "@gtkx/testing";

export default async function globalSetup() {
    return async () => {
        await teardown();
    };
}
