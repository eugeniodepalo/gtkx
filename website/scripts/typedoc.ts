import { execFileSync } from "node:child_process";
import { rmSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const apiDir = resolve(root, "website/api");
const optionsPath = resolve(root, "website/typedoc.json");

const packages = [
    {
        name: "react",
        entryPoints: [resolve(root, "packages/react/src/index.ts")],
        tsconfig: resolve(root, "packages/react/tsconfig.lib.json"),
        intentionallyNotExported: [
            "ReconcilerInstance",
            "AnimationBaseProps",
            "BaseListViewProps",
            "GtkColumnViewBase",
            "Container",
            "SettingTypeMap",
        ],
    },
    {
        name: "css",
        entryPoints: [resolve(root, "packages/css/src/index.ts")],
        tsconfig: resolve(root, "packages/css/tsconfig.lib.json"),
        intentionallyNotExported: ["CSSClassName"],
    },
    {
        name: "testing",
        entryPoints: [resolve(root, "packages/testing/src/index.ts")],
        tsconfig: resolve(root, "packages/testing/tsconfig.lib.json"),
        intentionallyNotExported: ["ElementOrCallback"],
    },
    {
        name: "ffi",
        entryPoints: [resolve(root, "packages/ffi/src/index.ts")],
        tsconfig: resolve(root, "packages/ffi/tsconfig.lib.json"),
        intentionallyNotExported: ["GType", "NativeObject", "ParamSpec"],
    },
];

rmSync(apiDir, { recursive: true, force: true });

for (const pkg of packages) {
    const args = [
        "typedoc",
        "--options",
        optionsPath,
        ...pkg.entryPoints.flatMap((e) => ["--entryPoints", e]),
        "--tsconfig",
        pkg.tsconfig,
        "--out",
        resolve(apiDir, pkg.name),
        ...pkg.intentionallyNotExported.flatMap((name) => ["--intentionallyNotExported", name]),
    ];

    console.log(`Generating API docs for @gtkx/${pkg.name}...`);
    execFileSync("npx", args, { cwd: root, stdio: "inherit" });
}

console.log("API docs generated.");
