#!/bin/bash
set -e

cd "$(dirname "$0")/.."

echo "Building GTKX Example Snap..."

pnpm bundle

cp ../../packages/native/index.node dist/

if command -v snapcraft &> /dev/null; then
    SNAPCRAFT=(snapcraft)
else
    SNAPCRAFT=(snap run snapcraft)
fi

"${SNAPCRAFT[@]}" pack --output dist/gtkx-example.snap

echo "Snap built successfully!"
echo ""
echo "To install (devmode):"
echo "  sudo snap install --devmode dist/gtkx-example.snap"
echo ""
echo "To run:"
echo "  gtkx-example"
