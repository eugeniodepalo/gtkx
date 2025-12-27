#!/bin/bash
set -e

cd "$(dirname "$0")/.."

echo "Building Single Executable Application..."

# Ensure bundle exists
if [ ! -f dist/bundle.cjs ]; then
    echo "Error: dist/bundle.cjs not found. Run 'pnpm bundle' first."
    exit 1
fi

# Generate SEA blob
echo "Generating SEA blob..."
node --experimental-sea-config sea-config.json

# Copy Node binary
echo "Copying Node binary..."
cp "$(command -v node)" dist/app

# Remove signature (macOS only)
if [[ "$OSTYPE" == "darwin"* ]]; then
    codesign --remove-signature dist/app
fi

# Inject the SEA blob
echo "Injecting SEA blob..."
npx postject dist/app NODE_SEA_BLOB dist/sea-prep.blob \
    --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2

# Copy native module
echo "Copying native module..."
cp ../../packages/native/index.node dist/

# Make executable
chmod +x dist/app

echo ""
echo "SEA build complete!"
echo "  Binary: dist/app"
echo "  Native: dist/index.node"
echo ""
echo "To run: ./dist/app"
