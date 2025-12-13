#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DIST_DIR="$PROJECT_DIR/dist"
REPO_ROOT="$(cd "$PROJECT_DIR/../.." && pwd)"

NODE_BINARY="${NODE_BINARY:-$(command -v node)}"

echo "=== Building GTKX Flatpak SEA ==="
echo "Project: $PROJECT_DIR"
echo "Output: $DIST_DIR"
echo "Node binary: $NODE_BINARY"

if ! grep -q "NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2" "$NODE_BINARY"; then
    echo ""
    echo "ERROR: Node.js binary does not have SEA support."
    echo ""
    echo "Distribution-packaged Node.js often lacks the SEA sentinel fuse."
    echo "Download the official Node.js binary from https://nodejs.org and set NODE_BINARY:"
    echo ""
    echo "  wget https://nodejs.org/dist/v22.20.0/node-v22.20.0-linux-x64.tar.xz"
    echo "  tar -xf node-v22.20.0-linux-x64.tar.xz"
    echo "  NODE_BINARY=./node-v22.20.0-linux-x64/bin/node pnpm build:sea"
    echo ""
    exit 1
fi

mkdir -p "$DIST_DIR"

echo ""
echo "Step 1: Compiling TypeScript..."
pnpm build

echo ""
echo "Step 2: Bundling with esbuild..."
pnpm bundle

echo ""
echo "Step 3: Generating SEA blob..."
"$NODE_BINARY" --experimental-sea-config "$PROJECT_DIR/sea-config.json"

echo ""
echo "Step 4: Copying Node.js binary..."
cp "$NODE_BINARY" "$DIST_DIR/gtkx-flatpak-demo"

echo ""
echo "Step 5: Removing code signature (if present)..."
if command -v codesign &> /dev/null; then
    codesign --remove-signature "$DIST_DIR/gtkx-flatpak-demo" 2>/dev/null || true
fi

echo ""
echo "Step 6: Injecting SEA blob..."
npx postject "$DIST_DIR/gtkx-flatpak-demo" NODE_SEA_BLOB "$DIST_DIR/sea-prep.blob" \
    --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2

echo ""
echo "Step 7: Copying native module..."
NATIVE_MODULE="$REPO_ROOT/packages/native/dist/index.node"

if [ ! -f "$NATIVE_MODULE" ]; then
    echo "Native module not found at $NATIVE_MODULE"
    echo "Building native module..."
    (cd "$REPO_ROOT/packages/native" && pnpm native-build && pnpm build)
fi

cp "$NATIVE_MODULE" "$DIST_DIR/"

echo ""
echo "=== Build complete ==="
echo ""
echo "Output files:"
echo "  Executable: $DIST_DIR/gtkx-flatpak-demo"
echo "  Native:     $DIST_DIR/index.node"
echo ""
echo "To run: cd $DIST_DIR && ./gtkx-flatpak-demo"
