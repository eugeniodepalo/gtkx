#!/usr/bin/env node
import { main } from "../dist/cli.js";

try {
    await main();
} catch (error) {
    console.error("[gtkx] Fatal error:", error);
    process.exit(1);
}
