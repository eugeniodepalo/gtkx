type TestingModule = typeof import("@gtkx/testing");

let testingModule: TestingModule | null = null;
let testingLoadError: Error | null = null;

/**
 * Lazily imports `@gtkx/testing`, caching either the loaded module or the
 * failure.
 *
 * `@gtkx/testing` is an optional peer dependency. Calling code reaches it
 * only when handling MCP traffic, so resolving the import on demand keeps
 * the startup cost zero for apps that never connect to an MCP server.
 *
 * @throws An error explaining how to install `@gtkx/testing` if the module
 *   resolution fails.
 */
export const loadTestingModule = async (): Promise<TestingModule> => {
    if (testingModule) return testingModule;
    if (testingLoadError) throw testingLoadError;

    try {
        testingModule = await import("@gtkx/testing");
        return testingModule;
    } catch (cause) {
        testingLoadError = new Error(
            "@gtkx/testing is not installed, install it to enable MCP widget interactions: pnpm add -D @gtkx/testing",
            { cause },
        );
        throw testingLoadError;
    }
};
